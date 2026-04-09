"""Chart data endpoints for frontend visualization."""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Query

from nexural_research.api.auth import require_auth

from nexural_research.analyze.equity import drawdown_from_equity, equity_curve_from_trades
from nexural_research.analyze.heatmap import time_heatmap
from nexural_research.api.sessions import get_trades

from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.api.compat import adapt_distribution_chart, adapt_equity_chart, adapt_heatmap, adapt_trades_list

router = APIRouter(tags=["charts"], dependencies=[Depends(require_auth)])


@router.get("/charts/equity")
def get_equity_curve(session_id: str = Query(default="default")):
    """Equity curve data for charting."""
    df = get_trades(session_id)
    eq = equity_curve_from_trades(df)
    dd = drawdown_from_equity(eq.equity)
    raw = {
        "timestamps": eq.ts.dt.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
        "equity": eq.equity.round(2).tolist(),
        "pnl": eq.pnl.round(2).tolist(),
        "drawdown": dd.round(2).tolist(),
    }
    return adapt_equity_chart(raw)


@router.get("/charts/heatmap")
def get_heatmap(session_id: str = Query(default="default"), agg: str = Query(default="sum")):
    """PnL heatmap data (day-of-week x hour)."""
    df = get_trades(session_id)
    ts_col = "exit_time" if "exit_time" in df.columns else "entry_time"
    heat = time_heatmap(df, ts_col=ts_col, agg=agg)
    raw = {
        "days": heat.index.tolist(),
        "hours": [int(h) for h in heat.columns.tolist()],
        "values": heat.round(2).values.tolist(),
    }
    return adapt_heatmap(raw)


@router.get("/charts/distribution")
def get_pnl_distribution(session_id: str = Query(default="default"), bins: int = Query(default=50, ge=5, le=1000)):
    """PnL histogram data for distribution chart."""
    df = get_trades(session_id)
    pnl = pd.to_numeric(df["profit"], errors="coerce").fillna(0.0).to_numpy()
    counts, edges = np.histogram(pnl, bins=bins)
    centers = [(edges[i] + edges[i + 1]) / 2 for i in range(len(edges) - 1)]
    raw = {
        "centers": [round(c, 2) for c in centers],
        "counts": counts.tolist(),
        "edges": [round(e, 2) for e in edges.tolist()],
    }
    # Add VaR/CVaR from distribution metrics
    from nexural_research.analyze.advanced_metrics import distribution_metrics
    dist = distribution_metrics(get_trades(session_id))
    return adapt_distribution_chart(raw, {"var_95": dist.var_95, "cvar_95": dist.cvar_95})


@router.get("/charts/trades")
def get_trades_data(session_id: str = Query(default="default"), limit: int = Query(default=500, ge=1, le=10000)):
    """Raw trades data for the trades table."""
    df = get_trades(session_id)
    trades = json.loads(df.head(limit).to_json(orient="records", date_format="iso"))
    return adapt_trades_list(trades)


@router.get("/charts/rolling-metrics")
def get_rolling_metrics(
    session_id: str = Query(default="default"),
    window: int = Query(default=20, ge=5, le=200),
):
    """Rolling window metrics for time-series charting (Sharpe, win rate, PF over time)."""
    df = get_trades(session_id)
    pnl = pd.to_numeric(df["profit"], errors="coerce").fillna(0.0)
    n = len(pnl)

    if n < window:
        return {"window": window, "n_points": 0, "timestamps": [], "rolling_sharpe": [], "rolling_win_rate": [], "rolling_avg_pnl": []}

    ts_col = "exit_time" if "exit_time" in df.columns else ("entry_time" if "entry_time" in df.columns else None)
    timestamps = []
    sharpes = []
    win_rates = []
    avg_pnls = []

    for i in range(window, n):
        w = pnl.iloc[i - window : i].to_numpy()
        std = float(np.std(w, ddof=1))
        sharpes.append(round(float(np.mean(w) / std) if std > 1e-10 else 0.0, 4))
        win_rates.append(round(float(np.mean(w > 0) * 100), 1))
        avg_pnls.append(round(float(np.mean(w)), 2))
        if ts_col and ts_col in df.columns:
            ts_val = df[ts_col].iloc[i]
            timestamps.append(str(ts_val) if pd.notna(ts_val) else str(i))
        else:
            timestamps.append(str(i))

    return {
        "window": window,
        "n_points": len(sharpes),
        "timestamps": timestamps,
        "rolling_sharpe": sharpes,
        "rolling_win_rate": win_rates,
        "rolling_avg_pnl": avg_pnls,
    }


@router.get("/charts/drawdowns")
def get_drawdown_periods(session_id: str = Query(default="default")):
    """Drawdown periods with depth, duration, and recovery info."""
    df = get_trades(session_id)
    eq = equity_curve_from_trades(df)
    dd = drawdown_from_equity(eq.equity)

    pnl = eq.pnl.to_numpy()
    dd_arr = dd.to_numpy()
    n = len(dd_arr)

    periods = []
    start = None
    for i in range(n):
        if dd_arr[i] < -1e-10 and start is None:
            start = i
        elif (dd_arr[i] >= -1e-10 or i == n - 1) and start is not None:
            end = i if dd_arr[i] >= -1e-10 else i + 1
            depth = float(np.min(dd_arr[start:end]))
            periods.append({
                "start_index": start,
                "end_index": end - 1,
                "duration_trades": end - start,
                "depth": round(depth, 2),
                "recovered": bool(dd_arr[i] >= -1e-10) if i < n else False,
            })
            start = None

    return {
        "n_drawdowns": len(periods),
        "current_drawdown": round(float(dd_arr[-1]), 2) if n > 0 else 0.0,
        "deepest": round(float(np.min(dd_arr)), 2) if n > 0 else 0.0,
        "periods": periods[:50],  # cap for serialization
    }
