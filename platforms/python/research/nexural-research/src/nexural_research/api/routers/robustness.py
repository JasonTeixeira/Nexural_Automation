"""Robustness testing endpoints: Monte Carlo, bootstrap, walk-forward, DSR, regime."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from nexural_research.api.auth import require_auth

from nexural_research.analyze.advanced_robustness import (
    block_bootstrap_monte_carlo,
    deflated_sharpe_ratio,
    parametric_monte_carlo,
    regime_analysis,
    rolling_walk_forward,
)
from nexural_research.analyze.robustness import monte_carlo_max_drawdown, walk_forward_split
from nexural_research.api.compat import adapt_block_bootstrap, adapt_deflated_sharpe, adapt_monte_carlo, adapt_regime, adapt_walk_forward
from nexural_research.api.sessions import get_trades, safe_serialize

router = APIRouter(tags=["robustness"], dependencies=[Depends(require_auth)])


@router.get("/robustness/monte-carlo")
def get_monte_carlo(session_id: str = Query(default="default"), n: int = Query(default=1000, ge=10, le=100000), seed: int = Query(default=42)):
    """Shuffle-based Monte Carlo (max drawdown distribution)."""
    return safe_serialize(monte_carlo_max_drawdown(get_trades(session_id), n=n, seed=seed))


@router.get("/robustness/parametric-monte-carlo")
def get_parametric_mc(session_id: str = Query(default="default"), n_simulations: int = Query(default=5000, ge=10, le=100000), distribution: str = Query(default="empirical"), seed: int = Query(default=42)):
    """Parametric Monte Carlo (empirical/normal/t-distribution)."""
    raw = safe_serialize(parametric_monte_carlo(get_trades(session_id), n_simulations=n_simulations, distribution=distribution, seed=seed))
    return adapt_monte_carlo(raw)


@router.get("/robustness/block-bootstrap")
def get_block_bootstrap(session_id: str = Query(default="default"), n_simulations: int = Query(default=2000, ge=10, le=50000), block_size: int | None = Query(default=None), seed: int = Query(default=42)):
    """Block bootstrap Monte Carlo (preserves autocorrelation)."""
    raw = safe_serialize(block_bootstrap_monte_carlo(get_trades(session_id), n_simulations=n_simulations, block_size=block_size, seed=seed))
    return adapt_block_bootstrap(raw)


@router.get("/robustness/walk-forward")
def get_walk_forward(session_id: str = Query(default="default"), split: float = Query(default=0.7)):
    """Simple walk-forward split."""
    raw = safe_serialize(walk_forward_split(get_trades(session_id), split=split))
    # Add fields the frontend expects
    raw["walk_forward_efficiency"] = raw.get("out_sample_net_profit", 0) / max(abs(raw.get("in_sample_net_profit", 1)), 0.01)
    raw["folds"] = []
    raw["interpretation"] = f"IS: ${raw.get('in_sample_net_profit', 0):,.2f} ({raw.get('in_sample_n', 0)} trades) → OOS: ${raw.get('out_sample_net_profit', 0):,.2f} ({raw.get('out_sample_n', 0)} trades)"
    return raw


@router.get("/robustness/rolling-walk-forward")
def get_rolling_wf(session_id: str = Query(default="default"), n_windows: int = Query(default=5, ge=2, le=50), in_sample_pct: float = Query(default=0.7, ge=0.1, le=0.95), anchored: bool = Query(default=False)):
    """Rolling or anchored walk-forward analysis with multiple windows."""
    raw = safe_serialize(rolling_walk_forward(get_trades(session_id), n_windows=n_windows, in_sample_pct=in_sample_pct, anchored=anchored))
    return adapt_walk_forward(raw)


@router.get("/robustness/deflated-sharpe")
def get_deflated_sharpe(session_id: str = Query(default="default"), n_trials: int = Query(default=100, ge=1, le=100000)):
    """Deflated Sharpe Ratio for overfitting detection."""
    raw = safe_serialize(deflated_sharpe_ratio(get_trades(session_id), n_trials=n_trials))
    return adapt_deflated_sharpe(raw)


@router.get("/robustness/regime")
def get_regime(session_id: str = Query(default="default"), n_regimes: int = Query(default=3, ge=2, le=10), window: int = Query(default=20, ge=5, le=200)):
    """Volatility regime detection & performance analysis."""
    raw = safe_serialize(regime_analysis(get_trades(session_id), n_regimes=n_regimes, window=window))
    return adapt_regime(raw)
