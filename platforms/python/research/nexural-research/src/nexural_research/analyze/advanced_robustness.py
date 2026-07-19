"""Advanced robustness testing: parametric Monte Carlo, block bootstrap,
rolling walk-forward analysis, Deflated Sharpe Ratio, and parameter
sensitivity analysis.

These go well beyond what NinjaTrader provides and are used by
institutional quant teams to validate strategy robustness.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, fields
from typing import Any, Callable, Sequence

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

from nexural_research.analyze.annualization import annualized_sharpe, frame_sharpe, periodic_pnl

# ---------------------------------------------------------------------------
# Parametric Monte Carlo
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ParametricMonteCarloResult:
    """Monte Carlo simulation using fitted distribution parameters."""

    n_simulations: int
    n_trades_per_sim: int
    distribution: str  # "normal", "t", "empirical"
    final_equity_mean: float
    final_equity_std: float
    final_equity_p05: float
    final_equity_p25: float
    final_equity_p50: float
    final_equity_p75: float
    final_equity_p95: float
    mdd_mean: float
    mdd_p50: float
    mdd_p95: float
    mdd_p99: float
    prob_profitable: float  # % of sims that end positive
    prob_drawdown_50pct: float  # % of sims with >50% drawdown of peak equity


def parametric_monte_carlo(
    df_trades: pd.DataFrame,
    *,
    n_simulations: int = 5000,
    n_trades_per_sim: int | None = None,
    seed: int = 42,
    distribution: str = "empirical",
) -> ParametricMonteCarloResult:
    """Run parametric Monte Carlo simulation.

    distribution options:
    - "empirical": resample from actual trade returns with replacement (bootstrap)
    - "normal": fit normal distribution and simulate
    - "t": fit Student's t-distribution and simulate (better for fat tails)
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n == 0:
        return ParametricMonteCarloResult(
            **{f.name: 0.0 for f in fields(ParametricMonteCarloResult)},
        )

    if n_trades_per_sim is None:
        n_trades_per_sim = n

    rng = np.random.default_rng(seed)
    final_equities = np.zeros(n_simulations)
    max_drawdowns = np.zeros(n_simulations)

    for i in range(n_simulations):
        if distribution == "empirical":
            sim_pnl = rng.choice(pnl, size=n_trades_per_sim, replace=True)
        elif distribution == "normal":
            sim_pnl = rng.normal(loc=np.mean(pnl), scale=np.std(pnl, ddof=1), size=n_trades_per_sim)
        elif distribution == "t":
            df_param, loc, scale = sp_stats.t.fit(pnl)
            sim_pnl = sp_stats.t.rvs(
                df_param,
                loc=loc,
                scale=scale,
                size=n_trades_per_sim,
                random_state=rng,
            )
        else:
            raise ValueError(f"unsupported distribution: {distribution}")

        eq = np.cumsum(sim_pnl)
        final_equities[i] = eq[-1]
        peak = np.maximum.accumulate(eq)
        dd = eq - peak
        max_drawdowns[i] = float(np.min(dd))

    eq_pcts = np.percentile(final_equities, [5, 25, 50, 75, 95])
    mdd_abs = np.abs(max_drawdowns)

    # Probability of >50% drawdown relative to peak equity at that point
    # Simplified: use max drawdowns vs final equity
    peak_equities = final_equities + mdd_abs  # rough peak estimate
    prob_dd50 = float(np.mean(mdd_abs > 0.5 * np.maximum(peak_equities, 1e-10)))

    return ParametricMonteCarloResult(
        n_simulations=n_simulations,
        n_trades_per_sim=n_trades_per_sim,
        distribution=distribution,
        final_equity_mean=round(float(np.mean(final_equities)), 2),
        final_equity_std=round(float(np.std(final_equities)), 2),
        final_equity_p05=round(float(eq_pcts[0]), 2),
        final_equity_p25=round(float(eq_pcts[1]), 2),
        final_equity_p50=round(float(eq_pcts[2]), 2),
        final_equity_p75=round(float(eq_pcts[3]), 2),
        final_equity_p95=round(float(eq_pcts[4]), 2),
        mdd_mean=round(float(np.mean(max_drawdowns)), 2),
        mdd_p50=round(float(np.percentile(max_drawdowns, 50)), 2),
        mdd_p95=round(float(np.percentile(max_drawdowns, 5)), 2),  # worst 5% of MDD
        mdd_p99=round(float(np.percentile(max_drawdowns, 1)), 2),
        prob_profitable=round(float(np.mean(final_equities > 0) * 100), 2),
        prob_drawdown_50pct=round(float(prob_dd50 * 100), 2),
    )


# ---------------------------------------------------------------------------
# Block Bootstrap Monte Carlo
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BlockBootstrapResult:
    """Block bootstrap preserves autocorrelation structure."""

    n_simulations: int
    block_size: int
    sharpe_mean: float
    sharpe_std: float
    sharpe_p05: float
    sharpe_p95: float
    sharpe_ci_lower: float  # 95% CI
    sharpe_ci_upper: float
    net_profit_p05: float
    net_profit_p95: float
    mdd_p50: float
    mdd_p95: float
    sufficient_history: bool
    observation_basis: str


def block_bootstrap_monte_carlo(
    df_trades: pd.DataFrame,
    *,
    n_simulations: int = 2000,
    block_size: int | None = None,
    seed: int = 42,
    periods_per_year: float | None = None,
) -> BlockBootstrapResult:
    """Block bootstrap Monte Carlo that preserves trade autocorrelation.

    Useful when trades have serial dependency (momentum/mean-reversion regimes).
    """

    periodic = periodic_pnl(df_trades, periods_per_year=periods_per_year)
    pnl = periodic.values
    bootstrap_periods_per_year = periodic.periods_per_year
    n = len(pnl)
    defensible_frequency = periods_per_year is not None or periodic.basis == (
        "calendar_complete_trading_day_pnl"
    )
    if n < 10 or not defensible_frequency:
        return BlockBootstrapResult(
            n_simulations=0,
            block_size=0,
            sharpe_mean=0.0,
            sharpe_std=0.0,
            sharpe_p05=0.0,
            sharpe_p95=0.0,
            sharpe_ci_lower=0.0,
            sharpe_ci_upper=0.0,
            net_profit_p05=0.0,
            net_profit_p95=0.0,
            mdd_p50=0.0,
            mdd_p95=0.0,
            sufficient_history=False,
            observation_basis=periodic.basis,
        )

    # Auto block size: cube root of n (Politis & Romano)
    if block_size is None:
        block_size = max(3, int(np.ceil(n ** (1 / 3))))

    rng = np.random.default_rng(seed)
    sharpes = np.zeros(n_simulations)
    net_profits = np.zeros(n_simulations)
    max_drawdowns = np.zeros(n_simulations)

    n_blocks = int(np.ceil(n / block_size))

    for i in range(n_simulations):
        # Sample blocks with replacement
        blocks = []
        for _ in range(n_blocks):
            start = rng.integers(0, max(1, n - block_size + 1))
            blocks.append(pnl[start : start + block_size])
        sim_pnl = np.concatenate(blocks)[:n]

        eq = np.cumsum(sim_pnl)
        net_profits[i] = eq[-1]

        sharpes[i] = annualized_sharpe(
            sim_pnl,
            periods_per_year=bootstrap_periods_per_year,
        )

        peak = np.maximum.accumulate(eq)
        max_drawdowns[i] = float(np.min(eq - peak))

    s_pcts = np.percentile(sharpes, [2.5, 5, 95, 97.5])
    p_pcts = np.percentile(net_profits, [5, 95])

    return BlockBootstrapResult(
        n_simulations=n_simulations,
        block_size=block_size,
        sharpe_mean=round(float(np.mean(sharpes)), 4),
        sharpe_std=round(float(np.std(sharpes)), 4),
        sharpe_p05=round(float(s_pcts[1]), 4),
        sharpe_p95=round(float(s_pcts[2]), 4),
        sharpe_ci_lower=round(float(s_pcts[0]), 4),
        sharpe_ci_upper=round(float(s_pcts[3]), 4),
        net_profit_p05=round(float(p_pcts[0]), 2),
        net_profit_p95=round(float(p_pcts[1]), 2),
        mdd_p50=round(float(np.percentile(max_drawdowns, 50)), 2),
        mdd_p95=round(float(np.percentile(max_drawdowns, 5)), 2),
        sufficient_history=True,
        observation_basis=periodic.basis,
    )


# ---------------------------------------------------------------------------
# Rolling Walk-Forward Analysis
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class WalkForwardWindow:
    """Metrics for a single walk-forward window."""

    window_id: int
    in_sample_start: str
    in_sample_end: str
    out_sample_start: str
    out_sample_end: str
    in_sample_n: int
    out_sample_n: int
    in_sample_net: float
    out_sample_net: float
    in_sample_sharpe: float
    out_sample_sharpe: float
    efficiency: float  # out-of-sample / in-sample performance ratio
    in_sample_start_index: int = -1
    in_sample_end_index: int = -1
    out_sample_start_index: int = -1
    out_sample_end_index: int = -1
    purged_n: int = 0
    embargo_n: int = 0


@dataclass(frozen=True)
class RollingWalkForwardResult:
    """Complete rolling walk-forward analysis."""

    n_windows: int
    in_sample_pct: float
    anchored: bool
    windows: list[WalkForwardWindow]
    aggregate_oos_net: float
    aggregate_oos_sharpe: float
    avg_efficiency: float
    efficiency_std: float
    pct_profitable_oos: float
    walk_forward_efficiency: float
    methodology: str = "evaluation_only_no_refit"
    aggregation_method: str = "non_overlapping_oos_mean_fold_is"
    parameters_frozen: bool = False
    purge_size: int = 0
    embargo_size: int = 0
    oos_overlap_count: int = 0


FitFunction = Callable[[pd.DataFrame], Any]
EvaluateFunction = Callable[[Any, pd.DataFrame], Sequence[float] | np.ndarray | pd.Series]


def _ordered_frame(df: pd.DataFrame, ts_col: str) -> tuple[pd.DataFrame, str | None]:
    selected = ts_col
    if selected not in df.columns:
        selected = "entry_time" if "entry_time" in df.columns else None
    ordered = df.copy()
    if selected is not None:
        ordered[selected] = pd.to_datetime(ordered[selected], errors="coerce")
        ordered = ordered.dropna(subset=[selected]).sort_values(selected, kind="mergesort")
    return ordered.reset_index(drop=True), selected


def _window_timestamp(frame: pd.DataFrame, ts_col: str | None, position: int) -> str:
    if ts_col is None or len(frame) == 0:
        return ""
    return str(frame[ts_col].iloc[position])


def _empty_walk_forward(
    *,
    in_sample_pct: float,
    anchored: bool,
    methodology: str,
    parameters_frozen: bool,
    purge_size: int = 0,
    embargo_size: int = 0,
) -> RollingWalkForwardResult:
    return RollingWalkForwardResult(
        n_windows=0,
        in_sample_pct=in_sample_pct,
        anchored=anchored,
        windows=[],
        aggregate_oos_net=0.0,
        aggregate_oos_sharpe=0.0,
        avg_efficiency=0.0,
        efficiency_std=0.0,
        pct_profitable_oos=0.0,
        walk_forward_efficiency=0.0,
        methodology=methodology,
        parameters_frozen=parameters_frozen,
        purge_size=purge_size,
        embargo_size=embargo_size,
    )


def _assemble_walk_forward_result(
    *,
    windows: list[WalkForwardWindow],
    oos_frames: list[pd.DataFrame],
    oos_positions: list[int],
    is_means: list[float],
    in_sample_pct: float,
    anchored: bool,
    methodology: str,
    parameters_frozen: bool,
    purge_size: int,
    embargo_size: int,
    ts_col: str,
    periods_per_year: float | None,
) -> RollingWalkForwardResult:
    if not windows:
        return _empty_walk_forward(
            in_sample_pct=in_sample_pct,
            anchored=anchored,
            methodology=methodology,
            parameters_frozen=parameters_frozen,
            purge_size=purge_size,
            embargo_size=embargo_size,
        )

    combined_oos = pd.concat(oos_frames, ignore_index=True)
    oos_values = pd.to_numeric(combined_oos["profit"], errors="coerce").fillna(0.0)
    agg_oos = float(oos_values.sum())
    agg_oos_sharpe = frame_sharpe(
        combined_oos,
        ts_col=ts_col,
        periods_per_year=periods_per_year,
    )
    oos_mean = float(oos_values.mean()) if len(oos_values) else 0.0
    mean_fold_is = float(np.mean(is_means)) if is_means else 0.0
    efficiency = oos_mean / mean_fold_is if abs(mean_fold_is) > 1e-10 else 0.0
    fold_efficiencies = [window.efficiency for window in windows]
    oos_nets = [window.out_sample_net for window in windows]
    overlap_count = len(oos_positions) - len(set(oos_positions))

    return RollingWalkForwardResult(
        n_windows=len(windows),
        in_sample_pct=in_sample_pct,
        anchored=anchored,
        windows=windows,
        aggregate_oos_net=round(agg_oos, 2),
        aggregate_oos_sharpe=round(agg_oos_sharpe, 4),
        avg_efficiency=round(float(np.mean(fold_efficiencies)), 4),
        efficiency_std=(
            round(float(np.std(fold_efficiencies)), 4) if len(fold_efficiencies) > 1 else 0.0
        ),
        pct_profitable_oos=round(float(np.mean([net > 0 for net in oos_nets]) * 100), 1),
        walk_forward_efficiency=round(efficiency, 4),
        methodology=methodology,
        parameters_frozen=parameters_frozen,
        purge_size=purge_size,
        embargo_size=embargo_size,
        oos_overlap_count=overlap_count,
    )


def walk_forward_validate(
    data: pd.DataFrame,
    *,
    fit_fn: FitFunction,
    evaluate_fn: EvaluateFunction,
    train_size: int,
    test_size: int,
    step_size: int | None = None,
    n_windows: int | None = None,
    anchored: bool = False,
    purge_size: int = 0,
    embargo_size: int = 0,
    ts_col: str = "exit_time",
    label_end_col: str | None = None,
    periods_per_year: float | None = None,
) -> RollingWalkForwardResult:
    """Fit on IS, freeze parameters, and evaluate non-overlapping OOS folds.

    ``fit_fn`` receives only the effective in-sample frame after positional
    purging and optional interval-label purging.  ``evaluate_fn`` receives a
    deep copy of the fitted object, preventing evaluator mutation from leaking
    across IS/OOS calls or folds.  A step shorter than the test window is
    rejected because it would count OOS observations more than once.
    """

    if train_size <= 0 or test_size <= 0:
        raise ValueError("train_size and test_size must be positive")
    if purge_size < 0 or embargo_size < 0:
        raise ValueError("purge_size and embargo_size cannot be negative")
    if purge_size >= train_size:
        raise ValueError("purge_size must be smaller than train_size")
    step = test_size if step_size is None else step_size
    if step < test_size:
        raise ValueError("step_size must be >= test_size for non-overlapping OOS folds")
    if n_windows is not None and n_windows <= 0:
        raise ValueError("n_windows must be positive when supplied")

    frame, selected_ts = _ordered_frame(data, ts_col)
    n = len(frame)
    in_sample_pct = train_size / n if n else 0.0
    if n < train_size + embargo_size + test_size:
        return _empty_walk_forward(
            in_sample_pct=in_sample_pct,
            anchored=anchored,
            methodology="fit_freeze_evaluate",
            parameters_frozen=True,
            purge_size=purge_size,
            embargo_size=embargo_size,
        )

    windows: list[WalkForwardWindow] = []
    oos_frames: list[pd.DataFrame] = []
    oos_positions: list[int] = []
    is_means: list[float] = []
    fold_id = 0

    while True:
        boundary = train_size + fold_id * step
        train_start = 0 if anchored else boundary - train_size
        nominal_train = list(range(train_start, boundary))
        effective_positions = nominal_train[: len(nominal_train) - purge_size]
        test_start = boundary + embargo_size
        test_end = test_start + test_size
        if test_end > n or (n_windows is not None and fold_id >= n_windows):
            break

        if label_end_col is not None:
            if selected_ts is None:
                raise ValueError("label_end_col requires a valid timestamp column")
            if label_end_col not in frame.columns:
                raise ValueError(f"label_end_col not found: {label_end_col}")
            test_start_time = frame[selected_ts].iloc[test_start]
            label_ends = pd.to_datetime(
                frame.iloc[effective_positions][label_end_col],
                errors="coerce",
            )
            effective_positions = [
                position
                for position, label_end in zip(effective_positions, label_ends, strict=True)
                if pd.notna(label_end) and label_end < test_start_time
            ]

        if not effective_positions:
            raise ValueError("purging removed the entire in-sample fold")

        train = frame.iloc[effective_positions].copy()
        test = frame.iloc[test_start:test_end].copy()
        fitted = fit_fn(train.copy())
        is_output = np.asarray(evaluate_fn(deepcopy(fitted), train.copy()), dtype=float)
        oos_output = np.asarray(evaluate_fn(deepcopy(fitted), test.copy()), dtype=float)
        if is_output.ndim != 1 or len(is_output) != len(train):
            raise ValueError("evaluate_fn must return one IS value per input row")
        if oos_output.ndim != 1 or len(oos_output) != len(test):
            raise ValueError("evaluate_fn must return one OOS value per input row")

        scored_is = train.copy()
        scored_is["profit"] = is_output
        scored_oos = test.copy()
        scored_oos["profit"] = oos_output
        is_sharpe = frame_sharpe(
            scored_is,
            ts_col=selected_ts or ts_col,
            periods_per_year=periods_per_year,
        )
        oos_sharpe = frame_sharpe(
            scored_oos,
            ts_col=selected_ts or ts_col,
            periods_per_year=periods_per_year,
        )
        fold_efficiency = oos_sharpe / is_sharpe if abs(is_sharpe) > 1e-10 else 0.0
        purged_n = len(nominal_train) - len(effective_positions)

        windows.append(
            WalkForwardWindow(
                window_id=fold_id,
                in_sample_start=_window_timestamp(frame, selected_ts, effective_positions[0]),
                in_sample_end=_window_timestamp(frame, selected_ts, effective_positions[-1]),
                out_sample_start=_window_timestamp(frame, selected_ts, test_start),
                out_sample_end=_window_timestamp(frame, selected_ts, test_end - 1),
                in_sample_n=len(train),
                out_sample_n=len(test),
                in_sample_net=round(float(is_output.sum()), 2),
                out_sample_net=round(float(oos_output.sum()), 2),
                in_sample_sharpe=round(is_sharpe, 4),
                out_sample_sharpe=round(oos_sharpe, 4),
                efficiency=round(fold_efficiency, 4),
                in_sample_start_index=effective_positions[0],
                in_sample_end_index=effective_positions[-1],
                out_sample_start_index=test_start,
                out_sample_end_index=test_end - 1,
                purged_n=purged_n,
                embargo_n=embargo_size,
            )
        )
        oos_frames.append(scored_oos)
        oos_positions.extend(range(test_start, test_end))
        is_means.append(float(is_output.mean()))
        fold_id += 1

    return _assemble_walk_forward_result(
        windows=windows,
        oos_frames=oos_frames,
        oos_positions=oos_positions,
        is_means=is_means,
        in_sample_pct=in_sample_pct,
        anchored=anchored,
        methodology="fit_freeze_evaluate",
        parameters_frozen=True,
        purge_size=purge_size,
        embargo_size=embargo_size,
        ts_col=selected_ts or ts_col,
        periods_per_year=periods_per_year,
    )


def rolling_walk_forward(
    df_trades: pd.DataFrame,
    *,
    n_windows: int = 5,
    in_sample_pct: float = 0.7,
    anchored: bool = False,
    ts_col: str = "exit_time",
    periods_per_year: float | None = None,
) -> RollingWalkForwardResult:
    """Evaluate a fixed historical PnL stream across chronological windows.

    This backwards-compatible mode does *not* fit or select parameters and is
    therefore labeled ``evaluation_only_no_refit``.  Use
    :func:`walk_forward_validate` for fit/freeze/OOS strategy validation.
    """

    if n_windows <= 0:
        raise ValueError("n_windows must be positive")
    if not 0.0 < in_sample_pct < 1.0:
        raise ValueError("in_sample_pct must be between zero and one")
    df, selected_ts = _ordered_frame(df_trades, ts_col)

    n = len(df)
    if n < 20:
        return _empty_walk_forward(
            in_sample_pct=in_sample_pct,
            anchored=anchored,
            methodology="evaluation_only_no_refit",
            parameters_frozen=False,
        )

    # Calculate window boundaries
    total_oos = int(n * (1 - in_sample_pct))
    oos_per_window = max(1, total_oos // n_windows)

    windows: list[WalkForwardWindow] = []
    oos_frames: list[pd.DataFrame] = []
    oos_positions: list[int] = []
    is_means: list[float] = []

    for w in range(n_windows):
        if anchored:
            is_start = 0
            is_end = int(n * in_sample_pct) + w * oos_per_window
        else:
            is_start = w * oos_per_window
            is_end = min(is_start + int(n * in_sample_pct), n)

        oos_start = is_end
        oos_end = min(oos_start + oos_per_window, n)

        if oos_start >= n or oos_end <= oos_start:
            break

        df_is = df.iloc[is_start:is_end]
        df_oos = df.iloc[oos_start:oos_end]

        is_pnl = pd.to_numeric(df_is["profit"], errors="coerce").fillna(0.0).to_numpy()
        oos_pnl = pd.to_numeric(df_oos["profit"], errors="coerce").fillna(0.0).to_numpy()

        is_net = float(np.sum(is_pnl))
        oos_net = float(np.sum(oos_pnl))

        is_sharpe = frame_sharpe(
            df_is,
            ts_col=selected_ts or ts_col,
            periods_per_year=periods_per_year,
        )
        oos_sharpe = frame_sharpe(
            df_oos,
            ts_col=selected_ts or ts_col,
            periods_per_year=periods_per_year,
        )

        efficiency = oos_sharpe / is_sharpe if abs(is_sharpe) > 1e-10 else 0.0

        windows.append(
            WalkForwardWindow(
                window_id=w,
                in_sample_start=_window_timestamp(df, selected_ts, is_start),
                in_sample_end=_window_timestamp(df, selected_ts, is_end - 1),
                out_sample_start=_window_timestamp(df, selected_ts, oos_start),
                out_sample_end=_window_timestamp(df, selected_ts, oos_end - 1),
                in_sample_n=len(df_is),
                out_sample_n=len(df_oos),
                in_sample_net=round(is_net, 2),
                out_sample_net=round(oos_net, 2),
                in_sample_sharpe=round(is_sharpe, 4),
                out_sample_sharpe=round(oos_sharpe, 4),
                efficiency=round(efficiency, 4),
                in_sample_start_index=is_start,
                in_sample_end_index=is_end - 1,
                out_sample_start_index=oos_start,
                out_sample_end_index=oos_end - 1,
            )
        )

        oos_frames.append(df_oos)
        oos_positions.extend(range(oos_start, oos_end))
        is_means.append(float(np.mean(is_pnl)) if len(is_pnl) else 0.0)

    return _assemble_walk_forward_result(
        windows=windows,
        oos_frames=oos_frames,
        oos_positions=oos_positions,
        is_means=is_means,
        in_sample_pct=in_sample_pct,
        anchored=anchored,
        methodology="evaluation_only_no_refit",
        parameters_frozen=False,
        purge_size=0,
        embargo_size=0,
        ts_col=selected_ts or ts_col,
        periods_per_year=periods_per_year,
    )


# ---------------------------------------------------------------------------
# Deflated Sharpe Ratio (overfitting detection)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DeflatedSharpeResult:
    """Deflated Sharpe Ratio — tests whether the observed Sharpe is
    statistically significant after accounting for multiple testing."""

    observed_sharpe: float
    deflated_sharpe: float
    p_value: float
    is_significant: bool  # at 5% level
    n_trials_assumed: int
    expected_max_sharpe: float
    interpretation: str
    periods_per_year: float = 1.0
    annualization_basis: str = "unannualized_observation_pnl"


def deflated_sharpe_ratio(
    df_trades: pd.DataFrame,
    *,
    n_trials: int = 100,
    risk_free_rate: float = 0.0,
    periods_per_year: float | None = None,
    ts_col: str = "exit_time",
) -> DeflatedSharpeResult:
    """Compute the Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014).

    This adjusts for:
    - Multiple testing (how many strategies/parameters were tried)
    - Non-normal returns (skewness, kurtosis)
    - Sample length

    A DSR that is significant means the strategy is unlikely to be a
    result of overfitting from trying many parameter combinations.
    """

    if n_trials <= 0:
        raise ValueError("n_trials must be positive")
    periodic = periodic_pnl(
        df_trades,
        ts_col=ts_col,
        periods_per_year=periods_per_year,
    )
    pnl = periodic.values
    annualization = periodic.periods_per_year
    annualization_basis = periodic.basis
    n = len(pnl)

    defensible_frequency = periods_per_year is not None or annualization_basis == (
        "calendar_complete_trading_day_pnl"
    )
    if len(df_trades) < 10 or n < 10 or not defensible_frequency:
        return DeflatedSharpeResult(
            observed_sharpe=0.0,
            deflated_sharpe=0.0,
            p_value=1.0,
            is_significant=False,
            n_trials_assumed=n_trials,
            expected_max_sharpe=0.0,
            interpretation=(
                "insufficient regularly sampled history for deflated Sharpe analysis; "
                "provide at least 10 daily observations or an explicit defensible frequency"
            ),
            periods_per_year=annualization,
            annualization_basis=annualization_basis,
        )

    mean_ret = float(np.mean(pnl)) - risk_free_rate / annualization
    std_ret = float(np.std(pnl, ddof=1))
    if std_ret < 1e-10:
        return DeflatedSharpeResult(
            observed_sharpe=0.0,
            deflated_sharpe=0.0,
            p_value=1.0,
            is_significant=False,
            n_trials_assumed=n_trials,
            expected_max_sharpe=0.0,
            interpretation="constant PnL has undefined Sharpe and cannot survive deflation",
            periods_per_year=annualization,
            annualization_basis=annualization_basis,
        )

    observed_sharpe = mean_ret / std_ret * np.sqrt(annualization)
    skew = float(sp_stats.skew(pnl))
    kurt = float(sp_stats.kurtosis(pnl, fisher=False))

    # Expected maximum Sharpe under the null across independent trials. Scale
    # the normal order statistic by the sampling error of a Sharpe estimate.
    euler_gamma = 0.5772156649
    if n_trials > 1:
        z_max = (1.0 - euler_gamma) * sp_stats.norm.ppf(
            1.0 - 1.0 / n_trials
        ) + euler_gamma * sp_stats.norm.ppf(1.0 - 1.0 / (n_trials * np.e))
        expected_max_periodic = float(z_max / np.sqrt(n - 1.0))
    else:
        expected_max_periodic = 0.0
    expected_max_sr = expected_max_periodic * np.sqrt(annualization)

    # Standard error of Sharpe ratio with non-normality adjustment
    sr = observed_sharpe / np.sqrt(annualization)
    se_var = (1.0 - skew * sr + (kurt - 1) / 4.0 * sr**2) / (n - 1.0)
    se_sr = np.sqrt(max(se_var, 1e-10))

    if se_sr < 1e-10:
        se_sr = 1e-10

    # Deflated Sharpe: test if observed SR > expected max SR under null
    # PSR = Prob[SR* > SR0] where SR0 = expected max
    psr_stat = (sr - expected_max_periodic) / se_sr
    p_value = 1.0 - float(sp_stats.norm.cdf(psr_stat))

    is_sig = p_value < 0.05

    if is_sig:
        interp = (
            f"Strategy Sharpe ({observed_sharpe:.2f}) survives deflation "
            f"(p={p_value:.4f}). Unlikely to be overfit."
        )
    else:
        interp = (
            f"Strategy Sharpe ({observed_sharpe:.2f}) does NOT survive deflation "
            f"(p={p_value:.4f}). Potential overfitting from {n_trials} trials."
        )

    return DeflatedSharpeResult(
        observed_sharpe=round(float(observed_sharpe), 4),
        deflated_sharpe=round(float(psr_stat), 4),
        p_value=round(float(p_value), 6),
        is_significant=is_sig,
        n_trials_assumed=n_trials,
        expected_max_sharpe=round(float(expected_max_sr), 4),
        interpretation=interp,
        periods_per_year=annualization,
        annualization_basis=annualization_basis,
    )


# ---------------------------------------------------------------------------
# Regime Detection
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RegimeAnalysisResult:
    """Volatility and performance regime analysis."""

    n_regimes: int
    regime_labels: list[str]
    regime_counts: list[int]
    regime_avg_pnl: list[float]
    regime_sharpe: list[float]
    regime_win_rate: list[float]
    regime_avg_drawdown: list[float]
    current_regime: str
    interpretation: str


def regime_analysis(
    df_trades: pd.DataFrame,
    *,
    n_regimes: int = 3,
    window: int = 20,
) -> RegimeAnalysisResult:
    """Detect volatility regimes and analyze strategy performance in each.

    Uses rolling volatility to classify trades into low/medium/high
    volatility regimes, then compares performance across regimes.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0)
    n = len(pnl)

    if n < window * 2:
        return RegimeAnalysisResult(
            n_regimes=0,
            regime_labels=[],
            regime_counts=[],
            regime_avg_pnl=[],
            regime_sharpe=[],
            regime_win_rate=[],
            regime_avg_drawdown=[],
            current_regime="unknown",
            interpretation="insufficient data for regime analysis",
        )

    # Rolling volatility
    rolling_vol = pnl.rolling(window=window, min_periods=window // 2).std().bfill()

    # Classify into regimes using quantiles
    if n_regimes == 3:
        labels = ["low_volatility", "medium_volatility", "high_volatility"]
        q33 = rolling_vol.quantile(0.33)
        q66 = rolling_vol.quantile(0.66)
        regime = pd.Series("medium_volatility", index=pnl.index)
        regime[rolling_vol <= q33] = "low_volatility"
        regime[rolling_vol >= q66] = "high_volatility"
    elif n_regimes == 2:
        labels = ["low_volatility", "high_volatility"]
        q50 = rolling_vol.quantile(0.50)
        regime = pd.Series("high_volatility", index=pnl.index)
        regime[rolling_vol <= q50] = "low_volatility"
    else:
        # Generic quantile-based
        labels = [f"regime_{i}" for i in range(n_regimes)]
        quantiles = np.linspace(0, 1, n_regimes + 1)
        thresholds = [rolling_vol.quantile(q) for q in quantiles]
        regime = pd.Series(labels[-1], index=pnl.index)
        for i in range(n_regimes - 1):
            regime[rolling_vol <= thresholds[i + 1]] = labels[i]

    # Analyze each regime
    actual_labels = []
    counts = []
    avg_pnls = []
    sharpes = []
    win_rates = []
    avg_dds = []

    for label in labels:
        mask = regime == label
        if mask.sum() == 0:
            continue
        rpnl = pnl[mask].to_numpy()
        actual_labels.append(label)
        counts.append(int(mask.sum()))
        avg_pnls.append(round(float(np.mean(rpnl)), 2))
        std = float(np.std(rpnl, ddof=1)) if len(rpnl) > 1 else 1e-10
        sharpes.append(round(float(np.mean(rpnl) / std) if std > 1e-10 else 0.0, 4))
        win_rates.append(round(float(np.mean(rpnl > 0) * 100), 1))

        eq = np.cumsum(rpnl)
        peak = np.maximum.accumulate(eq)
        dd = eq - peak
        avg_dds.append(round(float(np.mean(dd)), 2))

    current = str(regime.iloc[-1])

    # Interpretation
    if len(sharpes) >= 2:
        best = actual_labels[np.argmax(sharpes)]
        worst = actual_labels[np.argmin(sharpes)]
        interp = (
            f"Best performance in {best} regime (Sharpe {max(sharpes):.2f}), "
            f"worst in {worst} (Sharpe {min(sharpes):.2f}). Currently in {current}."
        )
    else:
        interp = "Insufficient regime diversity for comparison."

    return RegimeAnalysisResult(
        n_regimes=len(actual_labels),
        regime_labels=actual_labels,
        regime_counts=counts,
        regime_avg_pnl=avg_pnls,
        regime_sharpe=sharpes,
        regime_win_rate=win_rates,
        regime_avg_drawdown=avg_dds,
        current_regime=current,
        interpretation=interp,
    )
