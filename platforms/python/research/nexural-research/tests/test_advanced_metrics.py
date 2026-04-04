"""Tests for the advanced metrics module."""

import numpy as np
import pandas as pd
import pytest

from nexural_research.analyze.advanced_metrics import (
    ComprehensiveMetrics,
    comprehensive_analysis,
    distribution_metrics,
    expectancy_metrics,
    risk_return_metrics,
    time_decay_analysis,
    trade_dependency_analysis,
)


def _make_trades(profits: list[float], n_days: int = 5) -> pd.DataFrame:
    """Helper to create a trades DataFrame from a list of profits."""
    n = len(profits)
    base = pd.Timestamp("2025-01-01 09:30:00")
    return pd.DataFrame({
        "profit": profits,
        "entry_time": [base + pd.Timedelta(hours=i) for i in range(n)],
        "exit_time": [base + pd.Timedelta(hours=i, minutes=15) for i in range(n)],
        "instrument": "NQ",
        "strategy": "Test",
    })


class TestRiskReturnMetrics:
    def test_positive_strategy(self):
        df = _make_trades([100, 50, -30, 80, -20, 60, 40, -10, 90, 70])
        rr = risk_return_metrics(df)
        assert rr.sharpe_ratio > 0
        assert rr.sortino_ratio > 0
        assert rr.calmar_ratio > 0
        assert rr.omega_ratio > 1.0
        assert 0 <= rr.risk_of_ruin <= 1

    def test_negative_strategy(self):
        df = _make_trades([-50, -30, 10, -60, -40, 5, -70, -20, 15, -80])
        rr = risk_return_metrics(df)
        assert rr.sharpe_ratio < 0
        assert rr.risk_of_ruin > 0.5

    def test_empty_trades(self):
        df = _make_trades([])
        rr = risk_return_metrics(df)
        assert rr.sharpe_ratio == 0.0

    def test_single_trade(self):
        df = _make_trades([100.0])
        rr = risk_return_metrics(df)
        assert rr.sharpe_ratio >= 0


class TestExpectancyMetrics:
    def test_positive_edge(self):
        df = _make_trades([100, -50, 100, -50, 100, -50, 100, -50])
        exp = expectancy_metrics(df)
        assert exp.expectancy > 0
        assert exp.payoff_ratio == 2.0
        assert exp.kelly_pct > 0
        assert exp.half_kelly_pct == pytest.approx(exp.kelly_pct / 2, rel=0.01)

    def test_negative_edge(self):
        df = _make_trades([-100, 50, -100, 50, -100, 50])
        exp = expectancy_metrics(df)
        assert exp.expectancy < 0
        assert exp.kelly_pct == 0.0  # never recommend negative sizing

    def test_all_winners(self):
        df = _make_trades([100, 200, 50])
        exp = expectancy_metrics(df)
        assert exp.expectancy > 0
        assert exp.payoff_ratio == float("inf")


class TestTradeDependency:
    def test_independent_trades(self):
        rng = np.random.default_rng(42)
        profits = rng.choice([-50.0, 100.0], size=100).tolist()
        df = _make_trades(profits)
        dep = trade_dependency_analysis(df)
        assert abs(dep.z_score) < 2.576  # not highly significant
        assert dep.streak_max_wins >= 1
        assert dep.streak_max_losses >= 1

    def test_insufficient_data(self):
        df = _make_trades([100, -50, 100])
        dep = trade_dependency_analysis(df)
        assert dep.z_interpretation == "insufficient data"

    def test_streaks_counted(self):
        # Need >= 10 trades for dependency analysis to run
        df = _make_trades([100, 100, 100, -50, -50, 100, 100, -50, 100, 100])
        dep = trade_dependency_analysis(df)
        assert dep.streak_max_wins >= 2
        assert dep.streak_max_losses >= 1


class TestDistributionMetrics:
    def test_normal_like(self):
        rng = np.random.default_rng(42)
        profits = rng.normal(10, 50, 200).tolist()
        df = _make_trades(profits)
        dist = distribution_metrics(df)
        assert abs(dist.skewness) < 1.0
        assert dist.var_95 < 0  # should be negative (loss)
        assert dist.cvar_95 <= dist.var_95

    def test_percentiles_ordered(self):
        rng = np.random.default_rng(42)
        profits = rng.normal(0, 100, 100).tolist()
        df = _make_trades(profits)
        dist = distribution_metrics(df)
        assert dist.percentile_01 <= dist.percentile_05
        assert dist.percentile_05 <= dist.percentile_25
        assert dist.percentile_25 <= dist.percentile_75
        assert dist.percentile_75 <= dist.percentile_95
        assert dist.percentile_95 <= dist.percentile_99

    def test_insufficient_data(self):
        df = _make_trades([100])
        dist = distribution_metrics(df)
        assert dist.mean == 0.0  # falls back to zeros


class TestTimeDecay:
    def test_insufficient_data(self):
        df = _make_trades([100, -50, 100])
        td = time_decay_analysis(df, window_size=50)
        assert td.n_windows == 0
        assert "insufficient" in td.decay_interpretation

    def test_stable_edge(self):
        profits = [50.0] * 200
        df = _make_trades(profits)
        td = time_decay_analysis(df, window_size=20)
        assert td.n_windows > 0
        assert not td.is_decaying


class TestComprehensiveAnalysis:
    def test_returns_all_sections(self):
        df = _make_trades([100, -50, 80, -30, 60, -20, 90, -40, 70, -10])
        result = comprehensive_analysis(df)
        assert isinstance(result, ComprehensiveMetrics)
        assert result.risk_return.sharpe_ratio != 0
        assert result.expectancy.expectancy != 0
        assert result.distribution.mean != 0
