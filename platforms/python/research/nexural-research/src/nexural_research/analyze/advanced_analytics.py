"""Advanced analytics used on real trading desks.

Covers:
- Hurst Exponent (R/S analysis) — mean reversion vs trend detection
- Autocorrelation Function (ACF) — trade dependency beyond Z-score
- Rolling Correlation — regime character change detection
- Information Ratio — performance vs own historical baseline
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats as sp_stats


# ---------------------------------------------------------------------------
# Hurst Exponent (Rescaled Range Analysis)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class HurstExponentResult:
    """Hurst exponent via R/S analysis.

    H < 0.5: mean-reverting (anti-persistent)
    H = 0.5: random walk (no memory)
    H > 0.5: trending (persistent)
    """

    hurst_exponent: float
    r_squared: float  # goodness of fit of the log-log regression
    interpretation: str
    regime: str  # "mean_reverting", "random_walk", "trending"
    confidence: str  # "high", "medium", "low" based on R²


def hurst_exponent(df_trades: pd.DataFrame) -> HurstExponentResult:
    """Compute Hurst exponent using Rescaled Range (R/S) analysis.

    The R/S statistic is computed over multiple subsample sizes.
    A log-log regression of R/S vs subsample size yields H as the slope.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 20:
        return HurstExponentResult(
            hurst_exponent=0.5,
            r_squared=0.0,
            interpretation="Insufficient data for Hurst analysis (need 20+ trades)",
            regime="random_walk",
            confidence="low",
        )

    # Compute R/S for multiple subsample sizes
    # Use sizes from 10 to n//2, logarithmically spaced
    min_size = 10
    max_size = n // 2
    if max_size < min_size:
        max_size = min_size

    sizes = np.unique(np.logspace(
        np.log10(min_size),
        np.log10(max_size),
        num=min(20, max_size - min_size + 1),
    ).astype(int))
    sizes = sizes[sizes >= min_size]

    if len(sizes) < 3:
        return HurstExponentResult(
            hurst_exponent=0.5, r_squared=0.0,
            interpretation="Insufficient range of subsample sizes",
            regime="random_walk", confidence="low",
        )

    log_sizes: list[float] = []
    log_rs: list[float] = []

    for size in sizes:
        n_chunks = n // size
        if n_chunks < 1:
            continue

        rs_values = []
        for i in range(n_chunks):
            chunk = pnl[i * size : (i + 1) * size]
            mean_chunk = np.mean(chunk)
            deviations = chunk - mean_chunk
            cumulative_deviations = np.cumsum(deviations)

            r = float(np.max(cumulative_deviations) - np.min(cumulative_deviations))
            s = float(np.std(chunk, ddof=1))

            if s > 1e-10:
                rs_values.append(r / s)

        if rs_values:
            log_sizes.append(np.log(size))
            log_rs.append(np.log(np.mean(rs_values)))

    if len(log_sizes) < 3:
        return HurstExponentResult(
            hurst_exponent=0.5, r_squared=0.0,
            interpretation="Could not compute sufficient R/S statistics",
            regime="random_walk", confidence="low",
        )

    # Linear regression: log(R/S) = H * log(n) + c
    slope, intercept, r_value, p_value, std_err = sp_stats.linregress(log_sizes, log_rs)
    h = float(slope)
    r_sq = float(r_value ** 2)

    # Clamp to reasonable range
    h = max(0.0, min(1.0, h))

    # Interpret
    if h < 0.4:
        regime = "mean_reverting"
        interp = f"H={h:.3f} — Strong mean reversion. Strategy exploits price returning to mean. Edge may degrade in trending markets."
    elif h < 0.45:
        regime = "mean_reverting"
        interp = f"H={h:.3f} — Mild mean reversion. Some anti-persistent behavior in trade outcomes."
    elif h <= 0.55:
        regime = "random_walk"
        interp = f"H={h:.3f} — Near random walk. Trade outcomes show no significant serial memory."
    elif h <= 0.6:
        regime = "trending"
        interp = f"H={h:.3f} — Mild trending behavior. Wins tend to follow wins, losses follow losses."
    else:
        regime = "trending"
        interp = f"H={h:.3f} — Strong trending/momentum. Strategy exploits persistent price moves. Edge may degrade in mean-reverting markets."

    confidence = "high" if r_sq > 0.9 else ("medium" if r_sq > 0.7 else "low")

    return HurstExponentResult(
        hurst_exponent=round(h, 4),
        r_squared=round(r_sq, 4),
        interpretation=interp,
        regime=regime,
        confidence=confidence,
    )


# ---------------------------------------------------------------------------
# Autocorrelation Function (ACF)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ACFResult:
    """Autocorrelation function with significance testing."""

    lags: list[int]
    autocorrelations: list[float]
    confidence_bound: float  # 95% CI = ±1.96/sqrt(n)
    significant_lags: list[int]  # lags where |acf| > confidence bound
    has_significant_dependency: bool
    interpretation: str


def autocorrelation_analysis(
    df_trades: pd.DataFrame,
    *,
    max_lag: int = 20,
) -> ACFResult:
    """Compute autocorrelation function of trade PnL with significance bounds.

    Detects serial dependencies that the simple Z-score runs test misses.
    Significant autocorrelation at lag k means trade outcomes k steps apart
    are correlated — indicating exploitable (or dangerous) patterns.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < max_lag + 5:
        return ACFResult(
            lags=[], autocorrelations=[], confidence_bound=0.0,
            significant_lags=[], has_significant_dependency=False,
            interpretation=f"Insufficient data for ACF (need {max_lag + 5}+ trades, have {n})",
        )

    # Compute ACF manually (avoid statsmodels dependency for this)
    mean_pnl = np.mean(pnl)
    var_pnl = np.var(pnl)

    if var_pnl < 1e-10:
        return ACFResult(
            lags=list(range(1, max_lag + 1)),
            autocorrelations=[0.0] * max_lag,
            confidence_bound=0.0,
            significant_lags=[],
            has_significant_dependency=False,
            interpretation="Zero variance in PnL — all trades identical",
        )

    lags = list(range(1, max_lag + 1))
    acf_values: list[float] = []

    for lag in lags:
        if lag >= n:
            acf_values.append(0.0)
            continue
        cov = np.mean((pnl[:n - lag] - mean_pnl) * (pnl[lag:] - mean_pnl))
        acf_values.append(float(cov / var_pnl))

    # 95% confidence bound (Bartlett's formula for white noise)
    conf_bound = 1.96 / np.sqrt(n)

    significant = [lag for lag, acf in zip(lags, acf_values) if abs(acf) > conf_bound]

    if not significant:
        interp = "No significant autocorrelation detected. Trade outcomes appear independent — standard position sizing and risk models apply."
    elif len(significant) <= 2:
        sig_str = ", ".join(f"lag-{l}" for l in significant)
        interp = f"Mild dependency at {sig_str}. Consider whether recent trade outcomes should influence next trade's size."
    else:
        sig_str = ", ".join(f"lag-{l}" for l in significant[:5])
        interp = f"Strong serial dependency at {sig_str}. Trade outcomes are NOT independent — standard Kelly/position sizing assumptions may be invalid. Consider regime-adaptive sizing."

    return ACFResult(
        lags=lags,
        autocorrelations=[round(v, 4) for v in acf_values],
        confidence_bound=round(float(conf_bound), 4),
        significant_lags=significant,
        has_significant_dependency=len(significant) > 0,
        interpretation=interp,
    )


# ---------------------------------------------------------------------------
# Rolling Correlation Analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RollingCorrelationResult:
    """Rolling correlation of PnL with its own lag — detects character change."""

    window_size: int
    n_windows: int
    timestamps: list[str]  # window end timestamps
    rolling_autocorr: list[float]  # rolling lag-1 autocorrelation
    rolling_mean_pnl: list[float]  # rolling average PnL
    rolling_volatility: list[float]  # rolling PnL std dev
    rolling_win_rate: list[float]  # rolling win %
    regime_changes_detected: int
    current_autocorr: float
    interpretation: str


def rolling_correlation_analysis(
    df_trades: pd.DataFrame,
    *,
    window_size: int = 50,
) -> RollingCorrelationResult:
    """Compute rolling autocorrelation and statistics to detect regime changes.

    A shift in rolling autocorrelation signals the strategy's character is
    changing — from mean-reverting to trending or vice versa. This is an
    early warning that edge may be decaying or morphing.
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    ts_col = "exit_time" if "exit_time" in df_trades.columns else (
        "entry_time" if "entry_time" in df_trades.columns else None
    )

    if n < window_size + 10:
        return RollingCorrelationResult(
            window_size=window_size, n_windows=0,
            timestamps=[], rolling_autocorr=[], rolling_mean_pnl=[],
            rolling_volatility=[], rolling_win_rate=[],
            regime_changes_detected=0, current_autocorr=0.0,
            interpretation=f"Insufficient data (need {window_size + 10}+ trades, have {n})",
        )

    timestamps: list[str] = []
    autocorrs: list[float] = []
    mean_pnls: list[float] = []
    vols: list[float] = []
    win_rates: list[float] = []

    for i in range(window_size, n):
        window = pnl[i - window_size : i]

        # Lag-1 autocorrelation within window
        if len(window) > 2:
            var_w = np.var(window)
            if var_w > 1e-10:
                mean_w = np.mean(window)
                cov_w = np.mean((window[:-1] - mean_w) * (window[1:] - mean_w))
                ac = float(cov_w / var_w)
            else:
                ac = 0.0
        else:
            ac = 0.0

        autocorrs.append(round(ac, 4))
        mean_pnls.append(round(float(np.mean(window)), 2))
        vols.append(round(float(np.std(window, ddof=1)), 2))
        win_rates.append(round(float(np.mean(window > 0) * 100), 1))

        if ts_col and ts_col in df_trades.columns:
            ts_val = df_trades[ts_col].iloc[i]
            timestamps.append(str(ts_val) if pd.notna(ts_val) else "")
        else:
            timestamps.append(str(i))

    # Detect regime changes: sign flips in rolling autocorrelation
    regime_changes = 0
    for i in range(1, len(autocorrs)):
        if (autocorrs[i] > 0.15 and autocorrs[i - 1] < -0.15) or \
           (autocorrs[i] < -0.15 and autocorrs[i - 1] > 0.15):
            regime_changes += 1

    current_ac = autocorrs[-1] if autocorrs else 0.0

    # Interpret
    if regime_changes == 0:
        interp = f"Stable strategy character. Current autocorrelation: {current_ac:.3f}. No regime shifts detected across {len(autocorrs)} windows."
    elif regime_changes <= 2:
        interp = f"Minor character shifts ({regime_changes} detected). Strategy mostly stable but had brief regime changes. Monitor for acceleration."
    else:
        interp = f"Unstable strategy character ({regime_changes} regime changes). The strategy alternates between momentum and mean-reversion behavior. Consider regime-adaptive execution or reducing size during transitions."

    return RollingCorrelationResult(
        window_size=window_size,
        n_windows=len(autocorrs),
        timestamps=timestamps,
        rolling_autocorr=autocorrs,
        rolling_mean_pnl=mean_pnls,
        rolling_volatility=vols,
        rolling_win_rate=win_rates,
        regime_changes_detected=regime_changes,
        current_autocorr=current_ac,
        interpretation=interp,
    )


# ---------------------------------------------------------------------------
# Information Ratio (vs own baseline)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InformationRatioResult:
    """Information Ratio: consistency of returns vs own historical average.

    Unlike the textbook IR (vs external benchmark), this measures whether
    recent performance is consistently better or worse than the strategy's
    own track record — which is what PMs actually ask about.
    """

    information_ratio: float  # annualized
    active_return: float  # mean recent - mean historical (per trade)
    tracking_error: float  # std of (recent - historical average)
    recent_window: int  # trades used for "recent"
    baseline_mean: float  # historical average per trade
    recent_mean: float  # recent average per trade
    is_outperforming: bool
    interpretation: str


def information_ratio(
    df_trades: pd.DataFrame,
    *,
    recent_pct: float = 0.3,
) -> InformationRatioResult:
    """Compute Information Ratio as recent performance vs own baseline.

    Split trades into baseline (first 1-recent_pct) and recent (last recent_pct).
    IR = (mean_recent - mean_baseline) / std(recent - mean_baseline) * sqrt(ann_factor)

    This tells you: "Is my strategy getting better or worse, and is that
    change consistent or just noise?"
    """

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < 20:
        return InformationRatioResult(
            information_ratio=0.0, active_return=0.0, tracking_error=0.0,
            recent_window=0, baseline_mean=0.0, recent_mean=0.0,
            is_outperforming=False,
            interpretation="Insufficient data for Information Ratio (need 20+ trades)",
        )

    split = int(n * (1 - recent_pct))
    split = max(10, min(split, n - 5))  # ensure both halves have data

    baseline = pnl[:split]
    recent = pnl[split:]

    baseline_mean = float(np.mean(baseline))
    recent_mean = float(np.mean(recent))
    active_return = recent_mean - baseline_mean

    # Tracking error: std of active returns (each recent trade minus baseline mean)
    active_returns = recent - baseline_mean
    tracking_error = float(np.std(active_returns, ddof=1))

    # Annualize (estimate trades per year)
    ts_col = "exit_time" if "exit_time" in df_trades.columns else (
        "entry_time" if "entry_time" in df_trades.columns else None
    )
    ann_factor = 252.0
    if ts_col and ts_col in df_trades.columns and n >= 2:
        ts = pd.to_datetime(df_trades[ts_col], errors="coerce").dropna().sort_values()
        if len(ts) >= 2:
            span_days = (ts.iloc[-1] - ts.iloc[0]).total_seconds() / 86400.0
            if span_days > 0:
                trades_per_day = n / span_days
                ann_factor = max(1.0, trades_per_day * 252.0)

    ir = float(active_return / tracking_error * np.sqrt(ann_factor)) if tracking_error > 1e-10 else 0.0
    is_outperforming = recent_mean > baseline_mean

    # Interpret
    if abs(ir) < 0.5:
        interp = f"IR={ir:.2f} — Recent performance is statistically similar to baseline. No significant improvement or degradation."
    elif ir > 0:
        if ir > 1.5:
            interp = f"IR={ir:.2f} — Exceptional recent improvement. Recent avg ${recent_mean:.2f}/trade vs baseline ${baseline_mean:.2f}/trade. Verify this isn't regime-dependent."
        elif ir > 0.75:
            interp = f"IR={ir:.2f} — Solid improvement. Recent returns consistently above baseline."
        else:
            interp = f"IR={ir:.2f} — Mild improvement. Recent returns slightly above baseline but not yet statistically robust."
    else:
        if ir < -1.5:
            interp = f"IR={ir:.2f} — Severe degradation. Recent avg ${recent_mean:.2f}/trade vs baseline ${baseline_mean:.2f}/trade. Edge may be gone."
        elif ir < -0.75:
            interp = f"IR={ir:.2f} — Meaningful degradation. Recent returns consistently below baseline. Investigate cause."
        else:
            interp = f"IR={ir:.2f} — Mild degradation. Recent returns slightly below baseline. Monitor closely."

    return InformationRatioResult(
        information_ratio=round(ir, 4),
        active_return=round(active_return, 4),
        tracking_error=round(tracking_error, 4),
        recent_window=len(recent),
        baseline_mean=round(baseline_mean, 4),
        recent_mean=round(recent_mean, 4),
        is_outperforming=is_outperforming,
        interpretation=interp,
    )
