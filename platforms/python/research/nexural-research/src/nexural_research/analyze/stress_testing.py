"""Stress testing and parameter sensitivity analysis.

Covers:
- Tail amplification: what if the worst trades were 2x/3x worse
- Historical stress scenarios: worst N-trade drawdown windows
- Drawdown stress: what drawdown should you expect at various confidence levels
- Parameter sensitivity surface: how fragile is the edge to position size / stop changes
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from nexural_research.analyze.equity import max_drawdown
from nexural_research.analyze.metrics import metrics_from_trades


# ---------------------------------------------------------------------------
# Tail Amplification Stress Test
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TailAmplificationResult:
    """What happens when your worst trades are worse than backtested."""

    original_net: float
    original_mdd: float
    scenarios: list[TailScenario]
    interpretation: str


@dataclass(frozen=True)
class TailScenario:
    """A single tail amplification scenario."""

    label: str
    multiplier: float  # how much worse the tail is
    tail_pct: float  # what % of trades are amplified
    adjusted_net: float
    adjusted_mdd: float
    net_change_pct: float
    mdd_change_pct: float
    still_profitable: bool


def tail_amplification_stress_test(
    df_trades: pd.DataFrame,
    *,
    tail_percentiles: list[float] | None = None,
    multipliers: list[float] | None = None,
) -> TailAmplificationResult:
    """Stress test: amplify the worst trades and measure impact.

    This answers: "What if my worst trades were 2x or 3x worse than
    backtested?" — the question every risk manager asks before allocating.
    Real execution is almost always worse than backtest on the tails.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 5:
        return TailAmplificationResult(
            original_net=0.0, original_mdd=0.0, scenarios=[],
            interpretation="Insufficient data for stress testing (need 5+ trades)",
        )

    if tail_percentiles is None:
        tail_percentiles = [5.0, 10.0, 20.0]
    if multipliers is None:
        multipliers = [1.5, 2.0, 3.0]

    eq = pd.Series(np.cumsum(pnl))
    original_net = float(eq.iloc[-1])
    original_mdd = float(max_drawdown(eq))

    scenarios: list[TailScenario] = []

    for tail_pct in tail_percentiles:
        threshold = np.percentile(pnl, tail_pct)
        tail_mask = pnl <= threshold

        for mult in multipliers:
            adjusted_pnl = pnl.copy()
            # Only amplify losses (make them worse)
            adjusted_pnl[tail_mask] = pnl[tail_mask] * mult

            adj_eq = pd.Series(np.cumsum(adjusted_pnl))
            adj_net = float(adj_eq.iloc[-1])
            adj_mdd = float(max_drawdown(adj_eq))

            net_change = ((adj_net - original_net) / abs(original_net) * 100) if abs(original_net) > 1e-10 else 0.0
            mdd_change = ((abs(adj_mdd) - abs(original_mdd)) / abs(original_mdd) * 100) if abs(original_mdd) > 1e-10 else 0.0

            scenarios.append(TailScenario(
                label=f"Worst {tail_pct:.0f}% trades × {mult:.1f}x",
                multiplier=mult,
                tail_pct=tail_pct,
                adjusted_net=round(adj_net, 2),
                adjusted_mdd=round(adj_mdd, 2),
                net_change_pct=round(net_change, 1),
                mdd_change_pct=round(mdd_change, 1),
                still_profitable=adj_net > 0,
            ))

    # Find the breaking point
    break_scenario = None
    for s in scenarios:
        if not s.still_profitable:
            break_scenario = s
            break

    if break_scenario:
        interp = (
            f"Strategy breaks under {break_scenario.label} stress. "
            f"Net goes from ${original_net:,.2f} to ${break_scenario.adjusted_net:,.2f}. "
            f"This means real-world tail risk could wipe out the edge. "
            f"Consider tighter stops or reduced position size."
        )
    else:
        worst = scenarios[-1] if scenarios else None
        if worst:
            interp = (
                f"Strategy survives all stress scenarios (up to worst {worst.tail_pct:.0f}% × {worst.multiplier:.1f}x). "
                f"Worst case: net ${worst.adjusted_net:,.2f} (MDD ${worst.adjusted_mdd:,.2f}). "
                f"Good tail resilience."
            )
        else:
            interp = "No scenarios to evaluate."

    return TailAmplificationResult(
        original_net=round(original_net, 2),
        original_mdd=round(original_mdd, 2),
        scenarios=scenarios,
        interpretation=interp,
    )


# ---------------------------------------------------------------------------
# Historical Stress Scenarios
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class HistoricalStressWindow:
    """A specific historical stress period."""

    start_index: int
    end_index: int
    start_time: str
    end_time: str
    n_trades: int
    total_pnl: float
    max_drawdown: float
    win_rate: float


@dataclass(frozen=True)
class HistoricalStressResult:
    """Worst historical drawdown windows."""

    n_windows_analyzed: int
    worst_windows: list[HistoricalStressWindow]
    worst_n_trade_loss: float  # worst consecutive N-trade PnL
    worst_single_day_loss: float
    worst_single_trade: float
    interpretation: str


def historical_stress_scenarios(
    df_trades: pd.DataFrame,
    *,
    window_sizes: list[int] | None = None,
    top_n: int = 5,
) -> HistoricalStressResult:
    """Find the worst historical drawdown windows of various sizes.

    This answers: "What was the worst 10-trade / 20-trade / 50-trade
    stretch?" — the periods that would have tested your conviction.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 5:
        return HistoricalStressResult(
            n_windows_analyzed=0, worst_windows=[], worst_n_trade_loss=0.0,
            worst_single_day_loss=0.0, worst_single_trade=0.0,
            interpretation="Insufficient data for historical stress analysis",
        )

    if window_sizes is None:
        window_sizes = [s for s in [5, 10, 20, 50] if s <= n]

    ts_col = "exit_time" if "exit_time" in df_trades.columns else (
        "entry_time" if "entry_time" in df_trades.columns else None
    )

    all_windows: list[HistoricalStressWindow] = []

    for ws in window_sizes:
        if ws > n:
            continue

        worst_sum = float("inf")
        worst_start = 0

        # Sliding window to find worst stretch
        for i in range(n - ws + 1):
            window_pnl = pnl[i : i + ws]
            window_sum = float(np.sum(window_pnl))
            if window_sum < worst_sum:
                worst_sum = window_sum
                worst_start = i

        window_pnl = pnl[worst_start : worst_start + ws]
        window_eq = pd.Series(np.cumsum(window_pnl))
        window_mdd = float(max_drawdown(window_eq))
        window_wr = float(np.mean(window_pnl > 0))

        start_time = ""
        end_time = ""
        if ts_col and ts_col in df_trades.columns:
            st = df_trades[ts_col].iloc[worst_start]
            et = df_trades[ts_col].iloc[min(worst_start + ws - 1, n - 1)]
            start_time = str(st) if pd.notna(st) else ""
            end_time = str(et) if pd.notna(et) else ""

        all_windows.append(HistoricalStressWindow(
            start_index=worst_start,
            end_index=worst_start + ws - 1,
            start_time=start_time,
            end_time=end_time,
            n_trades=ws,
            total_pnl=round(worst_sum, 2),
            max_drawdown=round(window_mdd, 2),
            win_rate=round(window_wr, 4),
        ))

    # Sort by total PnL (worst first) and take top N
    all_windows.sort(key=lambda w: w.total_pnl)
    worst_windows = all_windows[:top_n]

    # Single worst trade
    worst_single = float(np.min(pnl))

    # Worst single day (if timestamps available)
    worst_day_loss = worst_single  # default to worst trade
    if ts_col and ts_col in df_trades.columns:
        ts = pd.to_datetime(df_trades[ts_col], errors="coerce")
        pnl_series = pd.Series(pnl, index=ts.values)
        daily_pnl = pnl_series.groupby(pnl_series.index.date).sum()
        if len(daily_pnl) > 0:
            worst_day_loss = float(daily_pnl.min())

    # Interpret
    if worst_windows:
        worst = worst_windows[0]
        interp = (
            f"Worst {worst.n_trades}-trade stretch: ${worst.total_pnl:,.2f} "
            f"(win rate {worst.win_rate*100:.0f}%). "
            f"Worst single trade: ${worst_single:,.2f}. "
            f"Worst single day: ${worst_day_loss:,.2f}. "
            f"You need to be able to psychologically and financially survive these drawdowns."
        )
    else:
        interp = "No stress windows found."

    return HistoricalStressResult(
        n_windows_analyzed=len(all_windows),
        worst_windows=worst_windows,
        worst_n_trade_loss=round(worst_windows[0].total_pnl, 2) if worst_windows else 0.0,
        worst_single_day_loss=round(worst_day_loss, 2),
        worst_single_trade=round(worst_single, 2),
        interpretation=interp,
    )


# ---------------------------------------------------------------------------
# Parameter Sensitivity Analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SensitivityPoint:
    """A single point on the sensitivity surface."""

    stop_multiplier: float
    size_multiplier: float
    net_profit: float
    max_drawdown: float
    profit_factor: float
    win_rate: float
    sharpe_proxy: float  # mean/std as quick proxy


@dataclass(frozen=True)
class ParameterSensitivityResult:
    """How fragile is the edge to position size and stop-loss changes.

    A robust strategy shows stable metrics across a range of parameters.
    A fragile strategy collapses with small parameter shifts.
    """

    n_points: int
    grid: list[SensitivityPoint]
    baseline_net: float
    baseline_mdd: float
    robustness_score: float  # 0-100, how stable is the edge
    optimal_size_mult: float  # which size multiplier maximizes risk-adjusted return
    interpretation: str


def parameter_sensitivity(
    df_trades: pd.DataFrame,
    *,
    size_range: tuple[float, float] = (0.25, 2.0),
    size_steps: int = 8,
    stop_range: tuple[float, float] = (0.5, 2.0),
    stop_steps: int = 7,
) -> ParameterSensitivityResult:
    """Compute strategy metrics across a grid of position size and stop multipliers.

    Position size multiplier: scales all PnL linearly (simulates sizing changes).
    Stop multiplier: clips losses at multiplier × current loss level (simulates
    tighter/wider stops). This is approximate — real stop changes affect win rate.

    The key insight: if net profit collapses with a 20% stop tightening,
    the strategy is curve-fitted. Robust strategies degrade gracefully.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 10:
        return ParameterSensitivityResult(
            n_points=0, grid=[], baseline_net=0.0, baseline_mdd=0.0,
            robustness_score=0.0, optimal_size_mult=1.0,
            interpretation="Insufficient data for sensitivity analysis (need 10+ trades)",
        )

    baseline_eq = pd.Series(np.cumsum(pnl))
    baseline_net = float(baseline_eq.iloc[-1])
    baseline_mdd = float(max_drawdown(baseline_eq))

    size_mults = np.linspace(size_range[0], size_range[1], size_steps)
    stop_mults = np.linspace(stop_range[0], stop_range[1], stop_steps)

    grid: list[SensitivityPoint] = []
    profitable_count = 0

    for size_m in size_mults:
        for stop_m in stop_mults:
            adjusted_pnl = pnl.copy() * size_m

            # Apply stop multiplier to losses only
            # If stop_m < 1: losses are capped (tighter stop, smaller losses but some wins become losses)
            # If stop_m > 1: losses are wider (wider stop, larger losses)
            losses_mask = adjusted_pnl < 0
            if stop_m != 1.0:
                # Scale loss magnitude
                adjusted_pnl[losses_mask] = adjusted_pnl[losses_mask] * stop_m

            adj_eq = pd.Series(np.cumsum(adjusted_pnl))
            adj_net = float(adj_eq.iloc[-1])
            adj_mdd = float(max_drawdown(adj_eq))

            wins = adjusted_pnl[adjusted_pnl > 0]
            losses = adjusted_pnl[adjusted_pnl < 0]
            win_rate = float(np.mean(adjusted_pnl > 0))
            loss_sum = abs(float(np.sum(losses)))
            pf = float(np.sum(wins) / loss_sum) if loss_sum > 1e-10 else (float("inf") if np.sum(wins) > 0 else 0.0)

            std = float(np.std(adjusted_pnl, ddof=1))
            sharpe_proxy = float(np.mean(adjusted_pnl) / std) if std > 1e-10 else 0.0

            if adj_net > 0:
                profitable_count += 1

            grid.append(SensitivityPoint(
                stop_multiplier=round(float(stop_m), 2),
                size_multiplier=round(float(size_m), 2),
                net_profit=round(adj_net, 2),
                max_drawdown=round(adj_mdd, 2),
                profit_factor=round(pf, 4) if np.isfinite(pf) else float("inf"),
                win_rate=round(win_rate, 4),
                sharpe_proxy=round(sharpe_proxy, 4),
            ))

    total_points = len(grid)
    robustness_score = round((profitable_count / total_points * 100) if total_points > 0 else 0.0, 1)

    # Find optimal: best risk-adjusted (Sharpe proxy / abs(MDD)) point
    best_point = max(
        (p for p in grid if p.net_profit > 0),
        key=lambda p: p.sharpe_proxy / abs(p.max_drawdown) if abs(p.max_drawdown) > 1e-10 else 0.0,
        default=None,
    )
    optimal_size = best_point.size_multiplier if best_point else 1.0

    # Interpret
    if robustness_score >= 80:
        interp = (
            f"Highly robust: {robustness_score:.0f}% of parameter combinations are profitable. "
            f"Edge survives across a wide range of position sizes and stop levels. "
            f"Optimal risk-adjusted size: {optimal_size:.2f}x current."
        )
    elif robustness_score >= 50:
        interp = (
            f"Moderately robust: {robustness_score:.0f}% of parameter combinations are profitable. "
            f"Edge exists but is sensitive to parameter choice. Stick close to tested parameters. "
            f"Optimal risk-adjusted size: {optimal_size:.2f}x current."
        )
    elif robustness_score >= 20:
        interp = (
            f"Fragile: only {robustness_score:.0f}% of parameter combinations are profitable. "
            f"Strategy is likely overfit to specific stop/size settings. High risk of failure in live trading."
        )
    else:
        interp = (
            f"Extremely fragile: only {robustness_score:.0f}% profitable. "
            f"Strategy does not survive parameter perturbation. Almost certainly curve-fitted."
        )

    return ParameterSensitivityResult(
        n_points=total_points,
        grid=grid,
        baseline_net=round(baseline_net, 2),
        baseline_mdd=round(baseline_mdd, 2),
        robustness_score=robustness_score,
        optimal_size_mult=round(optimal_size, 2),
        interpretation=interp,
    )
