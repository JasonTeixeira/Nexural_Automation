"""Reference tests for bias-safe validation and time-aware annualization."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from nexural_research.analyze.advanced_metrics import risk_return_metrics
from nexural_research.analyze.advanced_robustness import (
    block_bootstrap_monte_carlo,
    deflated_sharpe_ratio,
    rolling_walk_forward,
    walk_forward_validate,
)
from nexural_research.analyze.annualization import periodic_pnl


def _daily_trades(daily_pnl: np.ndarray, trades_per_day: int) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    start = pd.Timestamp("2024-01-02")
    for day_number, pnl in enumerate(daily_pnl):
        day = start + pd.offsets.BDay(day_number)
        for trade_number in range(trades_per_day):
            rows.append(
                {
                    "exit_time": day + pd.Timedelta(hours=10 + trade_number),
                    "profit": float(pnl / trades_per_day),
                }
            )
    return pd.DataFrame(rows)


class TestTimeAwareAnnualization:
    def test_sharpe_is_invariant_to_trade_splitting_within_a_day(self):
        rng = np.random.default_rng(11)
        daily_pnl = rng.normal(25.0, 100.0, 180)

        one_trade = risk_return_metrics(_daily_trades(daily_pnl, 1))
        four_trades = risk_return_metrics(_daily_trades(daily_pnl, 4))

        assert four_trades.sharpe_ratio == pytest.approx(one_trade.sharpe_ratio, abs=1e-4)
        assert four_trades.sortino_ratio == pytest.approx(one_trade.sortino_ratio, abs=1e-4)

    def test_untimestamped_observations_require_explicit_annualization(self):
        pnl = np.array([1.0, -0.5, 0.75, -0.25, 1.25, -0.75])
        frame = pd.DataFrame({"profit": pnl})

        unannualized = risk_return_metrics(frame)
        monthly = risk_return_metrics(frame, periods_per_year=12.0)

        expected = pnl.mean() / pnl.std(ddof=1)
        assert unannualized.sharpe_ratio == pytest.approx(expected, abs=1e-4)
        assert monthly.sharpe_ratio == pytest.approx(expected * np.sqrt(12.0), abs=1e-4)

    def test_deflated_sharpe_is_invariant_to_intraday_trade_count(self):
        rng = np.random.default_rng(29)
        daily_pnl = rng.normal(18.0, 80.0, 250)

        one_trade = deflated_sharpe_ratio(_daily_trades(daily_pnl, 1), n_trials=10)
        five_trades = deflated_sharpe_ratio(_daily_trades(daily_pnl, 5), n_trials=10)

        assert five_trades.observed_sharpe == pytest.approx(one_trade.observed_sharpe, abs=1e-4)
        assert five_trades.p_value == pytest.approx(one_trade.p_value, abs=1e-6)

    def test_constant_process_does_not_create_an_infinite_dsr(self):
        result = deflated_sharpe_ratio(_daily_trades(np.ones(40), 1), n_trials=10)
        assert result.observed_sharpe == 0.0
        assert result.p_value == 1.0
        assert result.is_significant is False

    def test_zero_mean_stationary_process_has_no_systematic_sharpe(self):
        rng = np.random.default_rng(7)
        frame = _daily_trades(rng.normal(0.0, 1.0, 4000), 3)
        result = risk_return_metrics(frame)
        assert abs(result.sharpe_ratio) < 0.5

    def test_partial_invalid_timestamps_fail_instead_of_dropping_pnl(self):
        frame = pd.DataFrame({"exit_time": ["2025-01-02", "not-a-date"], "profit": [10.0, -500.0]})
        with pytest.raises(ValueError, match="silently discard"):
            periodic_pnl(frame)

    def test_calendar_complete_sampling_includes_zero_pnl_business_days(self):
        frame = pd.DataFrame({"exit_time": ["2025-01-02", "2025-01-06"], "profit": [10.0, -4.0]})
        result = periodic_pnl(frame)
        assert result.basis == "calendar_complete_trading_day_pnl"
        assert result.values.tolist() == [10.0, 0.0, -4.0]

    def test_single_day_history_is_unannualized_but_still_descriptive(self):
        frame = pd.DataFrame(
            {
                "exit_time": ["2025-01-02 10:00", "2025-01-02 11:00"],
                "profit": [10.0, -4.0],
            }
        )
        result = periodic_pnl(frame)
        assert result.basis == "insufficient_daily_history"
        assert result.periods_per_year == 1.0
        assert result.values.tolist() == [10.0, -4.0]

    def test_fill_splitting_cannot_manufacture_dsr_or_bootstrap_confidence(self):
        fills = pd.DataFrame(
            {
                "exit_time": pd.date_range("2025-01-02 09:30", periods=500, freq="s"),
                "profit": np.tile([1.0, -0.5], 250),
            }
        )
        dsr = deflated_sharpe_ratio(fills, n_trials=5)
        bootstrap = block_bootstrap_monte_carlo(fills, n_simulations=50)

        assert dsr.observed_sharpe == 0.0
        assert dsr.p_value == 1.0
        assert dsr.is_significant is False
        assert "insufficient regularly sampled history" in dsr.interpretation
        assert bootstrap.n_simulations == 0


class TestBiasSafeWalkForward:
    @staticmethod
    def _frame(n: int = 80) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "feature": np.arange(n, dtype=float),
                "profit": np.sin(np.arange(n) / 5.0),
                "event_time": pd.date_range("2025-01-01", periods=n, freq="D"),
                "label_end": pd.date_range("2025-01-03", periods=n, freq="D"),
            }
        )

    def test_fit_never_observes_oos_and_parameters_are_frozen(self):
        fit_maxima: list[float] = []

        def fit_fn(train: pd.DataFrame) -> dict[str, float]:
            maximum = float(train["feature"].max())
            fit_maxima.append(maximum)
            return {"train_max": maximum, "calls": 0.0}

        def evaluate_fn(model: dict[str, float], test: pd.DataFrame) -> np.ndarray:
            if float(test["feature"].max()) > model["train_max"]:
                assert float(test["feature"].min()) > model["train_max"]
            model["calls"] += 1.0  # mutation must not leak into another evaluation
            assert model["calls"] == 1.0
            return test["profit"].to_numpy()

        result = walk_forward_validate(
            self._frame(),
            fit_fn=fit_fn,
            evaluate_fn=evaluate_fn,
            train_size=24,
            test_size=8,
            n_windows=4,
            purge_size=2,
            embargo_size=1,
            ts_col="event_time",
        )

        assert result.methodology == "fit_freeze_evaluate"
        assert result.parameters_frozen is True
        assert result.oos_overlap_count == 0
        assert fit_maxima == [21.0, 29.0, 37.0, 45.0]

    def test_fold_boundaries_apply_purge_embargo_and_nonoverlap(self):
        result = walk_forward_validate(
            self._frame(),
            fit_fn=lambda train: float(train["profit"].mean()),
            evaluate_fn=lambda model, test: test["profit"].to_numpy() - model,
            train_size=20,
            test_size=5,
            n_windows=5,
            purge_size=2,
            embargo_size=3,
            ts_col="event_time",
        )

        previous_oos_end = -1
        for fold in result.windows:
            assert (
                fold.in_sample_end_index + fold.purged_n + fold.embargo_n
                < fold.out_sample_start_index
            )
            assert fold.out_sample_start_index > previous_oos_end
            previous_oos_end = fold.out_sample_end_index

    def test_overlapping_oos_step_is_rejected(self):
        with pytest.raises(ValueError, match="non-overlapping OOS"):
            walk_forward_validate(
                self._frame(),
                fit_fn=lambda train: 0.0,
                evaluate_fn=lambda model, test: test["profit"].to_numpy(),
                train_size=20,
                test_size=8,
                step_size=4,
            )

    def test_interval_labels_overlapping_test_are_purged(self):
        seen_train_indices: list[list[int]] = []

        def fit_fn(train: pd.DataFrame) -> float:
            seen_train_indices.append(train.index.tolist())
            return 0.0

        result = walk_forward_validate(
            self._frame(),
            fit_fn=fit_fn,
            evaluate_fn=lambda model, test: test["profit"].to_numpy(),
            train_size=20,
            test_size=5,
            n_windows=1,
            ts_col="event_time",
            label_end_col="label_end",
        )

        assert result.windows[0].purged_n == 2
        assert seen_train_indices[0][-1] == 17

    def test_legacy_shape_is_retained_but_labeled_evaluation_only(self):
        frame = self._frame(100).rename(columns={"event_time": "exit_time"})
        result = rolling_walk_forward(frame, n_windows=3)

        assert result.n_windows == 3
        assert result.methodology == "evaluation_only_no_refit"
        assert result.parameters_frozen is False
        assert result.oos_overlap_count == 0
        assert result.aggregation_method == "non_overlapping_oos_mean_fold_is"
