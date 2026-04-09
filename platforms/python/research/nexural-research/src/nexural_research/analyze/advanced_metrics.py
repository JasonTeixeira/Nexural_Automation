"""Institutional-grade risk/return metrics for strategy evaluation.

Covers: Sharpe, Sortino, Calmar, Omega, MAR, Tail ratio, expectancy,
Kelly Criterion, trade dependency (Z-score & serial correlation),
return distribution statistics, and time-decay analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, fields

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

from nexural_research.analyze.equity import (
    max_drawdown,
)


# ---------------------------------------------------------------------------
# Risk-adjusted return ratios
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RiskReturnMetrics:
    """Core risk-adjusted return ratios used by institutional allocators."""

    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    omega_ratio: float
    mar_ratio: float
    tail_ratio: float
    gain_to_pain_ratio: float
    common_sense_ratio: float
    cpc_ratio: float  # CPC = Profit Factor * Win Rate * (Avg Win / Avg Loss)
    risk_of_ruin: float


def _annualize_factor(df_trades: pd.DataFrame, ts_col: str = "exit_time") -> float:
    """Estimate annualization factor from trade timestamps."""
    if ts_col not in df_trades.columns:
        ts_col = "entry_time" if "entry_time" in df_trades.columns else None
    if ts_col is None or len(df_trades) < 2:
        return 252.0  # default daily assumption

    ts = pd.to_datetime(df_trades[ts_col], errors="coerce").dropna().sort_values()
    if len(ts) < 2:
        return 252.0

    span_days = (ts.iloc[-1] - ts.iloc[0]).total_seconds() / 86400.0
    if span_days <= 0:
        return 252.0
    trades_per_day = len(ts) / span_days
    return max(1.0, trades_per_day * 252.0)


def risk_return_metrics(
    df_trades: pd.DataFrame,
    *,
    risk_free_rate: float = 0.0,
    mar_threshold: float = 0.0,
) -> RiskReturnMetrics:
    """Compute institutional risk/return metrics from a trades DataFrame."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n == 0:
        return RiskReturnMetrics(**{f.name: 0.0 for f in fields(RiskReturnMetrics)})

    # Single trade: metrics are undefined (avoid exploding Sharpe)
    if n == 1:
        return RiskReturnMetrics(**{f.name: 0.0 for f in fields(RiskReturnMetrics)})

    ann_factor = _annualize_factor(df_trades)
    mean_ret = float(np.mean(pnl))
    std_ret = float(np.std(pnl, ddof=1)) if n > 1 else 1e-10

    # Sharpe Ratio (annualized)
    excess = mean_ret - risk_free_rate / ann_factor
    sharpe = float(excess / std_ret * np.sqrt(ann_factor)) if std_ret > 1e-10 else 0.0

    # Sortino Ratio — industry standard: use ALL returns with np.minimum
    downside_diff = np.minimum(pnl - mar_threshold, 0.0)
    downside_std = float(np.sqrt(np.mean(downside_diff ** 2))) if n > 0 else 1e-10
    sortino = float((mean_ret - mar_threshold) / downside_std * np.sqrt(ann_factor)) if downside_std > 1e-10 else 0.0

    # Calmar Ratio
    eq = pd.Series(pnl).cumsum()
    mdd = abs(max_drawdown(eq))
    total_return = float(eq.iloc[-1]) if len(eq) > 0 else 0.0
    calmar = float(total_return / mdd) if mdd > 1e-10 else 0.0

    # Omega Ratio: sum(gains above threshold) / sum(losses below threshold)
    gains_above = pnl[pnl > mar_threshold] - mar_threshold
    losses_below = mar_threshold - pnl[pnl < mar_threshold]
    omega = (
        float(np.sum(gains_above) / np.sum(losses_below))
        if np.sum(losses_below) > 1e-10
        else float("inf") if np.sum(gains_above) > 0 else 0.0
    )

    # MAR Ratio (Managed Account Reports): annualized return / max drawdown
    mar = calmar  # equivalent formulation for trade-level data

    # Tail Ratio: ratio of right tail (95th percentile) to left tail (5th percentile)
    p95 = float(np.percentile(pnl, 95))
    p05 = abs(float(np.percentile(pnl, 5)))
    tail = float(p95 / p05) if p05 > 1e-10 else float("inf") if p95 > 0 else 0.0

    # Gain-to-Pain Ratio: sum of all returns / sum of absolute negative returns
    neg_sum = float(np.sum(np.abs(pnl[pnl < 0])))
    gtp = float(np.sum(pnl) / neg_sum) if neg_sum > 1e-10 else float("inf") if total_return > 0 else 0.0

    # Common Sense Ratio: tail ratio * profit factor
    wins = pnl[pnl > 0]
    losses = pnl[pnl < 0]
    loss_sum = abs(float(np.sum(losses)))
    win_sum = float(np.sum(wins))
    profit_factor = float(win_sum / loss_sum) if loss_sum > 1e-10 else (float("inf") if win_sum > 0 else 0.0)
    common_sense = tail * profit_factor if np.isfinite(tail) and np.isfinite(profit_factor) else 0.0

    # CPC Ratio
    win_rate = float(np.sum(pnl > 0) / n) if n > 0 else 0.0
    avg_win = float(np.mean(wins)) if len(wins) > 0 else 0.0
    avg_loss = abs(float(np.mean(losses))) if len(losses) > 0 else 1e-10
    cpc = profit_factor * win_rate * (avg_win / avg_loss) if avg_loss > 1e-10 else 0.0

    # Risk of Ruin (simplified formula)
    if win_rate > 0 and win_rate < 1 and avg_loss > 1e-10:
        edge = win_rate * avg_win - (1 - win_rate) * avg_loss
        if edge > 0:
            a = (1 - win_rate) / win_rate
            risk_of_ruin = max(0.0, min(1.0, a ** 20))  # 20 units of capital
        else:
            risk_of_ruin = 1.0
    else:
        risk_of_ruin = 0.0 if win_rate >= 1.0 else 1.0

    return RiskReturnMetrics(
        sharpe_ratio=round(sharpe, 4),
        sortino_ratio=round(sortino, 4),
        calmar_ratio=round(calmar, 4),
        omega_ratio=round(omega, 4) if np.isfinite(omega) else float("inf"),
        mar_ratio=round(mar, 4),
        tail_ratio=round(tail, 4) if np.isfinite(tail) else float("inf"),
        gain_to_pain_ratio=round(gtp, 4) if np.isfinite(gtp) else float("inf"),
        common_sense_ratio=round(common_sense, 4),
        cpc_ratio=round(cpc, 4),
        risk_of_ruin=round(risk_of_ruin, 6),
    )


# ---------------------------------------------------------------------------
# Expectancy & edge decomposition
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ExpectancyMetrics:
    """Per-trade edge decomposition."""

    expectancy: float  # average $ per trade
    expectancy_ratio: float  # expectancy / avg loss
    payoff_ratio: float  # avg win / avg loss
    edge_ratio: float  # (win_rate * payoff) - (1 - win_rate)
    kelly_pct: float  # optimal fraction of capital per trade
    half_kelly_pct: float  # conservative half-Kelly
    optimal_f: float  # Ralph Vince optimal f


def expectancy_metrics(df_trades: pd.DataFrame) -> ExpectancyMetrics:
    """Compute expectancy and Kelly Criterion from trade data."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n == 0:
        return ExpectancyMetrics(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    wins = pnl[pnl > 0]
    losses = pnl[pnl < 0]
    win_rate = float(np.sum(pnl > 0) / n)
    loss_rate = 1.0 - win_rate

    avg_win = float(np.mean(wins)) if len(wins) > 0 else 0.0
    avg_loss = abs(float(np.mean(losses))) if len(losses) > 0 else 1e-10

    expectancy = float(np.mean(pnl))
    expectancy_ratio = expectancy / avg_loss if avg_loss > 1e-10 else 0.0
    payoff_ratio = avg_win / avg_loss if avg_loss > 1e-10 else float("inf")

    # Edge ratio
    edge = win_rate * payoff_ratio - loss_rate

    # Kelly Criterion: f* = (bp - q) / b where b = payoff ratio, p = win rate, q = loss rate
    if payoff_ratio > 1e-10 and np.isfinite(payoff_ratio):
        kelly = (win_rate * payoff_ratio - loss_rate) / payoff_ratio
    else:
        kelly = 0.0
    kelly = max(0.0, kelly)  # never recommend negative sizing

    # Optimal f (Ralph Vince): f that maximizes geometric growth
    max_loss = abs(float(np.min(pnl))) if len(pnl) > 0 else 1e-10
    if max_loss > 1e-10:
        best_f = 0.0
        best_twr = 1.0
        for f_test in np.arange(0.01, 1.0, 0.01):
            hpr = 1.0 + f_test * (pnl / max_loss)
            if np.any(hpr <= 0):
                break  # f too large — would have gone bankrupt
            twr = float(np.prod(hpr) ** (1.0 / n))  # geometric mean of HPR
            if twr > best_twr:
                best_twr = twr
                best_f = f_test
        optimal_f = best_f
    else:
        optimal_f = 0.0

    return ExpectancyMetrics(
        expectancy=round(expectancy, 4),
        expectancy_ratio=round(expectancy_ratio, 4),
        payoff_ratio=round(payoff_ratio, 4) if np.isfinite(payoff_ratio) else float("inf"),
        edge_ratio=round(edge, 4),
        kelly_pct=round(kelly * 100, 2),
        half_kelly_pct=round(kelly * 50, 2),
        optimal_f=round(optimal_f, 4),
    )


# ---------------------------------------------------------------------------
# Trade dependency analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TradeDependencyMetrics:
    """Measures whether trade outcomes are serially dependent."""

    z_score: float  # Z-score of streaks (>1.96 or <-1.96 = significant)
    z_interpretation: str
    serial_correlation: float  # lag-1 autocorrelation of returns
    serial_p_value: float
    streak_max_wins: int
    streak_max_losses: int
    streak_avg_wins: float
    streak_avg_losses: float


def trade_dependency_analysis(df_trades: pd.DataFrame) -> TradeDependencyMetrics:
    """Analyze serial dependency in trade outcomes (wins/losses)."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n < 10:
        return TradeDependencyMetrics(
            z_score=0.0, z_interpretation="insufficient data",
            serial_correlation=0.0, serial_p_value=1.0,
            streak_max_wins=0, streak_max_losses=0,
            streak_avg_wins=0.0, streak_avg_losses=0.0,
        )

    # Binary win/loss sequence
    wl = (pnl > 0).astype(int)
    n_wins = int(np.sum(wl))
    n_losses = n - n_wins

    # Count runs (streaks)
    runs = 1
    for i in range(1, n):
        if wl[i] != wl[i - 1]:
            runs += 1

    # Z-score of runs test
    if n_wins > 0 and n_losses > 0:
        expected_runs = 1.0 + (2.0 * n_wins * n_losses) / n
        var_runs = (2.0 * n_wins * n_losses * (2.0 * n_wins * n_losses - n)) / (n * n * (n - 1.0))
        std_runs = np.sqrt(var_runs) if var_runs > 0 else 1e-10
        z_score = (runs - expected_runs) / std_runs
    else:
        z_score = 0.0

    if abs(z_score) > 2.576:
        z_interp = "highly significant dependency (p<0.01)"
    elif abs(z_score) > 1.96:
        z_interp = "significant dependency (p<0.05)"
    elif abs(z_score) > 1.645:
        z_interp = "marginal dependency (p<0.10)"
    else:
        z_interp = "no significant dependency (trades appear independent)"

    # Serial correlation (lag-1 autocorrelation)
    if n > 2:
        lag1_corr, lag1_p = sp_stats.pearsonr(pnl[:-1], pnl[1:])
    else:
        lag1_corr, lag1_p = 0.0, 1.0

    # Streak analysis
    win_streaks: list[int] = []
    loss_streaks: list[int] = []
    current_streak = 1
    for i in range(1, n):
        if wl[i] == wl[i - 1]:
            current_streak += 1
        else:
            if wl[i - 1] == 1:
                win_streaks.append(current_streak)
            else:
                loss_streaks.append(current_streak)
            current_streak = 1
    # Don't forget the last streak
    if wl[-1] == 1:
        win_streaks.append(current_streak)
    else:
        loss_streaks.append(current_streak)

    return TradeDependencyMetrics(
        z_score=round(float(z_score), 4),
        z_interpretation=z_interp,
        serial_correlation=round(float(lag1_corr), 4),
        serial_p_value=round(float(lag1_p), 6),
        streak_max_wins=max(win_streaks) if win_streaks else 0,
        streak_max_losses=max(loss_streaks) if loss_streaks else 0,
        streak_avg_wins=round(float(np.mean(win_streaks)), 2) if win_streaks else 0.0,
        streak_avg_losses=round(float(np.mean(loss_streaks)), 2) if loss_streaks else 0.0,
    )


# ---------------------------------------------------------------------------
# Return distribution analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DistributionMetrics:
    """Statistical properties of the PnL distribution."""

    mean: float
    median: float
    std: float
    skewness: float
    kurtosis: float  # excess kurtosis
    jarque_bera_stat: float
    jarque_bera_p: float
    is_normal: bool  # JB test at 5% level
    percentile_01: float
    percentile_05: float
    percentile_10: float
    percentile_25: float
    percentile_75: float
    percentile_90: float
    percentile_95: float
    percentile_99: float
    var_95: float  # Value at Risk (95%)
    cvar_95: float  # Conditional VaR (Expected Shortfall)


def distribution_metrics(df_trades: pd.DataFrame) -> DistributionMetrics:
    """Analyze the statistical distribution of trade PnL."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n < 4:
        return DistributionMetrics(
            mean=0.0, median=0.0, std=0.0, skewness=0.0, kurtosis=0.0,
            jarque_bera_stat=0.0, jarque_bera_p=1.0, is_normal=True,
            percentile_01=0.0, percentile_05=0.0, percentile_10=0.0, percentile_25=0.0,
            percentile_75=0.0, percentile_90=0.0, percentile_95=0.0, percentile_99=0.0,
            var_95=0.0, cvar_95=0.0,
        )

    mean = float(np.mean(pnl))
    median = float(np.median(pnl))
    std = float(np.std(pnl, ddof=1))
    skew = float(sp_stats.skew(pnl))
    kurt = float(sp_stats.kurtosis(pnl))  # excess kurtosis

    jb_stat, jb_p = sp_stats.jarque_bera(pnl)

    pcts = np.percentile(pnl, [1, 5, 10, 25, 75, 90, 95, 99])

    # VaR and CVaR at 95% confidence
    var_95 = float(np.percentile(pnl, 5))  # 5th percentile = 95% VaR
    cvar_95 = float(np.mean(pnl[pnl <= var_95])) if np.any(pnl <= var_95) else var_95

    return DistributionMetrics(
        mean=round(mean, 4),
        median=round(median, 4),
        std=round(std, 4),
        skewness=round(skew, 4),
        kurtosis=round(kurt, 4),
        jarque_bera_stat=round(float(jb_stat), 4),
        jarque_bera_p=round(float(jb_p), 6),
        is_normal=float(jb_p) > 0.05,
        percentile_01=round(float(pcts[0]), 2),
        percentile_05=round(float(pcts[1]), 2),
        percentile_10=round(float(pcts[2]), 2),
        percentile_25=round(float(pcts[3]), 2),
        percentile_75=round(float(pcts[4]), 2),
        percentile_90=round(float(pcts[5]), 2),
        percentile_95=round(float(pcts[6]), 2),
        percentile_99=round(float(pcts[7]), 2),
        var_95=round(var_95, 2),
        cvar_95=round(cvar_95, 2),
    )


# ---------------------------------------------------------------------------
# Time-decay / edge stability analysis
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TimeDecayMetrics:
    """Does the strategy edge degrade over time?"""

    n_windows: int
    window_size: int
    sharpe_slope: float  # regression slope of rolling Sharpe
    sharpe_r_squared: float
    pnl_slope: float  # regression slope of rolling avg PnL
    pnl_r_squared: float
    is_decaying: bool  # True if sharpe slope is significantly negative
    decay_interpretation: str


def time_decay_analysis(
    df_trades: pd.DataFrame,
    *,
    window_size: int = 50,
    min_windows: int = 5,
) -> TimeDecayMetrics:
    """Analyze whether the strategy edge is decaying over time using rolling windows."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)

    if n < window_size * min_windows:
        return TimeDecayMetrics(
            n_windows=0, window_size=window_size,
            sharpe_slope=0.0, sharpe_r_squared=0.0,
            pnl_slope=0.0, pnl_r_squared=0.0,
            is_decaying=False, decay_interpretation="insufficient data for time-decay analysis",
        )

    # Rolling windows (non-overlapping)
    n_windows = n // window_size
    sharpes: list[float] = []
    avg_pnls: list[float] = []

    for i in range(n_windows):
        window = pnl[i * window_size : (i + 1) * window_size]
        avg_pnls.append(float(np.mean(window)))
        std = float(np.std(window, ddof=1))
        sharpes.append(float(np.mean(window) / std) if std > 1e-10 else 0.0)

    x = np.arange(n_windows)

    # Linear regression on rolling Sharpe
    slope_s, intercept_s, r_s, p_s, se_s = sp_stats.linregress(x, sharpes)
    slope_p, intercept_p, r_p, p_p, se_p = sp_stats.linregress(x, avg_pnls)

    is_decaying = slope_s < 0 and p_s < 0.05

    if is_decaying:
        interp = f"Edge is decaying: Sharpe declining at {slope_s:.4f}/window (p={p_s:.4f})"
    elif slope_s > 0 and p_s < 0.05:
        interp = f"Edge is improving: Sharpe increasing at {slope_s:.4f}/window (p={p_s:.4f})"
    else:
        interp = f"Edge appears stable (slope={slope_s:.4f}, p={p_s:.4f})"

    return TimeDecayMetrics(
        n_windows=n_windows,
        window_size=window_size,
        sharpe_slope=round(float(slope_s), 6),
        sharpe_r_squared=round(float(r_s ** 2), 4),
        pnl_slope=round(float(slope_p), 6),
        pnl_r_squared=round(float(r_p ** 2), 4),
        is_decaying=is_decaying,
        decay_interpretation=interp,
    )


# ---------------------------------------------------------------------------
# Missing institutional metrics
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InstitutionalMetrics:
    """Additional metrics expected by institutional quant desks."""

    recovery_factor: float  # net profit / abs(max drawdown)
    time_under_water_pct: float  # % of trades spent in drawdown
    max_consecutive_wins: int
    max_consecutive_losses: int
    max_consecutive_loss_amount: float  # total $ lost in worst losing streak
    avg_trade_duration_seconds: float
    median_trade_duration_seconds: float
    profit_per_day: float
    trade_frequency_per_day: float
    max_drawdown_duration_trades: int  # longest drawdown in trade count


def institutional_metrics(df_trades: pd.DataFrame) -> InstitutionalMetrics:
    """Compute additional institutional-grade metrics."""

    pnl = pd.to_numeric(df_trades["profit"], errors="coerce").fillna(0.0).to_numpy()
    n = len(pnl)
    if n == 0:
        return InstitutionalMetrics(
            recovery_factor=0.0, time_under_water_pct=0.0,
            max_consecutive_wins=0, max_consecutive_losses=0,
            max_consecutive_loss_amount=0.0, avg_trade_duration_seconds=0.0,
            median_trade_duration_seconds=0.0, profit_per_day=0.0,
            trade_frequency_per_day=0.0, max_drawdown_duration_trades=0,
        )

    eq = np.cumsum(pnl)
    peak = np.maximum.accumulate(eq)
    dd = eq - peak

    # Recovery Factor
    net_profit = float(eq[-1])
    mdd = abs(float(np.min(dd))) if len(dd) > 0 else 1e-10
    recovery_factor = float(net_profit / mdd) if mdd > 1e-10 else 0.0

    # Time Under Water (% of trades in drawdown)
    in_dd = dd < -1e-10
    time_under_water_pct = float(np.mean(in_dd) * 100)

    # Consecutive wins/losses
    wl = (pnl > 0).astype(int)
    max_con_wins = 0
    max_con_losses = 0
    worst_streak_loss = 0.0
    cur_streak = 1
    cur_streak_pnl = float(pnl[0])

    for i in range(1, n):
        if wl[i] == wl[i - 1]:
            cur_streak += 1
            cur_streak_pnl += float(pnl[i])
        else:
            if wl[i - 1] == 1:
                max_con_wins = max(max_con_wins, cur_streak)
            else:
                max_con_losses = max(max_con_losses, cur_streak)
                worst_streak_loss = min(worst_streak_loss, cur_streak_pnl)
            cur_streak = 1
            cur_streak_pnl = float(pnl[i])
    # Final streak
    if wl[-1] == 1:
        max_con_wins = max(max_con_wins, cur_streak)
    else:
        max_con_losses = max(max_con_losses, cur_streak)
        worst_streak_loss = min(worst_streak_loss, cur_streak_pnl)

    # Trade duration
    avg_dur = 0.0
    med_dur = 0.0
    if "duration_seconds" in df_trades.columns:
        durations = pd.to_numeric(df_trades["duration_seconds"], errors="coerce").dropna()
        if len(durations) > 0:
            avg_dur = float(durations.mean())
            med_dur = float(durations.median())

    # Profit per day and trade frequency
    profit_per_day = 0.0
    trades_per_day = 0.0
    ts_col = "exit_time" if "exit_time" in df_trades.columns else ("entry_time" if "entry_time" in df_trades.columns else None)
    if ts_col and n >= 2:
        ts = pd.to_datetime(df_trades[ts_col], errors="coerce").dropna().sort_values()
        if len(ts) >= 2:
            span_days = max((ts.iloc[-1] - ts.iloc[0]).total_seconds() / 86400.0, 1.0)
            profit_per_day = net_profit / span_days
            trades_per_day = n / span_days

    # Max drawdown duration (in trades)
    max_dd_dur = 0
    cur_dd_dur = 0
    for i in range(n):
        if dd[i] < -1e-10:
            cur_dd_dur += 1
            max_dd_dur = max(max_dd_dur, cur_dd_dur)
        else:
            cur_dd_dur = 0

    return InstitutionalMetrics(
        recovery_factor=round(recovery_factor, 4),
        time_under_water_pct=round(time_under_water_pct, 1),
        max_consecutive_wins=max_con_wins,
        max_consecutive_losses=max_con_losses,
        max_consecutive_loss_amount=round(worst_streak_loss, 2),
        avg_trade_duration_seconds=round(avg_dur, 1),
        median_trade_duration_seconds=round(med_dur, 1),
        profit_per_day=round(profit_per_day, 2),
        trade_frequency_per_day=round(trades_per_day, 2),
        max_drawdown_duration_trades=max_dd_dur,
    )


# ---------------------------------------------------------------------------
# Comprehensive analysis (all-in-one)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ComprehensiveMetrics:
    """All institutional metrics in one shot."""

    risk_return: RiskReturnMetrics
    expectancy: ExpectancyMetrics
    dependency: TradeDependencyMetrics
    distribution: DistributionMetrics
    time_decay: TimeDecayMetrics
    institutional: InstitutionalMetrics


def comprehensive_analysis(
    df_trades: pd.DataFrame,
    *,
    risk_free_rate: float = 0.0,
    window_size: int = 50,
) -> ComprehensiveMetrics:
    """Run the full institutional analysis suite on a trades DataFrame."""

    return ComprehensiveMetrics(
        risk_return=risk_return_metrics(df_trades, risk_free_rate=risk_free_rate),
        expectancy=expectancy_metrics(df_trades),
        dependency=trade_dependency_analysis(df_trades),
        distribution=distribution_metrics(df_trades),
        time_decay=time_decay_analysis(df_trades, window_size=window_size),
        institutional=institutional_metrics(df_trades),
    )
