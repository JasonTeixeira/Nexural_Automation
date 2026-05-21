"""Automation endpoints for Strategy Lab and local MCP-adjacent clients."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from nexural_research.api.auth import require_auth
from nexural_research.automation import (
    CAPABILITIES,
    analyze_strategy_export,
    estimate_strategy_costs,
    run_strategy_gauntlet_export,
)

router = APIRouter(tags=["automation"], dependencies=[Depends(require_auth)])


class AnalyzeCsvRequest(BaseModel):
    csv_path: str
    risk_free_rate: float = 0.0
    n_trials: int = 100
    monte_carlo_sims: int = 2000
    monte_carlo_distribution: str = "empirical"
    walk_forward_windows: int = 5


class GauntletCsvRequest(BaseModel):
    csv_path: str
    strategy_name: str = "strategy"
    symbol: str = "ES"
    min_trades: int = 100
    n_trials: int = 100
    cost_stress_profile: str = "elevated"


class CostEstimateRequest(BaseModel):
    symbol: str
    trades: int
    quantity: float = 1.0
    slippage_multiplier: float = 1.0
    stress_profile: str = "normal"


@router.get("/automation/capabilities")
def get_automation_capabilities() -> dict[str, Any]:
    return CAPABILITIES


@router.post("/automation/analyze-csv")
def post_analyze_csv(req: AnalyzeCsvRequest) -> dict[str, Any]:
    return analyze_strategy_export(
        req.csv_path,
        risk_free_rate=req.risk_free_rate,
        n_trials=req.n_trials,
        monte_carlo_sims=req.monte_carlo_sims,
        monte_carlo_distribution=req.monte_carlo_distribution,
        walk_forward_windows=req.walk_forward_windows,
    )


@router.post("/automation/gauntlet-csv")
def post_gauntlet_csv(req: GauntletCsvRequest) -> dict[str, Any]:
    return run_strategy_gauntlet_export(
        req.csv_path,
        strategy_name=req.strategy_name,
        symbol=req.symbol,
        min_trades=req.min_trades,
        n_trials=req.n_trials,
        cost_stress_profile=req.cost_stress_profile,
    )


@router.post("/automation/costs")
def post_costs(req: CostEstimateRequest) -> dict[str, Any]:
    return estimate_strategy_costs(
        symbol=req.symbol,
        trades=req.trades,
        quantity=req.quantity,
        slippage_multiplier=req.slippage_multiplier,
        stress_profile=req.stress_profile,
    )
