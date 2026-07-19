"""Audited time aggregation and annualization helpers.

Trade exports contain event-level dollar PnL, not regularly sampled daily
returns.  Treating each trade as a day (``sqrt(252)`` per trade) makes Sharpe
increase merely by splitting one economic trade into several fills.  These
helpers aggregate timestamped PnL to active trading days before annualizing.
When timestamps are unavailable the safe default is an unannualized
per-observation ratio; callers must explicitly supply ``periods_per_year`` to
claim an annualized statistic.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class PeriodicPnl:
    """PnL observations and the frequency used for ratio annualization."""

    values: np.ndarray
    periods_per_year: float
    basis: str


def periodic_pnl(
    frame: pd.DataFrame,
    *,
    value_col: str = "profit",
    ts_col: str = "exit_time",
    periods_per_year: float | None = None,
) -> PeriodicPnl:
    """Return consistently sampled PnL for risk-ratio calculations.

    If ``periods_per_year`` is supplied, rows are treated as observations at
    that explicit frequency.  Otherwise valid timestamps are aggregated by
    calendar date and annualized at 252 active trading days.  Without usable
    timestamps no annual frequency is inferred.
    """

    if periods_per_year is not None and periods_per_year <= 0:
        raise ValueError("periods_per_year must be positive")

    values = pd.to_numeric(frame[value_col], errors="coerce").fillna(0.0)
    if periods_per_year is not None:
        return PeriodicPnl(
            values=values.to_numpy(dtype=float),
            periods_per_year=float(periods_per_year),
            basis="explicit_observation_frequency",
        )

    selected_ts_col: str | None = ts_col
    if selected_ts_col not in frame.columns:
        selected_ts_col = "entry_time" if "entry_time" in frame.columns else None

    if selected_ts_col is not None:
        timestamps = pd.to_datetime(frame[selected_ts_col], errors="coerce")
        if bool(timestamps.isna().any()):
            raise ValueError(
                f"{selected_ts_col} contains missing or invalid timestamps; "
                "annualization would silently discard PnL"
            )
        daily = (
            pd.DataFrame({"timestamp": timestamps, "pnl": values})
            .assign(day=lambda item: item["timestamp"].dt.normalize())
            .groupby("day", sort=True)["pnl"]
            .sum()
        )
        if len(daily) >= 2:
            business_days = pd.bdate_range(daily.index.min(), daily.index.max())
            sampling_days = business_days.union(daily.index).sort_values()
            daily = daily.reindex(sampling_days, fill_value=0.0)
            return PeriodicPnl(
                values=daily.to_numpy(dtype=float),
                periods_per_year=252.0,
                basis="calendar_complete_trading_day_pnl",
            )
        return PeriodicPnl(
            # One calendar day cannot estimate day-to-day dispersion. Preserve the raw
            # observations so the caller can still report an explicitly unannualized ratio.
            values=values.to_numpy(dtype=float),
            periods_per_year=1.0,
            basis="insufficient_daily_history",
        )

    return PeriodicPnl(
        values=values.to_numpy(dtype=float),
        periods_per_year=1.0,
        basis="unannualized_observation_pnl",
    )


def annualized_sharpe(
    values: np.ndarray,
    *,
    periods_per_year: float = 1.0,
    risk_free_rate: float = 0.0,
) -> float:
    """Calculate Sharpe using a declared observation frequency."""

    observations = np.asarray(values, dtype=float)
    if len(observations) < 2:
        return 0.0
    std = float(np.std(observations, ddof=1))
    if std <= 1e-10:
        return 0.0
    excess = float(np.mean(observations)) - risk_free_rate / periods_per_year
    return float(excess / std * np.sqrt(periods_per_year))


def frame_sharpe(
    frame: pd.DataFrame,
    *,
    value_col: str = "profit",
    ts_col: str = "exit_time",
    periods_per_year: float | None = None,
    risk_free_rate: float = 0.0,
) -> float:
    """Aggregate a frame consistently and calculate its Sharpe ratio."""

    periodic = periodic_pnl(
        frame,
        value_col=value_col,
        ts_col=ts_col,
        periods_per_year=periods_per_year,
    )
    return annualized_sharpe(
        periodic.values,
        periods_per_year=periodic.periods_per_year,
        risk_free_rate=risk_free_rate,
    )
