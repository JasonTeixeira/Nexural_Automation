"""Multi-strategy comparison matrix.

Rank 2-10 strategies side-by-side across all key metrics.
Identify the best strategy, the most robust, and the most consistent.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.analyze.advanced_metrics import (
    risk_return_metrics,
    expectancy_metrics,
    institutional_metrics,
)
from nexural_research.analyze.advanced_robustness import deflated_sharpe_ratio
from nexural_research.analyze.stress_testing import parameter_sensitivity


@dataclass(frozen=True)
class StrategyRanking:
    """A single strategy's metrics for comparison."""

    session_id: str
    filename: str
    n_trades: int
    net_profit: float
    win_rate: float
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown: float
    expectancy: float
    kelly_pct: float
    recovery_factor: float
    profit_per_day: float
    robustness_score: float
    survives_deflation: bool
    overall_rank: int
    composite_score: float  # 0-100 weighted score


@dataclass(frozen=True)
class ComparisonMatrix:
    """Full comparison matrix for multiple strategies."""

    n_strategies: int
    rankings: list[StrategyRanking]
    best_overall: str  # session_id of best
    best_risk_adjusted: str
    most_robust: str
    metric_winners: dict[str, str]  # metric_name -> session_id of winner
    interpretation: str


def compare_strategies(
    strategy_data: list[tuple[str, str, pd.DataFrame]],
) -> ComparisonMatrix:
    """Compare multiple strategies and produce a ranked matrix.

    Args:
        strategy_data: list of (session_id, filename, df_trades) tuples
    """

    if len(strategy_data) < 2:
        return ComparisonMatrix(
            n_strategies=len(strategy_data),
            rankings=[],
            best_overall="",
            best_risk_adjusted="",
            most_robust="",
            metric_winners={},
            interpretation="Need at least 2 strategies to compare.",
        )

    rankings: list[dict] = []

    for session_id, filename, df in strategy_data:
        core = metrics_from_trades(df)
        rr = risk_return_metrics(df)
        exp = expectancy_metrics(df)
        inst = institutional_metrics(df)

        # Quick robustness check
        try:
            sens = parameter_sensitivity(df, size_steps=4, stop_steps=4)
            robustness = sens.robustness_score
        except Exception:
            robustness = 0.0

        # DSR check
        try:
            dsr = deflated_sharpe_ratio(df, n_trials=50)
            survives = dsr.is_significant
        except Exception:
            survives = False

        rankings.append({
            "session_id": session_id,
            "filename": filename,
            "n_trades": core.n_trades,
            "net_profit": core.net_profit,
            "win_rate": core.win_rate,
            "profit_factor": core.profit_factor if core.profit_factor != float("inf") else 999.0,
            "sharpe_ratio": rr.sharpe_ratio,
            "sortino_ratio": rr.sortino_ratio,
            "calmar_ratio": rr.calmar_ratio,
            "max_drawdown": core.max_drawdown,
            "expectancy": exp.expectancy,
            "kelly_pct": exp.kelly_pct,
            "recovery_factor": inst.recovery_factor,
            "profit_per_day": inst.profit_per_day,
            "robustness_score": robustness,
            "survives_deflation": survives,
        })

    # Compute composite score (weighted ranking)
    # Higher is better for all except max_drawdown (lower/more negative is worse)
    metrics_higher_better = [
        ("sharpe_ratio", 25),  # 25% weight
        ("sortino_ratio", 15),
        ("profit_factor", 15),
        ("net_profit", 10),
        ("win_rate", 10),
        ("recovery_factor", 10),
        ("robustness_score", 10),
        ("calmar_ratio", 5),
    ]

    n = len(rankings)
    for r in rankings:
        r["composite_score"] = 0.0

    for metric, weight in metrics_higher_better:
        values = [r[metric] for r in rankings]
        sorted_indices = np.argsort(values)[::-1]  # highest first
        for rank, idx in enumerate(sorted_indices):
            # Score: best gets 100, worst gets 0, linear interpolation
            score = (n - 1 - rank) / max(n - 1, 1) * 100
            rankings[idx]["composite_score"] += score * weight / 100

    # Sort by composite score
    rankings.sort(key=lambda r: r["composite_score"], reverse=True)
    for i, r in enumerate(rankings):
        r["overall_rank"] = i + 1
        r["composite_score"] = round(r["composite_score"], 1)

    # Find winners per metric
    metric_winners = {}
    for metric in ["net_profit", "sharpe_ratio", "sortino_ratio", "profit_factor", "win_rate", "recovery_factor", "robustness_score"]:
        best = max(rankings, key=lambda r: r[metric])
        metric_winners[metric] = best["session_id"]

    # Best overall, risk-adjusted, robust
    best_overall = rankings[0]["session_id"]
    best_risk_adj = max(rankings, key=lambda r: r["sharpe_ratio"])["session_id"]
    most_robust = max(rankings, key=lambda r: r["robustness_score"])["session_id"]

    # Interpretation
    top = rankings[0]
    interp = (
        f"#{1} {top['filename']} leads with composite score {top['composite_score']:.0f}/100 "
        f"(Sharpe {top['sharpe_ratio']:.2f}, PF {top['profit_factor']:.2f}, Win {top['win_rate']*100:.0f}%). "
    )
    if len(rankings) > 1:
        second = rankings[1]
        gap = top["composite_score"] - second["composite_score"]
        if gap < 5:
            interp += f"Very close to #{2} {second['filename']} (gap: {gap:.0f} pts). Consider running both."
        else:
            interp += f"Clear advantage over #{2} {second['filename']} (gap: {gap:.0f} pts)."

    return ComparisonMatrix(
        n_strategies=n,
        rankings=[
            StrategyRanking(**{k: v for k, v in r.items()})
            for r in rankings
        ],
        best_overall=best_overall,
        best_risk_adjusted=best_risk_adj,
        most_robust=most_robust,
        metric_winners=metric_winners,
        interpretation=interp,
    )
