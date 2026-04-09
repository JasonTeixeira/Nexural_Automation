"""Reference value tests — verify metrics against hand-calculated known values.

These are the tests a $1M QA firm would run to verify mathematical correctness.
Each test uses a small, manually-verifiable dataset.
"""

import math
import numpy as np
import pandas as pd
import pytest

from nexural_research.analyze.advanced_metrics import (
    risk_return_metrics,
    expectancy_metrics,
    distribution_metrics,
)
from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.analyze.equity import max_drawdown, drawdown_from_equity
from nexural_research.analyze.advanced_analytics import hurst_exponent


def _make(profits):
    n = len(profits)
    base = pd.Timestamp("2025-01-01 09:30:00")
    return pd.DataFrame({
        "profit": profits,
        "entry_time": [base + pd.Timedelta(hours=i) for i in range(n)],
        "exit_time": [base + pd.Timedelta(hours=i, minutes=15) for i in range(n)],
        "instrument": "NQ", "strategy": "Test",
    })


class TestProfitFactorReference:
    def test_exact_2_to_1(self):
        """4 wins of 100, 4 losses of 50 => PF = 400/200 = 2.0"""
        df = _make([100, -50, 100, -50, 100, -50, 100, -50])
        m = metrics_from_trades(df)
        assert m.profit_factor == pytest.approx(2.0, abs=0.01)

    def test_exact_1_to_1(self):
        """Equal wins and losses => PF = 1.0"""
        df = _make([100, -100, 100, -100])
        m = metrics_from_trades(df)
        assert m.profit_factor == pytest.approx(1.0, abs=0.01)

    def test_no_losses_inf(self):
        df = _make([100, 200, 300])
        m = metrics_from_trades(df)
        assert m.profit_factor == float("inf")

    def test_no_wins_zero(self):
        df = _make([-100, -200, -300])
        m = metrics_from_trades(df)
        assert m.profit_factor == 0.0


class TestWinRateReference:
    def test_exact_50_pct(self):
        df = _make([100, -50, 100, -50, 100, -50])
        m = metrics_from_trades(df)
        assert m.win_rate == pytest.approx(0.5, abs=0.001)

    def test_exact_75_pct(self):
        df = _make([100, 100, 100, -50])
        m = metrics_from_trades(df)
        assert m.win_rate == pytest.approx(0.75, abs=0.001)

    def test_100_pct(self):
        df = _make([100, 200, 50])
        m = metrics_from_trades(df)
        assert m.win_rate == pytest.approx(1.0, abs=0.001)

    def test_0_pct(self):
        df = _make([-100, -200, -50])
        m = metrics_from_trades(df)
        assert m.win_rate == pytest.approx(0.0, abs=0.001)


class TestMaxDrawdownReference:
    def test_known_drawdown(self):
        """Equity: 100, 200, 150, 300, 100 => MDD = 100-300 = -200"""
        eq = pd.Series([100, 200, 150, 300, 100])
        assert max_drawdown(eq) == -200.0

    def test_no_drawdown(self):
        eq = pd.Series([100, 200, 300, 400])
        assert max_drawdown(eq) == 0.0

    def test_recovery_drawdown(self):
        """Peak then drop then recovery => drawdown at the drop."""
        eq = pd.Series([100, 200, 100, 300])
        mdd = max_drawdown(eq)
        assert mdd == -100.0  # 100 - 200 peak = -100

    def test_drawdown_series(self):
        eq = pd.Series([100, 200, 150, 300])
        dd = drawdown_from_equity(eq)
        assert dd.iloc[0] == 0.0
        assert dd.iloc[1] == 0.0
        assert dd.iloc[2] == -50.0  # 150 - 200 peak
        assert dd.iloc[3] == 0.0  # new peak


class TestKellyReference:
    def test_50pct_win_2to1_payoff(self):
        """50% win rate, 2:1 payoff => Kelly = 0.5 - 0.5/2 = 0.25 (25%)"""
        df = _make([100, -50, 100, -50, 100, -50, 100, -50, 100, -50])
        exp = expectancy_metrics(df)
        assert exp.kelly_pct == pytest.approx(25.0, abs=2.0)

    def test_60pct_win_1to1_payoff(self):
        """60% win, 1:1 => Kelly = 0.6 - 0.4/1 = 0.2 (20%)"""
        df = _make([100, 100, 100, -100, -100, 100, 100, 100, -100, -100])
        exp = expectancy_metrics(df)
        assert exp.kelly_pct == pytest.approx(20.0, abs=3.0)

    def test_losing_strategy_zero_kelly(self):
        df = _make([-100, 50, -100, 50, -100, 50])
        exp = expectancy_metrics(df)
        assert exp.kelly_pct == 0.0


class TestExpectancyReference:
    def test_exact_expectancy(self):
        """Mean of [100, -50, 100, -50] = 25"""
        df = _make([100, -50, 100, -50])
        exp = expectancy_metrics(df)
        assert exp.expectancy == pytest.approx(25.0, abs=0.01)

    def test_payoff_ratio(self):
        """Avg win=100, avg loss=50 => payoff = 2.0"""
        df = _make([100, -50, 100, -50])
        exp = expectancy_metrics(df)
        assert exp.payoff_ratio == pytest.approx(2.0, abs=0.01)


class TestVaRReference:
    def test_var_on_known_distribution(self):
        """For uniform distribution -100 to +100, 5th percentile should be near -90"""
        profits = list(np.linspace(-100, 100, 201))
        df = _make(profits)
        dist = distribution_metrics(df)
        assert dist.var_95 == pytest.approx(-90.0, abs=2.0)

    def test_cvar_worse_than_var(self):
        """CVaR (expected shortfall) should always be <= VaR"""
        rng = np.random.default_rng(42)
        profits = rng.normal(0, 100, 500).tolist()
        df = _make(profits)
        dist = distribution_metrics(df)
        assert dist.cvar_95 <= dist.var_95


class TestSortinoDifferentFromSharpe:
    def test_right_skewed_sortino_higher(self):
        """For right-skewed returns, Sortino should generally differ from Sharpe."""
        profits = [10] * 80 + [200] * 10 + [-50] * 10  # right-skewed
        df = _make(profits)
        rr = risk_return_metrics(df)
        # Both should be positive for a profitable strategy
        assert rr.sharpe_ratio > 0
        assert rr.sortino_ratio > 0
        # Sortino and Sharpe should be different (different denominators)
        assert rr.sortino_ratio != rr.sharpe_ratio


class TestHurstBounds:
    def test_always_between_0_and_1(self):
        """Hurst exponent must be in [0, 1]."""
        for seed in range(10):
            rng = np.random.default_rng(seed)
            profits = rng.normal(0, 100, 100).tolist()
            df = _make(profits)
            h = hurst_exponent(df)
            assert 0.0 <= h.hurst_exponent <= 1.0, f"Hurst {h.hurst_exponent} out of bounds (seed={seed})"


class TestEquityCurveCumsum:
    def test_equity_equals_cumsum(self):
        """Equity curve final value must equal sum of PnL."""
        profits = [100, -50, 200, -30, 150]
        df = _make(profits)
        from nexural_research.analyze.equity import equity_curve_from_trades
        eq = equity_curve_from_trades(df)
        assert float(eq.equity.iloc[-1]) == pytest.approx(sum(profits), abs=0.01)

    def test_each_point_is_cumsum(self):
        profits = [10, 20, -5, 15, -10]
        df = _make(profits)
        from nexural_research.analyze.equity import equity_curve_from_trades
        eq = equity_curve_from_trades(df)
        cumsum = np.cumsum(profits)
        for i in range(len(profits)):
            assert float(eq.equity.iloc[i]) == pytest.approx(cumsum[i], abs=0.01)
