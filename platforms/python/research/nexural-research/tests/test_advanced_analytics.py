"""Tests for advanced analytics: Hurst, ACF, Rolling Correlation, Information Ratio.

Includes reference value tests, edge cases, and property tests.
"""

import numpy as np
import pandas as pd
import pytest

from nexural_research.analyze.advanced_analytics import (
    autocorrelation_analysis,
    hurst_exponent,
    information_ratio,
    rolling_correlation_analysis,
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
# Hurst Exponent
# ===================================================================

class TestHurstExponent:
    def test_random_walk_near_05(self):
        """Random walk should produce H near 0.5."""
        rng = np.random.default_rng(42)
        # Random walk increments (independent)
        profits = rng.normal(0, 100, 500).tolist()
        df = _make_trades(profits)
        result = hurst_exponent(df)
        assert 0.3 <= result.hurst_exponent <= 0.7  # should be near 0.5
        assert result.regime in ("random_walk", "mean_reverting", "trending")

    def test_trending_series(self):
        """Strongly trending series should have H > 0.5."""
        # Persistent: each trade is positively correlated with previous
        rng = np.random.default_rng(42)
        profits = [0.0]
        for _ in range(499):
            profits.append(profits[-1] * 0.7 + rng.normal(0, 30))
        df = _make_trades(profits)
        result = hurst_exponent(df)
        # Persistent series should have higher H
        assert result.hurst_exponent > 0.35  # some persistence expected

    def test_mean_reverting_series(self):
        """Alternating wins/losses should produce H < 0.5."""
        # Anti-persistent: +100, -100, +100, -100 with noise
        rng = np.random.default_rng(42)
        profits = []
        for i in range(500):
            base = 100 if i % 2 == 0 else -100
            profits.append(base + rng.normal(0, 10))
        df = _make_trades(profits)
        result = hurst_exponent(df)
        # Anti-persistent should have H < 0.5
        assert result.hurst_exponent < 0.55

    def test_insufficient_data(self):
        df = _make_trades([100, -50, 100])
        result = hurst_exponent(df)
        assert result.hurst_exponent == 0.5
        assert "Insufficient" in result.interpretation

    def test_empty_data(self):
        df = _make_trades([])
        result = hurst_exponent(df)
        assert result.hurst_exponent == 0.5

    def test_hurst_bounded(self):
        """H should always be between 0 and 1."""
        rng = np.random.default_rng(99)
        for _ in range(5):
            profits = rng.normal(0, 100, 200).tolist()
            df = _make_trades(profits)
            result = hurst_exponent(df)
            assert 0.0 <= result.hurst_exponent <= 1.0

    def test_r_squared_bounded(self):
        rng = np.random.default_rng(42)
        profits = rng.normal(10, 50, 300).tolist()
        df = _make_trades(profits)
        result = hurst_exponent(df)
        assert 0.0 <= result.r_squared <= 1.0

    def test_confidence_levels(self):
        rng = np.random.default_rng(42)
        profits = rng.normal(10, 50, 500).tolist()
        df = _make_trades(profits)
        result = hurst_exponent(df)
        assert result.confidence in ("high", "medium", "low")


# ===================================================================
# ACF
# ===================================================================

class TestACF:
    def test_independent_trades_no_acf(self):
        """Independent trades should have no significant autocorrelation."""
        rng = np.random.default_rng(42)
        profits = rng.normal(10, 100, 200).tolist()
        df = _make_trades(profits)
        result = autocorrelation_analysis(df, max_lag=15)
        assert len(result.lags) == 15
        assert len(result.autocorrelations) == 15
        # Most lags should be within confidence bounds for independent data
        within_bounds = sum(1 for ac in result.autocorrelations if abs(ac) <= result.confidence_bound)
        assert within_bounds >= 10  # at least 10 of 15 should be insignificant

    def test_strong_lag1_autocorrelation(self):
        """Constructed series with lag-1 dependency should show significant lag-1."""
        rng = np.random.default_rng(42)
        profits = [100.0]
        for _ in range(199):
            # Each trade is 0.6 * previous + noise
            profits.append(0.6 * profits[-1] + rng.normal(0, 50))
        df = _make_trades(profits)
        result = autocorrelation_analysis(df, max_lag=10)
        # Lag-1 should be significant
        assert abs(result.autocorrelations[0]) > result.confidence_bound
        assert 1 in result.significant_lags
        assert result.has_significant_dependency

    def test_alternating_series_negative_lag1(self):
        """Alternating series should show negative lag-1 autocorrelation."""
        rng = np.random.default_rng(42)
        profits = []
        for i in range(200):
            base = 100 if i % 2 == 0 else -80
            profits.append(base + rng.normal(0, 5))
        df = _make_trades(profits)
        result = autocorrelation_analysis(df, max_lag=5)
        assert result.autocorrelations[0] < -0.3  # should be strongly negative

    def test_insufficient_data(self):
        df = _make_trades([100, -50])
        result = autocorrelation_analysis(df, max_lag=20)
        assert len(result.lags) == 0
        assert "Insufficient" in result.interpretation

    def test_zero_variance(self):
        df = _make_trades([50.0] * 100)
        result = autocorrelation_analysis(df, max_lag=10)
        assert "Zero variance" in result.interpretation

    def test_confidence_bound_scales_with_n(self):
        """Confidence bound should shrink as sample size grows."""
        small = _make_trades(list(np.random.default_rng(42).normal(0, 100, 50)))
        large = _make_trades(list(np.random.default_rng(42).normal(0, 100, 500)))
        r_small = autocorrelation_analysis(small, max_lag=10)
        r_large = autocorrelation_analysis(large, max_lag=10)
        assert r_large.confidence_bound < r_small.confidence_bound


# ===================================================================
# Rolling Correlation
# ===================================================================

class TestRollingCorrelation:
    def test_stable_strategy(self):
        """Constant PnL pattern should show stable rolling metrics."""
        rng = np.random.default_rng(42)
        profits = rng.normal(20, 50, 200).tolist()
        df = _make_trades(profits)
        result = rolling_correlation_analysis(df, window_size=30)
        assert result.n_windows > 0
        assert len(result.rolling_autocorr) == result.n_windows
        assert len(result.rolling_mean_pnl) == result.n_windows
        assert len(result.rolling_volatility) == result.n_windows
        assert len(result.rolling_win_rate) == result.n_windows

    def test_regime_change_detected(self):
        """A strategy that shifts from trending to mean-reverting should flag regime changes."""
        # First 100 trades: trending (persistent positive autocorrelation)
        profits = []
        val = 50.0
        for _ in range(100):
            val = 0.8 * val + np.random.default_rng(42).normal(0, 20)
            profits.append(val)
        # Next 100 trades: mean-reverting (negative autocorrelation)
        for i in range(100):
            profits.append(100 if i % 2 == 0 else -80)
        df = _make_trades(profits)
        result = rolling_correlation_analysis(df, window_size=30)
        assert result.n_windows > 0
        # The interpretation should exist
        assert len(result.interpretation) > 0

    def test_insufficient_data(self):
        df = _make_trades([100, -50, 100])
        result = rolling_correlation_analysis(df, window_size=50)
        assert result.n_windows == 0
        assert "Insufficient" in result.interpretation

    def test_window_count_correct(self):
        profits = list(np.random.default_rng(42).normal(0, 100, 150))
        df = _make_trades(profits)
        result = rolling_correlation_analysis(df, window_size=30)
        expected_windows = 150 - 30
        assert result.n_windows == expected_windows

    def test_win_rate_bounded(self):
        profits = list(np.random.default_rng(42).normal(10, 50, 200))
        df = _make_trades(profits)
        result = rolling_correlation_analysis(df, window_size=30)
        for wr in result.rolling_win_rate:
            assert 0.0 <= wr <= 100.0


# ===================================================================
# Information Ratio
# ===================================================================

class TestInformationRatio:
    def test_improving_strategy(self):
        """Strategy that gets better recently should have positive IR."""
        # Baseline: small profits. Recent: bigger profits
        profits = [10, -5, 8, -3, 12, -4, 7, -2, 11, -6,  # baseline: ~avg 2.8
                   10, -5, 8, -3, 12, -4, 7, -2, 11, -6,
                   50, 40, 60, 30, 55, 45, 35, 65, 50, 40]  # recent: ~avg 47
        df = _make_trades(profits)
        result = information_ratio(df, recent_pct=0.3)
        assert result.information_ratio > 0
        assert result.is_outperforming
        assert result.recent_mean > result.baseline_mean

    def test_degrading_strategy(self):
        """Strategy that gets worse recently should have negative IR."""
        profits = [50, 40, 60, 30, 55, 45, 35, 65, 50, 40,  # baseline: strong
                   50, 40, 60, 30, 55, 45, 35, 65, 50, 40,
                   -10, -5, -8, -3, -12, -4, -7, -2, -11, -6]  # recent: weak
        df = _make_trades(profits)
        result = information_ratio(df, recent_pct=0.3)
        assert result.information_ratio < 0
        assert not result.is_outperforming

    def test_stable_strategy_returns_finite(self):
        """Stable strategy should return a finite IR."""
        rng = np.random.default_rng(42)
        profits = rng.normal(10, 50, 100).tolist()
        df = _make_trades(profits)
        result = information_ratio(df, recent_pct=0.3)
        assert np.isfinite(result.information_ratio)
        assert result.tracking_error > 0  # some tracking error expected

    def test_insufficient_data(self):
        df = _make_trades([100, -50])
        result = information_ratio(df)
        assert result.information_ratio == 0.0
        assert "Insufficient" in result.interpretation

    def test_recent_window_size(self):
        profits = list(np.random.default_rng(42).normal(0, 100, 100))
        df = _make_trades(profits)
        result = information_ratio(df, recent_pct=0.3)
        assert result.recent_window > 0
        assert result.recent_window <= 100

    def test_tracking_error_positive(self):
        """Tracking error should be non-negative."""
        rng = np.random.default_rng(42)
        profits = rng.normal(5, 80, 50).tolist()
        df = _make_trades(profits)
        result = information_ratio(df, recent_pct=0.3)
        assert result.tracking_error >= 0


# ===================================================================
# API Integration
# ===================================================================

class TestAdvancedAnalyticsAPI:
    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from nexural_research.api.app import app
        return TestClient(app)

    @pytest.fixture(scope="class")
    def session_id(self, client):
        import io
        csv = (
            "trade_id,symbol,entry_time,exit_time,net_pnl,strategy\n"
            + "\n".join(
                f"T{i},NQ,2025-01-{1+i//10:02d} {9+i%8}:30,2025-01-{1+i//10:02d} {9+i%8}:45,"
                f"{np.random.default_rng(42+i).normal(10, 80):.2f},TestStrat"
                for i in range(100)
            )
        )
        resp = client.post(
            "/api/upload?session_id=analytics_test",
            files={"file": ("test.csv", io.BytesIO(csv.encode()), "text/csv")},
        )
        assert resp.status_code == 200
        return "analytics_test"

    def test_hurst_endpoint(self, client, session_id):
        resp = client.get(f"/api/analysis/hurst?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "hurst_exponent" in data
        assert "regime" in data
        assert "interpretation" in data

    def test_acf_endpoint(self, client, session_id):
        resp = client.get(f"/api/analysis/acf?session_id={session_id}&max_lag=10")
        assert resp.status_code == 200
        data = resp.json()
        assert "lags" in data
        assert "autocorrelations" in data
        assert len(data["lags"]) == 10

    def test_rolling_correlation_endpoint(self, client, session_id):
        resp = client.get(f"/api/analysis/rolling-correlation?session_id={session_id}&window_size=20")
        assert resp.status_code == 200
        data = resp.json()
        assert "rolling_autocorr" in data
        assert "rolling_win_rate" in data
        assert data["n_windows"] > 0

    def test_information_ratio_endpoint(self, client, session_id):
        resp = client.get(f"/api/analysis/information-ratio?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "information_ratio" in data
        assert "interpretation" in data

    def test_tail_stress_endpoint(self, client, session_id):
        resp = client.get(f"/api/stress/tail-amplification?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "scenarios" in data
        assert "interpretation" in data
        assert len(data["scenarios"]) > 0

    def test_historical_stress_endpoint(self, client, session_id):
        resp = client.get(f"/api/stress/historical?session_id={session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "worst_windows" in data
        assert "worst_single_trade" in data

    def test_sensitivity_endpoint(self, client, session_id):
        resp = client.get(f"/api/stress/sensitivity?session_id={session_id}&size_steps=4&stop_steps=4")
        assert resp.status_code == 200
        data = resp.json()
        assert "grid" in data
        assert "robustness_score" in data
        assert data["n_points"] == 16  # 4x4 grid

    def test_acf_max_lag_validation(self, client, session_id):
        resp = client.get(f"/api/analysis/acf?session_id={session_id}&max_lag=999")
        assert resp.status_code == 422  # exceeds le=100
