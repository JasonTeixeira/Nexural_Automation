from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class EquitySeries:
    ts: pd.Series
    equity: pd.Series
    pnl: pd.Series


def equity_curve_from_trades(df_trades: pd.DataFrame) -> EquitySeries:
    """Compute equity curve from Trades export.

    Requirements:
    - profit column (currency)
    - exit_time or entry_time for ordering
    """

    df = df_trades.copy()
    if "profit" not in df.columns:
        raise ValueError("trades dataframe missing required column: profit")

    # Choose best available time column.
    ts_col = (
        "exit_time"
        if "exit_time" in df.columns
        else ("entry_time" if "entry_time" in df.columns else None)
    )
    if not ts_col:
        raise ValueError("trades dataframe missing required column: exit_time or entry_time")
    df = df.dropna(subset=[ts_col])
    df = df.sort_values(ts_col, kind="mergesort")

    pnl = pd.to_numeric(df["profit"], errors="coerce").fillna(0.0)
    equity = pnl.cumsum()
    ts = pd.to_datetime(df[ts_col], errors="coerce")

    return EquitySeries(
        ts=ts.reset_index(drop=True),
        equity=equity.reset_index(drop=True),
        pnl=pnl.reset_index(drop=True),
    )


def drawdown_from_equity(equity: pd.Series) -> pd.Series:
    """Compute drawdown series from equity curve."""

    eq = pd.to_numeric(equity, errors="coerce").fillna(0.0)
    peak = eq.cummax()
    dd = eq - peak
    return dd


def max_drawdown(equity: pd.Series) -> float:
    dd = drawdown_from_equity(equity)
    mdd = float(dd.min()) if len(dd) else 0.0
    return mdd


def ulcer_index(equity: pd.Series) -> float:
    """Ulcer index using drawdown percentage vs peak.

    If equity never gets positive, falls back to 0.
    """

    eq = pd.to_numeric(equity, errors="coerce").fillna(0.0)
    peak = eq.cummax()
    if eq.empty:
        return 0.0

    eq_values = eq.to_numpy(dtype=float)
    peak_values = peak.to_numpy(dtype=float)
    pct_dd = np.zeros_like(eq_values)
    with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
        np.divide(
            eq_values - peak_values,
            peak_values,
            out=pct_dd,
            where=peak_values > 0,
        )
    pct_dd = np.nan_to_num(
        pct_dd,
        nan=0.0,
        posinf=np.finfo(float).max,
        neginf=-np.finfo(float).max,
    )

    # Scale before squaring so valid but extreme floating-point inputs cannot
    # overflow the RMS calculation.
    scale = float(np.max(np.abs(pct_dd)))
    if scale == 0.0:
        return 0.0
    normalized_rms = float(np.sqrt(np.mean(np.square(pct_dd / scale))))
    return scale * normalized_rms
