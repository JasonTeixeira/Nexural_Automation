"""Automation endpoints for Strategy Lab and local MCP-adjacent clients."""

from __future__ import annotations

import ipaddress
import os
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from nexural_research.api.auth import require_auth
from nexural_research.automation import (
    CAPABILITIES,
    analyze_strategy_export,
    estimate_strategy_costs,
    generate_strategy_report,
    run_strategy_gauntlet_export,
)

router = APIRouter(tags=["automation"], dependencies=[Depends(require_auth)])


def _require_local_path_api(request: Request) -> None:
    """Keep host-path workflows out of hosted and remote API deployments."""

    enabled = os.environ.get("NEXURAL_LOCAL_PATH_API_ENABLED", "false").lower() in {
        "true",
        "1",
        "yes",
    }
    if not enabled:
        raise HTTPException(status_code=403, detail="Local path API is disabled.")
    host = request.client.host if request.client else ""
    try:
        loopback = ipaddress.ip_address(host).is_loopback
    except ValueError:
        loopback = False
    if not loopback:
        raise HTTPException(status_code=403, detail="Local path API requires a loopback client.")


def _confined_call(operation: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    try:
        return operation()
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Local path access denied.") from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Local input file was not found.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Local input could not be processed.") from exc


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


class ReportCsvRequest(BaseModel):
    csv_path: str
    output_dir: str | None = None
    title: str | None = None


@router.get("/automation/capabilities")
def get_automation_capabilities() -> dict[str, Any]:
    return CAPABILITIES


@router.post("/automation/analyze-csv")
def post_analyze_csv(req: AnalyzeCsvRequest, request: Request) -> dict[str, Any]:
    _require_local_path_api(request)
    return _confined_call(
        lambda: analyze_strategy_export(
            req.csv_path,
            risk_free_rate=req.risk_free_rate,
            n_trials=req.n_trials,
            monte_carlo_sims=req.monte_carlo_sims,
            monte_carlo_distribution=req.monte_carlo_distribution,
            walk_forward_windows=req.walk_forward_windows,
            require_confinement=True,
        )
    )


@router.post("/automation/gauntlet-csv")
def post_gauntlet_csv(req: GauntletCsvRequest, request: Request) -> dict[str, Any]:
    _require_local_path_api(request)
    return _confined_call(
        lambda: run_strategy_gauntlet_export(
            req.csv_path,
            strategy_name=req.strategy_name,
            symbol=req.symbol,
            min_trades=req.min_trades,
            n_trials=req.n_trials,
            cost_stress_profile=req.cost_stress_profile,
            require_confinement=True,
        )
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


@router.post("/automation/report-csv")
def post_report_csv(req: ReportCsvRequest, request: Request) -> dict[str, Any]:
    _require_local_path_api(request)
    return _confined_call(
        lambda: generate_strategy_report(
            req.csv_path,
            output_dir=req.output_dir,
            title=req.title,
            require_confinement=True,
        )
    )
