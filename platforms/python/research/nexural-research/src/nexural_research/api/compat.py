"""Response compatibility adapters for v0 frontend.

Transforms backend dataclass responses into the shapes expected
by the v0 Next.js frontend TypeScript interfaces.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def adapt_metrics(raw: dict, df: pd.DataFrame) -> dict:
    """Adapt TradeMetrics to v0 BasicMetrics interface."""
    pnl = pd.to_numeric(df["profit"], errors="coerce").fillna(0.0)
    wins = pnl[pnl > 0]
    losses = pnl[pnl < 0]

    return {
        "total_trades": raw.get("n_trades", 0),
        "n_trades": raw.get("n_trades", 0),  # keep original too
        "winning_trades": int(len(wins)),
        "losing_trades": int(len(losses)),
        "win_rate": raw.get("win_rate", 0),
        "gross_profit": raw.get("gross_profit", 0),
        "gross_loss": raw.get("gross_loss", 0),
        "net_profit": raw.get("net_profit", 0),
        "profit_factor": raw.get("profit_factor", 0),
        "max_drawdown": raw.get("max_drawdown", 0),
        "max_drawdown_pct": 0.0,  # would need starting capital to compute
        "avg_winner": raw.get("avg_win", 0),
        "avg_loser": raw.get("avg_loss", 0),
        "avg_win": raw.get("avg_win", 0),
        "avg_loss": raw.get("avg_loss", 0),
        "largest_winner": float(wins.max()) if len(wins) > 0 else 0.0,
        "largest_loser": float(losses.min()) if len(losses) > 0 else 0.0,
        "avg_trade": raw.get("avg_trade", 0),
        "avg_bars_in_trade": 0,  # not available from NinjaTrader CSV
        "ulcer_index": raw.get("ulcer_index", 0),
    }


def adapt_sessions(raw: dict, sessions_store: dict | None = None) -> dict:
    """Adapt sessions dict to v0 sessions array format."""
    from datetime import datetime, timezone
    sessions_list = []
    for sid, info in raw.items():
        # Get created_at from the full session store if available
        created_at = ""
        if sessions_store and sid in sessions_store:
            ts = sessions_store[sid].get("created_at")
            if ts:
                created_at = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        sessions_list.append({
            "session_id": sid,
            "kind": info.get("kind", "trades"),
            "filename": info.get("filename", ""),
            "n_rows": info.get("n_rows", 0),
            "created_at": created_at or datetime.now(timezone.utc).isoformat(),
        })
    return {"sessions": sessions_list}


def adapt_equity_chart(raw: dict) -> dict:
    """Adapt equity chart — rename pnl to trade_pnl for v0."""
    return {
        "timestamps": raw.get("timestamps", []),
        "equity": raw.get("equity", []),
        "drawdown": raw.get("drawdown", []),
        "trade_pnl": raw.get("pnl", []),
        "pnl": raw.get("pnl", []),  # keep original too
    }


def adapt_distribution_chart(raw: dict, dist_metrics: dict | None = None) -> dict:
    """Adapt distribution chart — rename centers to bins, add var/cvar."""
    return {
        "bins": raw.get("centers", []),
        "centers": raw.get("centers", []),  # keep original
        "counts": raw.get("counts", []),
        "edges": raw.get("edges", []),
        "var_95": dist_metrics.get("var_95", 0) if dist_metrics else 0,
        "cvar_95": dist_metrics.get("cvar_95", 0) if dist_metrics else 0,
    }


def adapt_trades_list(raw: list) -> dict:
    """Wrap trades array in object for v0."""
    return {"trades": raw}


def adapt_improvements(raw: dict) -> dict:
    """Adapt improvements report to v0 ImprovementsResult interface."""
    recs = raw.get("recommendations", [])
    adapted_recs = []
    for r in recs:
        adapted_recs.append({
            "category": r.get("category", ""),
            "priority": r.get("priority", "medium"),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "current_value": r.get("current_value", ""),
            "target_value": r.get("suggested_value", ""),
            "suggested_value": r.get("suggested_value", ""),
            "impact": r.get("expected_impact", ""),
            "expected_impact": r.get("expected_impact", ""),
            "confidence": r.get("confidence", "medium"),
        })

    return {
        "grade": raw.get("overall_grade", "C"),
        "overall_grade": raw.get("overall_grade", "C"),
        "score": 0,  # not computed by backend
        "breakdown": {
            "profitability": 0,
            "risk_management": 0,
            "consistency": 0,
            "edge_quality": 0,
        },
        "improvements": adapted_recs,
        "recommendations": adapted_recs,
        "summary": raw.get("grade_explanation", ""),
        "grade_explanation": raw.get("grade_explanation", ""),
        "time_filter": raw.get("time_filter"),
        "drawdown_recovery": raw.get("drawdown_recovery"),
        "loss_clusters": raw.get("loss_clusters"),
        "mae_mfe": raw.get("mae_mfe"),
        "commission_impact_pct": raw.get("commission_impact_pct", 0),
        "filtered_improvement": raw.get("filtered_improvement", {}),
    }


def adapt_regime(raw: dict) -> dict:
    """Adapt regime analysis to v0 RegimeResult interface."""
    labels = raw.get("regime_labels", [])
    counts = raw.get("regime_counts", [])
    avg_pnls = raw.get("regime_avg_pnl", [])
    win_rates = raw.get("regime_win_rate", [])
    sharpes = raw.get("regime_sharpe", [])
    drawdowns = raw.get("regime_avg_drawdown", [])

    regimes = []
    for i in range(len(labels)):
        regimes.append({
            "regime": labels[i] if i < len(labels) else "",
            "n_trades": counts[i] if i < len(counts) else 0,
            "total_pnl": round(avg_pnls[i] * counts[i], 2) if i < len(avg_pnls) and i < len(counts) else 0,
            "avg_pnl": avg_pnls[i] if i < len(avg_pnls) else 0,
            "win_rate": win_rates[i] if i < len(win_rates) else 0,
            "sharpe": sharpes[i] if i < len(sharpes) else 0,
            "max_drawdown": drawdowns[i] if i < len(drawdowns) else 0,
        })

    return {
        "regimes": regimes,
        "n_regimes": raw.get("n_regimes", 0),
        "regime_labels": labels,
        "current_regime": raw.get("current_regime", "unknown"),
        "interpretation": raw.get("interpretation", ""),
    }


def adapt_monte_carlo(raw: dict) -> dict:
    """Adapt parametric MC to v0 MonteCarloResult interface."""
    return {
        "n_simulations": raw.get("n_simulations", 0),
        "n_trades_per_sim": raw.get("n_trades_per_sim", 0),
        "distribution": raw.get("distribution", "empirical"),
        "final_equities": [],  # not returned by backend (too large)
        "percentiles": {
            "p5": raw.get("final_equity_p05", 0),
            "p25": raw.get("final_equity_p25", 0),
            "p50": raw.get("final_equity_p50", 0),
            "p75": raw.get("final_equity_p75", 0),
            "p95": raw.get("final_equity_p95", 0),
        },
        "probability_of_profit": raw.get("prob_profitable", 0),
        "expected_final_equity": raw.get("final_equity_mean", 0),
        "final_equity_mean": raw.get("final_equity_mean", 0),
        "final_equity_std": raw.get("final_equity_std", 0),
        "mdd_mean": raw.get("mdd_mean", 0),
        "mdd_p50": raw.get("mdd_p50", 0),
        "mdd_p95": raw.get("mdd_p95", 0),
        "mdd_p99": raw.get("mdd_p99", 0),
        "prob_drawdown_50pct": raw.get("prob_drawdown_50pct", 0),
    }


def adapt_deflated_sharpe(raw: dict) -> dict:
    """Adapt DSR to v0 DeflatedSharpeResult interface."""
    return {
        "observed_sharpe": raw.get("observed_sharpe", 0),
        "expected_max_sharpe": raw.get("expected_max_sharpe", 0),
        "deflated_sharpe": raw.get("deflated_sharpe", 0),
        "p_value": raw.get("p_value", 1.0),
        "n_trials": raw.get("n_trials_assumed", 100),
        "n_trials_assumed": raw.get("n_trials_assumed", 100),
        "var_sharpe": 0,
        "skew_returns": 0,
        "kurt_returns": 0,
        "survives_deflation": raw.get("is_significant", False),
        "is_significant": raw.get("is_significant", False),
        "interpretation": raw.get("interpretation", ""),
    }


def adapt_walk_forward(raw: dict) -> dict:
    """Adapt rolling walk-forward to v0 frontend expectations.

    Frontend expects: walk_forward_efficiency, folds[] with is_sharpe/oos_sharpe
    Backend returns: walk_forward_efficiency, windows[] with in_sample_sharpe/out_sample_sharpe
    """
    windows = raw.get("windows", [])
    folds = []
    for w in windows:
        folds.append({
            "window_id": w.get("window_id", 0),
            "is_start": w.get("in_sample_start", ""),
            "is_end": w.get("in_sample_end", ""),
            "oos_start": w.get("out_sample_start", ""),
            "oos_end": w.get("out_sample_end", ""),
            "is_n": w.get("in_sample_n", 0),
            "oos_n": w.get("out_sample_n", 0),
            "is_profit": w.get("in_sample_net", 0),
            "oos_profit": w.get("out_sample_net", 0),
            "is_sharpe": w.get("in_sample_sharpe", 0),
            "oos_sharpe": w.get("out_sample_sharpe", 0),
            "is_return": w.get("in_sample_net", 0),
            "oos_return": w.get("out_sample_net", 0),
            "efficiency": w.get("efficiency", 0),
            # Keep original fields too
            **w,
        })

    return {
        "n_windows": raw.get("n_windows", 0),
        "in_sample_pct": raw.get("in_sample_pct", 0.7),
        "anchored": raw.get("anchored", False),
        "windows": folds,
        "folds": folds,  # v0 alias
        "walk_forward_efficiency": raw.get("walk_forward_efficiency", 0),
        "aggregate_efficiency": raw.get("avg_efficiency", 0),
        "avg_efficiency": raw.get("avg_efficiency", 0),
        "efficiency_std": raw.get("efficiency_std", 0),
        "aggregate_oos_net": raw.get("aggregate_oos_net", 0),
        "aggregate_oos_sharpe": raw.get("aggregate_oos_sharpe", 0),
        "is_total_profit": raw.get("aggregate_oos_net", 0),  # v0 alias
        "oos_total_profit": raw.get("aggregate_oos_net", 0),
        "pct_profitable_oos": raw.get("pct_profitable_oos", 0),
        "interpretation": f"Walk-forward efficiency: {raw.get('walk_forward_efficiency', 0):.2%}. "
                          f"{raw.get('pct_profitable_oos', 0):.0f}% of OOS windows profitable.",
    }


def adapt_block_bootstrap(raw: dict) -> dict:
    """Adapt block bootstrap to v0 MonteCarloResult interface."""
    return {
        "n_simulations": raw.get("n_simulations", 0),
        "block_size": raw.get("block_size", 0),
        "final_equities": [],
        "percentiles": {
            "p5": raw.get("net_profit_p05", 0),
            "p25": 0,
            "p50": 0,
            "p75": 0,
            "p95": raw.get("net_profit_p95", 0),
        },
        "probability_of_profit": 0,
        "expected_final_equity": 0,
        "sharpe_mean": raw.get("sharpe_mean", 0),
        "sharpe_std": raw.get("sharpe_std", 0),
        "sharpe_p05": raw.get("sharpe_p05", 0),
        "sharpe_p95": raw.get("sharpe_p95", 0),
        "sharpe_ci_lower": raw.get("sharpe_ci_lower", 0),
        "sharpe_ci_upper": raw.get("sharpe_ci_upper", 0),
        "net_profit_p05": raw.get("net_profit_p05", 0),
        "net_profit_p95": raw.get("net_profit_p95", 0),
        "mdd_p50": raw.get("mdd_p50", 0),
        "mdd_p95": raw.get("mdd_p95", 0),
    }


def adapt_heatmap(raw: dict) -> dict:
    """Adapt heatmap — add counts matrix for v0."""
    values = raw.get("values", [])
    # Generate counts (approximate: non-zero values suggest trades occurred)
    counts = []
    for row in values:
        counts.append([1 if v != 0 else 0 for v in row])

    return {
        "days": raw.get("days", []),
        "hours": raw.get("hours", []),
        "values": values,
        "counts": counts,
    }
