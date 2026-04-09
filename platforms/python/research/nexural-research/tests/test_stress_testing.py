"""Tests for stress testing module: tail amplification, historical stress, parameter sensitivity."""

import numpy as np
import pandas as pd
import pytest

from nexural_research.analyze.stress_testing import (
    historical_stress_scenarios,
    parameter_sensitivity,
    tail_amplification_stress_test,
)


def _make_trades(profits: list[float]) -> pd.DataFrame:
    n = len(profits)
    base = pd.Timestamp("2025-01-01 09:30:00")
    return pd.DataFrame({
        "profit": profits,
        "entry_time": [base + pd.Timedelta(hours=i) for i in range(n)],
        "exit_time": [base + pd.Timedelta(hours=i, minutes=15) for i in range(n)],
        "instrument": "NQ",
        "strategy": "Test",
    })


# ===================================================================
# Tail Amplification
# ===================================================================

class TestTailAmplification:
    def test_amplification_worsens_results(self):
        """Amplifying losses should always make net profit worse."""
        profits = [100, -50, 200, -100, 150, -75, 300, -125, 180, -60]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(df)
        assert result.original_net > 0
        # Every scenario with multiplier > 1 should have worse net than original
        for s in result.scenarios:
            if s.multiplier > 1.0:
                assert s.adjusted_net <= result.original_net

    def test_multiplier_1_preserves_original(self):
        """Multiplier of 1.0 should produce same results as original."""
        profits = [100, -50, 200, -100, 150]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(
            df, tail_percentiles=[10.0], multipliers=[1.0],
        )
        assert len(result.scenarios) == 1
        assert result.scenarios[0].adjusted_net == pytest.approx(result.original_net, abs=0.1)

    def test_scenarios_count(self):
        """Should produce len(tail_percentiles) * len(multipliers) scenarios."""
        profits = [100, -50, 200, -100, 150, -75, 300, -125, 180, -60]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(
            df, tail_percentiles=[5.0, 10.0], multipliers=[1.5, 2.0, 3.0],
        )
        assert len(result.scenarios) == 6

    def test_losing_strategy_breaks_faster(self):
        """A barely profitable strategy should break with mild amplification."""
        profits = [10, -8, 12, -9, 11, -10, 8, -7, 13, -11]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(df)
        # At least some scenarios should not be profitable
        unprofitable = [s for s in result.scenarios if not s.still_profitable]
        assert len(unprofitable) > 0

    def test_all_winners_survives_everything(self):
        """All-win strategy should survive all tail stress (no losses to amplify)."""
        profits = [100, 200, 50, 150, 300]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(df)
        for s in result.scenarios:
            assert s.still_profitable

    def test_empty_data(self):
        df = _make_trades([])
        result = tail_amplification_stress_test(df)
        assert len(result.scenarios) == 0

    def test_mdd_worsens_with_amplification(self):
        """Max drawdown should get worse (more negative) with amplification."""
        profits = [100, -50, 200, -100, 150, -75, 300, -125, 180, -60]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(df)
        for s in result.scenarios:
            if s.multiplier > 1.0:
                assert s.adjusted_mdd <= result.original_mdd  # more negative

    def test_interpretation_exists(self):
        profits = [100, -50, 200, -100, 150]
        df = _make_trades(profits)
        result = tail_amplification_stress_test(df)
        assert len(result.interpretation) > 10


# ===================================================================
# Historical Stress
# ===================================================================

class TestHistoricalStress:
    def test_finds_worst_window(self):
        """Should identify the actual worst stretch."""
        # Worst 5-trade stretch is indices 5-9: sum = -375
        profits = [100, 100, 100, 100, 100, -100, -75, -50, -100, -50, 100, 100]
        df = _make_trades(profits)
        result = historical_stress_scenarios(df, window_sizes=[5], top_n=1)
        assert len(result.worst_windows) == 1
        worst = result.worst_windows[0]
        assert worst.total_pnl < 0
        assert worst.n_trades == 5

    def test_multiple_window_sizes(self):
        profits = list(np.random.default_rng(42).normal(5, 100, 100))
        df = _make_trades(profits)
        result = historical_stress_scenarios(df, window_sizes=[5, 10, 20])
        assert len(result.worst_windows) >= 3

    def test_worst_single_trade(self):
        profits = [100, -500, 200, -50, 150]
        df = _make_trades(profits)
        result = historical_stress_scenarios(df)
        assert result.worst_single_trade == -500.0

    def test_insufficient_data(self):
        df = _make_trades([100])
        result = historical_stress_scenarios(df)
        assert len(result.worst_windows) == 0

    def test_all_positive_trades(self):
        """Even all-positive should find the 'worst' window (lowest sum)."""
        profits = [100, 200, 50, 150, 300, 80, 120, 90, 250, 180]
        df = _make_trades(profits)
        result = historical_stress_scenarios(df, window_sizes=[5])
        assert len(result.worst_windows) == 1
        assert result.worst_windows[0].total_pnl > 0  # worst is still positive

    def test_timestamps_populated(self):
        profits = list(np.random.default_rng(42).normal(0, 100, 50))
        df = _make_trades(profits)
        result = historical_stress_scenarios(df, window_sizes=[10])
        if result.worst_windows:
            assert result.worst_windows[0].start_time != ""


# ===================================================================
# Parameter Sensitivity
# ===================================================================

class TestParameterSensitivity:
    def test_grid_size(self):
        """Grid should be size_steps × stop_steps."""
        profits = list(np.random.default_rng(42).normal(10, 80, 50))
        df = _make_trades(profits)
        result = parameter_sensitivity(df, size_steps=5, stop_steps=4)
        assert result.n_points == 20

    def test_baseline_matches_original(self):
        """The 1.0x/1.0x point should match original metrics."""
        profits = [100, -50, 200, -100, 150, -75, 300, -125, 180, -60]
        df = _make_trades(profits)
        result = parameter_sensitivity(
            df, size_range=(1.0, 1.0), stop_range=(1.0, 1.0),
            size_steps=1, stop_steps=1,
        )
        assert len(result.grid) == 1
        point = result.grid[0]
        assert point.net_profit == pytest.approx(result.baseline_net, abs=1.0)

    def test_robustness_score_bounded(self):
        """Robustness score should be 0-100."""
        profits = list(np.random.default_rng(42).normal(10, 50, 50))
        df = _make_trades(profits)
        result = parameter_sensitivity(df, size_steps=5, stop_steps=5)
        assert 0.0 <= result.robustness_score <= 100.0

    def test_strong_strategy_high_robustness(self):
        """Very profitable strategy should have high robustness."""
        profits = [100, -10, 150, -5, 200, -15, 180, -8, 120, -12] * 5
        df = _make_trades(profits)
        result = parameter_sensitivity(df, size_steps=5, stop_steps=5)
        assert result.robustness_score >= 50.0

    def test_losing_strategy_low_robustness(self):
        """Losing strategy should have low robustness."""
        profits = [-100, 10, -150, 5, -200, 15, -180, 8, -120, 12] * 5
        df = _make_trades(profits)
        result = parameter_sensitivity(df, size_steps=5, stop_steps=5)
        assert result.robustness_score <= 50.0

    def test_insufficient_data(self):
        df = _make_trades([100, -50])
        result = parameter_sensitivity(df)
        assert result.n_points == 0

    def test_larger_size_amplifies_net(self):
        """Doubling position size should roughly double net profit."""
        profits = [100, -50, 200, -100, 150, -75, 300, -125, 180, -60]
        df = _make_trades(profits)
        result = parameter_sensitivity(
            df, size_range=(1.0, 2.0), stop_range=(1.0, 1.0),
            size_steps=2, stop_steps=1,
        )
        assert len(result.grid) == 2
        net_1x = result.grid[0].net_profit
        net_2x = result.grid[1].net_profit
        assert abs(net_2x - 2 * net_1x) < abs(net_1x) * 0.1  # within 10%

    def test_optimal_size_positive(self):
        profits = list(np.random.default_rng(42).normal(15, 60, 50))
        df = _make_trades(profits)
        result = parameter_sensitivity(df)
        assert result.optimal_size_mult > 0

    def test_interpretation_exists(self):
        profits = list(np.random.default_rng(42).normal(10, 80, 50))
        df = _make_trades(profits)
        result = parameter_sensitivity(df)
        assert len(result.interpretation) > 10
        assert "robust" in result.interpretation.lower() or "fragile" in result.interpretation.lower()
