"""Parameter Sweep Engine — automated optimization with overfitting detection.

Runs a strategy across a grid of parameter combinations (stop-loss, take-profit,
position size, time filters) and ranks results by risk-adjusted performance.

Includes automatic overfitting detection: if the optimal parameters are
at the edge of the grid, or if small perturbations cause large metric changes,
the result is flagged as potentially overfit.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from nexural_research.analyze.equity import max_drawdown
from nexural_research.analyze.metrics import metrics_from_trades


@dataclass(frozen=True)
class SweepPoint:
    """A single parameter combination result."""

    stop_multiplier: float
    target_multiplier: float
    size_multiplier: float
    net_profit: float
    n_trades: int
    win_rate: float
    profit_factor: float
    sharpe_proxy: float
    max_drawdown: float
    calmar_proxy: float
    composite_score: float  # 0-100 weighted


@dataclass(frozen=True)
class SweepResult:
    """Full parameter sweep results."""

    n_combinations: int
    grid: list[SweepPoint]
    optimal: SweepPoint | None
    top_5: list[SweepPoint]
    profitable_pct: float  # % of combinations that are profitable
    stability_score: float  # 0-100, how stable is performance across grid
    overfitting_risk: str  # "low", "medium", "high"
    overfitting_reasons: list[str]
    interpretation: str


def parameter_sweep(
    df_trades: pd.DataFrame,
    *,
    stop_range: tuple[float, float] = (0.5, 2.0),
    stop_steps: int = 6,
    target_range: tuple[float, float] = (0.5, 2.5),
    target_steps: int = 6,
    size_range: tuple[float, float] = (0.5, 2.0),
    size_steps: int = 4,
) -> SweepResult:
    """Run parameter sweep across stop-loss, take-profit, and position size.

    Stop multiplier: scales loss magnitude (tighter/wider stops)
    Target multiplier: scales win magnitude (smaller/larger targets)
    Size multiplier: scales all PnL (position sizing)
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 10:
        return SweepResult(
            n_combinations=0, grid=[], optimal=None, top_5=[],
            profitable_pct=0.0, stability_score=0.0,
            overfitting_risk="unknown", overfitting_reasons=["Insufficient data"],
            interpretation="Need at least 10 trades for parameter sweep.",
        )

    stop_mults = np.linspace(stop_range[0], stop_range[1], stop_steps)
    target_mults = np.linspace(target_range[0], target_range[1], target_steps)
    size_mults = np.linspace(size_range[0], size_range[1], size_steps)

    wins_mask = pnl > 0
    losses_mask = pnl < 0

    grid: list[SweepPoint] = []
    profitable_count = 0

    for stop_m in stop_mults:
        for target_m in target_mults:
            for size_m in size_mults:
                adj_pnl = pnl.copy()
                # Scale wins by target multiplier
                adj_pnl[wins_mask] = pnl[wins_mask] * target_m * size_m
                # Scale losses by stop multiplier
                adj_pnl[losses_mask] = pnl[losses_mask] * stop_m * size_m

                adj_net = float(np.sum(adj_pnl))
                adj_eq = np.cumsum(adj_pnl)
                adj_mdd = float(max_drawdown(pd.Series(adj_eq)))

                adj_wins = adj_pnl[adj_pnl > 0]
                adj_losses = adj_pnl[adj_pnl < 0]
                win_rate = float(np.mean(adj_pnl > 0))
                loss_sum = abs(float(np.sum(adj_losses)))
                pf = float(np.sum(adj_wins) / loss_sum) if loss_sum > 1e-10 else 0.0

                std = float(np.std(adj_pnl, ddof=1))
                sharpe = float(np.mean(adj_pnl) / std) if std > 1e-10 else 0.0
                calmar = float(adj_net / abs(adj_mdd)) if abs(adj_mdd) > 1e-10 else 0.0

                # Composite score: weighted blend
                score = 0.0
                if sharpe > 0:
                    score += min(sharpe * 20, 40)  # up to 40 pts
                if pf > 1:
                    score += min((pf - 1) * 15, 30)  # up to 30 pts
                if win_rate > 0.4:
                    score += min((win_rate - 0.4) * 100, 20)  # up to 20 pts
                if calmar > 0:
                    score += min(calmar * 2, 10)  # up to 10 pts

                if adj_net > 0:
                    profitable_count += 1

                grid.append(SweepPoint(
                    stop_multiplier=round(float(stop_m), 2),
                    target_multiplier=round(float(target_m), 2),
                    size_multiplier=round(float(size_m), 2),
                    net_profit=round(adj_net, 2),
                    n_trades=n,
                    win_rate=round(win_rate, 4),
                    profit_factor=round(pf, 4) if np.isfinite(pf) else 0.0,
                    sharpe_proxy=round(sharpe, 4),
                    max_drawdown=round(adj_mdd, 2),
                    calmar_proxy=round(calmar, 4),
                    composite_score=round(score, 1),
                ))

    total = len(grid)
    profitable_pct = round(profitable_count / total * 100, 1) if total > 0 else 0.0

    # Sort by composite score
    grid.sort(key=lambda p: p.composite_score, reverse=True)
    optimal = grid[0] if grid else None
    top_5 = grid[:5]

    # Stability: std of composite scores / mean
    scores = [p.composite_score for p in grid]
    mean_score = float(np.mean(scores)) if scores else 0
    std_score = float(np.std(scores)) if scores else 0
    stability = round(100 - min(std_score / max(mean_score, 1) * 100, 100), 1)

    # Overfitting detection
    overfit_reasons: list[str] = []
    overfit_risk = "low"

    if optimal:
        # Check if optimal is at edge of grid
        if optimal.stop_multiplier in (stop_range[0], stop_range[1]):
            overfit_reasons.append("Optimal stop multiplier is at grid boundary — may not be true optimum")
        if optimal.target_multiplier in (target_range[0], target_range[1]):
            overfit_reasons.append("Optimal target multiplier is at grid boundary")
        if optimal.size_multiplier in (size_range[0], size_range[1]):
            overfit_reasons.append("Optimal size multiplier is at grid boundary")

        # Check if top 5 are clustered or scattered
        if len(top_5) >= 3:
            stop_spread = max(p.stop_multiplier for p in top_5) - min(p.stop_multiplier for p in top_5)
            target_spread = max(p.target_multiplier for p in top_5) - min(p.target_multiplier for p in top_5)
            if stop_spread > (stop_range[1] - stop_range[0]) * 0.6:
                overfit_reasons.append("Top results scattered across stop range — parameter sensitivity detected")
            if target_spread > (target_range[1] - target_range[0]) * 0.6:
                overfit_reasons.append("Top results scattered across target range — parameter sensitivity detected")

    if profitable_pct < 30:
        overfit_reasons.append(f"Only {profitable_pct:.0f}% of combinations profitable — narrow edge")

    if stability < 30:
        overfit_reasons.append(f"Low stability score ({stability:.0f}/100) — high sensitivity to parameters")

    if len(overfit_reasons) >= 3:
        overfit_risk = "high"
    elif len(overfit_reasons) >= 1:
        overfit_risk = "medium"

    # Interpretation
    if optimal:
        interp = (
            f"Best parameters: Stop {optimal.stop_multiplier}x, Target {optimal.target_multiplier}x, Size {optimal.size_multiplier}x "
            f"(Score: {optimal.composite_score:.0f}/100, Sharpe: {optimal.sharpe_proxy:.2f}, PF: {optimal.profit_factor:.2f}). "
            f"{profitable_pct:.0f}% of {total} combinations profitable. "
            f"Stability: {stability:.0f}/100. Overfitting risk: {overfit_risk}."
        )
    else:
        interp = "No valid parameter combinations found."

    return SweepResult(
        n_combinations=total,
        grid=grid,
        optimal=optimal,
        top_5=top_5,
        profitable_pct=profitable_pct,
        stability_score=stability,
        overfitting_risk=overfit_risk,
        overfitting_reasons=overfit_reasons,
        interpretation=interp,
    )
