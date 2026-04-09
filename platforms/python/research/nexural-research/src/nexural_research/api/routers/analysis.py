"""Core metrics, advanced metrics, institutional analytics, and stress testing endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query

from nexural_research.api.auth import AuthContext, require_auth

from nexural_research.analyze.advanced_analytics import (
    autocorrelation_analysis,
    hurst_exponent,
    information_ratio,
    rolling_correlation_analysis,
)
from nexural_research.analyze.advanced_metrics import (
    comprehensive_analysis,
    distribution_metrics,
    expectancy_metrics,
    institutional_metrics,
    risk_return_metrics,
    time_decay_analysis,
    trade_dependency_analysis,
)
from nexural_research.analyze.execution_quality import execution_quality_from_executions
from nexural_research.analyze.improvements import generate_improvement_report
from nexural_research.analyze.metrics import metrics_by, metrics_from_trades
from nexural_research.analyze.portfolio import benchmark_comparison, portfolio_analysis
from nexural_research.analyze.stress_testing import (
    historical_stress_scenarios,
    parameter_sensitivity,
    tail_amplification_stress_test,
)
from nexural_research.api.cache import cache
from nexural_research.api.compat import adapt_improvements, adapt_metrics
from nexural_research.api.sessions import get_executions, get_trades, safe_serialize

router = APIRouter(tags=["analysis"], dependencies=[Depends(require_auth)])


# --- Core Metrics ---

@router.get("/analysis/metrics")
def get_metrics(session_id: str = Query(default="default")):
    """Core trade metrics (n_trades, win_rate, profit_factor, etc.)."""
    df = get_trades(session_id)
    raw = safe_serialize(metrics_from_trades(df))
    return adapt_metrics(raw, df)


@router.get("/analysis/metrics/by/{group}")
def get_metrics_by(group: str, session_id: str = Query(default="default")):
    """Metrics grouped by a column (strategy, instrument, etc.)."""
    df = get_trades(session_id)
    return json.loads(metrics_by(df, group).to_json(orient="records"))


# --- Advanced Metrics ---

@router.get("/analysis/risk-return")
def get_risk_return(session_id: str = Query(default="default"), risk_free_rate: float = Query(default=0.0)):
    """Sharpe, Sortino, Calmar, Omega, MAR, Tail ratio, etc."""
    return safe_serialize(risk_return_metrics(get_trades(session_id), risk_free_rate=risk_free_rate))


@router.get("/analysis/expectancy")
def get_expectancy(session_id: str = Query(default="default")):
    """Expectancy, Kelly Criterion, Optimal f, payoff ratio."""
    return safe_serialize(expectancy_metrics(get_trades(session_id)))


@router.get("/analysis/dependency")
def get_dependency(session_id: str = Query(default="default")):
    """Trade dependency analysis (Z-score, serial correlation, streaks)."""
    return safe_serialize(trade_dependency_analysis(get_trades(session_id)))


@router.get("/analysis/distribution")
def get_distribution(session_id: str = Query(default="default")):
    """Return distribution analysis (skew, kurtosis, VaR, CVaR, normality test)."""
    return safe_serialize(distribution_metrics(get_trades(session_id)))


@router.get("/analysis/time-decay")
def get_time_decay(session_id: str = Query(default="default"), window_size: int = Query(default=50)):
    """Edge stability / time-decay analysis."""
    return safe_serialize(time_decay_analysis(get_trades(session_id), window_size=window_size))


@router.get("/analysis/comprehensive")
def get_comprehensive(session_id: str = Query(default="default"), risk_free_rate: float = Query(default=0.0)):
    """Run the complete institutional analysis suite."""
    key = cache.make_key(session_id, "comprehensive", {"rfr": risk_free_rate})
    hit, cached = cache.get(key)
    if hit:
        return cached
    import time as _t
    _start = _t.time()
    result = safe_serialize(comprehensive_analysis(get_trades(session_id), risk_free_rate=risk_free_rate))
    _dur = round((_t.time() - _start) * 1000, 1)
    cache.put(key, result)
    # Write to DB for audit trail
    try:
        import json
        from nexural_research.db.engine import SessionLocal
        from nexural_research.db.models import AnalysisRun
        db = SessionLocal()
        db.add(AnalysisRun(session_id=session_id, analysis_type="comprehensive", parameters_json=json.dumps({"risk_free_rate": risk_free_rate}), result_json=None, duration_ms=_dur))
        db.commit()
        db.close()
    except Exception:
        pass
    return result


@router.get("/analysis/institutional")
def get_institutional(session_id: str = Query(default="default")):
    """Recovery factor, time under water, consecutive wins/losses, trade duration."""
    return safe_serialize(institutional_metrics(get_trades(session_id)))


@router.get("/analysis/improvements")
def get_improvements(session_id: str = Query(default="default")):
    """Actionable recommendations with letter grade."""
    key = cache.make_key(session_id, "improvements")
    hit, cached = cache.get(key)
    if hit:
        return cached
    raw = safe_serialize(generate_improvement_report(get_trades(session_id)))
    result = adapt_improvements(raw)
    cache.put(key, result)
    return result


# --- Desk-Level Analytics ---

@router.get("/analysis/hurst")
def get_hurst(session_id: str = Query(default="default")):
    """Hurst exponent — mean reversion vs trend detection via R/S analysis."""
    return safe_serialize(hurst_exponent(get_trades(session_id)))


@router.get("/analysis/acf")
def get_acf(session_id: str = Query(default="default"), max_lag: int = Query(default=20, ge=1, le=100)):
    """Autocorrelation function — serial dependency beyond Z-score."""
    return safe_serialize(autocorrelation_analysis(get_trades(session_id), max_lag=max_lag))


@router.get("/analysis/rolling-correlation")
def get_rolling_correlation(session_id: str = Query(default="default"), window_size: int = Query(default=50, ge=10, le=500)):
    """Rolling autocorrelation — detects strategy character change."""
    return safe_serialize(rolling_correlation_analysis(get_trades(session_id), window_size=window_size))


@router.get("/analysis/information-ratio")
def get_information_ratio(session_id: str = Query(default="default"), recent_pct: float = Query(default=0.3, ge=0.1, le=0.9)):
    """Information Ratio — recent performance vs own historical baseline."""
    return safe_serialize(information_ratio(get_trades(session_id), recent_pct=recent_pct))


# --- Stress Testing ---

@router.get("/stress/tail-amplification")
def get_tail_stress(session_id: str = Query(default="default")):
    """What if worst trades were 2-3x worse."""
    return safe_serialize(tail_amplification_stress_test(get_trades(session_id)))


@router.get("/stress/historical")
def get_historical_stress(session_id: str = Query(default="default"), top_n: int = Query(default=5, ge=1, le=20)):
    """Worst N-trade drawdown windows."""
    return safe_serialize(historical_stress_scenarios(get_trades(session_id), top_n=top_n))


@router.get("/stress/sensitivity")
def get_sensitivity(session_id: str = Query(default="default"), size_steps: int = Query(default=8, ge=3, le=20), stop_steps: int = Query(default=7, ge=3, le=20)):
    """Parameter sensitivity surface."""
    key = cache.make_key(session_id, "sensitivity", {"size": size_steps, "stop": stop_steps})
    hit, cached = cache.get(key)
    if hit:
        return cached
    result = safe_serialize(parameter_sensitivity(get_trades(session_id), size_steps=size_steps, stop_steps=stop_steps))
    cache.put(key, result)
    return result


# --- Parameter Sweep Automation ---

@router.get("/analysis/parameter-sweep")
def get_parameter_sweep(
    session_id: str = Query(default="default"),
    stop_steps: int = Query(default=6, ge=3, le=15),
    target_steps: int = Query(default=6, ge=3, le=15),
    size_steps: int = Query(default=4, ge=2, le=8),
):
    """Automated parameter sweep — test all stop/target/size combinations, rank by composite score, detect overfitting."""
    from nexural_research.analyze.parameter_sweep import parameter_sweep
    key = cache.make_key(session_id, "sweep", {"stop": stop_steps, "target": target_steps, "size": size_steps})
    hit, cached = cache.get(key)
    if hit:
        return cached
    result = safe_serialize(parameter_sweep(get_trades(session_id), stop_steps=stop_steps, target_steps=target_steps, size_steps=size_steps))
    cache.put(key, result, ttl=600)  # cache 10 min (expensive computation)
    return result


# --- Factor Attribution (placeholder — requires external factor data) ---

@router.get("/analysis/factor-attribution")
def get_factor_attribution(session_id: str = Query(default="default")):
    """Factor attribution — requires external market data (placeholder)."""
    return {
        "status": "not_available",
        "message": "Factor attribution requires external market factor data (Fama-French, etc.). Upload factor data to enable this feature.",
        "factors": [],
        "r_squared": 0,
        "interpretation": "Factor attribution is not yet configured. This feature requires benchmark/factor return data.",
    }


@router.get("/analysis/rolling-factors")
def get_rolling_factors(session_id: str = Query(default="default")):
    """Rolling factor exposure — requires external market data (placeholder)."""
    return {
        "status": "not_available",
        "message": "Rolling factor analysis requires external market factor data.",
        "timestamps": [],
        "factors": {},
    }


# --- Portfolio & Benchmark ---

@router.get("/analysis/portfolio")
def get_portfolio(session_id: str = Query(default="default")):
    """Multi-strategy portfolio analysis with correlation & diversification."""
    return safe_serialize(portfolio_analysis(get_trades(session_id)))


@router.get("/analysis/benchmark")
def get_benchmark(session_id: str = Query(default="default"), n_random_sims: int = Query(default=1000, ge=10, le=50000)):
    """Strategy vs buy-and-hold and random entry benchmarks."""
    return safe_serialize(benchmark_comparison(get_trades(session_id), n_random_sims=n_random_sims))


# --- Execution Quality ---

@router.get("/analysis/execution-quality")
def get_execution_quality(session_id: str = Query(default="default")):
    """Slippage, commission, order types."""
    return safe_serialize(execution_quality_from_executions(get_executions(session_id)))
