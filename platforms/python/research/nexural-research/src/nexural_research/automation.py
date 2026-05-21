"""Agent-facing automation service for Nexural Research.

This module is intentionally independent from FastAPI and MCP transports. It
turns the existing research engine into reusable workflows that can be called
from the CLI, HTTP API, MCP tools, tests, or future schedulers.
"""

from __future__ import annotations

import math
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from nexural_research.analyze.advanced_metrics import comprehensive_analysis
from nexural_research.analyze.advanced_robustness import (
    deflated_sharpe_ratio,
    parametric_monte_carlo,
    regime_analysis,
    rolling_walk_forward,
)
from nexural_research.analyze.comparison import compare_strategies
from nexural_research.analyze.improvements import generate_improvement_report
from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.bridge_sdk import scaffold_bridge
from nexural_research.cost_model import estimate_costs
from nexural_research.gauntlet import run_trade_gauntlet
from nexural_research.ingest.multi_format import detect_and_load
from nexural_research.report.html import build_trades_report_html
from nexural_research.strategy_sdk import scaffold_strategy

CAPABILITIES: dict[str, Any] = {
    "name": "Nexural Automation",
    "version": "2.1.0",
    "purpose": "Agent-ready strategy analysis, robustness validation, and report automation.",
    "supported_imports": [
        "NinjaTrader Strategy Analyzer CSV",
        "TradingView strategy tester CSV",
        "MetaTrader 4/5 history CSV",
        "Interactive Brokers activity CSV",
        "TradeStation trade CSV",
    ],
    "automation_workflows": [
        "single_strategy_due_diligence",
        "multi_strategy_ranking",
        "walk_forward_validation",
        "deflated_sharpe_overfitting_check",
        "monte_carlo_risk_envelope",
        "strategy_improvement_plan",
        "html_research_report_generation",
        "institutional_gauntlet",
        "futures_cost_stress",
        "strategy_scaffolding",
        "bridge_scaffolding",
    ],
    "guardrails": [
        "Historical analysis only; no live execution.",
        "No forward-filled future data or lookahead assumptions are introduced.",
        "Overfitting checks are first-class outputs, not optional footnotes.",
        "Optional NEXURAL_ALLOWED_DATA_DIRS can restrict which files MCP tools may read.",
    ],
}


def _json_safe(value: Any) -> Any:
    """Convert common scientific Python values to JSON/MCP-safe primitives."""
    if hasattr(value, "__dataclass_fields__"):
        return _json_safe(asdict(value))
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        value = float(value)
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if math.isinf(value):
            return "inf" if value > 0 else "-inf"
        return value
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    return value


def _allowed_roots() -> list[Path]:
    raw = os.environ.get("NEXURAL_ALLOWED_DATA_DIRS", "").strip()
    if not raw:
        return []
    roots = []
    for item in raw.split(os.pathsep):
        item = item.strip()
        if item:
            roots.append(Path(item).expanduser().resolve())
    return roots


def _resolve_input_file(path: str | Path) -> Path:
    p = Path(path).expanduser().resolve()
    if not p.exists():
        raise FileNotFoundError(f"Input file does not exist: {p}")
    if not p.is_file():
        raise ValueError(f"Input path is not a file: {p}")

    roots = _allowed_roots()
    if roots and not any(p == root or root in p.parents for root in roots):
        allowed = ", ".join(str(root) for root in roots)
        raise PermissionError(
            f"Input file is outside NEXURAL_ALLOWED_DATA_DIRS: {p}. Allowed: {allowed}"
        )
    return p


def load_trade_export(path: str | Path) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load a supported trade export and return normalized trades plus metadata."""
    p = _resolve_input_file(path)
    df, platform = detect_and_load(p)
    if "profit" not in df.columns:
        raise ValueError("Trade export could not be normalized: missing required profit column")

    df = df.copy()
    df["profit"] = pd.to_numeric(df["profit"], errors="coerce").fillna(0.0)
    metadata = {
        "path": str(p),
        "filename": p.name,
        "platform": platform,
        "n_rows": int(len(df)),
        "columns": list(df.columns),
    }
    return df, metadata


def _decision(summary: dict[str, Any]) -> dict[str, Any]:
    grade = str(summary.get("grade", "F"))
    sharpe = float(summary.get("sharpe_ratio") or 0.0)
    profit_factor = float(summary.get("profit_factor") or 0.0)
    survives_deflation = bool(summary.get("survives_deflation"))
    walk_forward_efficiency = float(summary.get("walk_forward_efficiency") or 0.0)

    blockers: list[str] = []
    if grade in {"D", "F"}:
        blockers.append(f"strategy grade is {grade}")
    if profit_factor < 1.2:
        blockers.append("profit factor is below 1.20")
    if sharpe < 0.5:
        blockers.append("Sharpe ratio is below 0.50")
    if not survives_deflation:
        blockers.append("deflated Sharpe does not pass overfitting threshold")
    if walk_forward_efficiency < 0.35:
        blockers.append("walk-forward efficiency is below 0.35")

    if blockers:
        status = "reject_for_live_trading"
        rationale = "Needs research work before any live consideration: " + "; ".join(blockers)
    elif grade in {"A", "B", "B+"} and sharpe >= 1.0 and profit_factor >= 1.5:
        status = "promote_to_paper_trading"
        rationale = (
            "Passes core risk/return checks; validate slippage, market regime, "
            "and live execution in paper."
        )
    else:
        status = "watchlist"
        rationale = "No fatal blocker, but edge quality is not yet institutional."

    return {"status": status, "rationale": rationale, "blockers": blockers}


def analyze_strategy_export(
    csv_path: str | Path,
    *,
    risk_free_rate: float = 0.0,
    n_trials: int = 100,
    monte_carlo_sims: int = 2000,
    monte_carlo_distribution: str = "empirical",
    walk_forward_windows: int = 5,
) -> dict[str, Any]:
    """Run the full agent-ready strategy due diligence workflow."""
    df, source = load_trade_export(csv_path)

    core = metrics_from_trades(df)
    comp = comprehensive_analysis(df, risk_free_rate=risk_free_rate)
    improvements = generate_improvement_report(df)
    dsr = deflated_sharpe_ratio(df, n_trials=n_trials, risk_free_rate=risk_free_rate)
    regime = regime_analysis(df)
    monte_carlo = parametric_monte_carlo(
        df,
        n_simulations=monte_carlo_sims,
        distribution=monte_carlo_distribution,
    )
    walk_forward = rolling_walk_forward(df, n_windows=walk_forward_windows)

    summary = {
        "n_trades": core.n_trades,
        "net_profit": core.net_profit,
        "win_rate_pct": round(core.win_rate * 100.0, 2),
        "profit_factor": core.profit_factor,
        "avg_trade": core.avg_trade,
        "max_drawdown": core.max_drawdown,
        "sharpe_ratio": comp.risk_return.sharpe_ratio,
        "sortino_ratio": comp.risk_return.sortino_ratio,
        "calmar_ratio": comp.risk_return.calmar_ratio,
        "expectancy": comp.expectancy.expectancy,
        "kelly_pct": comp.expectancy.kelly_pct,
        "grade": improvements.overall_grade,
        "survives_deflation": dsr.is_significant,
        "deflated_sharpe_p_value": dsr.p_value,
        "current_regime": regime.current_regime,
        "walk_forward_efficiency": walk_forward.walk_forward_efficiency,
        "walk_forward_oos_net": walk_forward.aggregate_oos_net,
        "monte_carlo_profitability_pct": monte_carlo.prob_profitable,
        "monte_carlo_mdd_p95": monte_carlo.mdd_p95,
    }

    recommendations = [
        {
            "priority": r.priority,
            "category": r.category,
            "title": r.title,
            "current_value": r.current_value,
            "suggested_value": r.suggested_value,
            "expected_impact": r.expected_impact,
            "confidence": r.confidence,
        }
        for r in improvements.recommendations[:10]
    ]

    result = {
        "source": source,
        "summary": summary,
        "automation_decision": _decision(summary),
        "metrics": {
            "core": core,
            "risk_return": comp.risk_return,
            "expectancy": comp.expectancy,
            "dependency": comp.dependency,
            "distribution": comp.distribution,
            "institutional": comp.institutional,
            "time_decay": comp.time_decay,
        },
        "robustness": {
            "deflated_sharpe": dsr,
            "regime": regime,
            "monte_carlo": monte_carlo,
            "walk_forward": walk_forward,
        },
        "improvement_plan": {
            "grade": improvements.overall_grade,
            "grade_explanation": improvements.grade_explanation,
            "recommendations": recommendations,
            "filtered_improvement": improvements.filtered_improvement,
        },
        "next_actions": [
            (
                "Validate with a true out-of-sample export that was not used "
                "during parameter discovery."
            ),
            (
                "Run the same workflow after realistic commission, slippage, "
                "and partial-fill assumptions."
            ),
            (
                "Only promote to paper trading if overfitting, walk-forward, "
                "and drawdown gates pass together."
            ),
        ],
    }
    return _json_safe(result)


def compare_strategy_exports(csv_paths: list[str | Path]) -> dict[str, Any]:
    """Rank 2-10 supported trade exports with the comparison engine."""
    if len(csv_paths) < 2:
        raise ValueError("At least two CSV paths are required for comparison")
    if len(csv_paths) > 10:
        raise ValueError("Comparison is capped at 10 strategies")

    strategy_data = []
    sources = []
    for index, path in enumerate(csv_paths, start=1):
        df, source = load_trade_export(path)
        session_id = f"strategy_{index}"
        strategy_data.append((session_id, source["filename"], df))
        sources.append({"session_id": session_id, **source})

    matrix = compare_strategies(strategy_data)
    return _json_safe({"sources": sources, "comparison": matrix})


def generate_strategy_report(
    csv_path: str | Path,
    *,
    output_dir: str | Path | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    """Generate an HTML research report and return its path plus quick summary."""
    df, source = load_trade_export(csv_path)
    in_path = Path(source["path"])
    out_dir = (
        Path(output_dir).expanduser().resolve()
        if output_dir
        else in_path.parent / "nexural_reports"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    report_title = title or f"Nexural Research Report - {source['filename']}"
    out_path = out_dir / f"{in_path.stem}_nexural_report.html"
    out_path.write_text(build_trades_report_html(df, title=report_title), encoding="utf-8")

    core = metrics_from_trades(df)
    return _json_safe(
        {
            "report_path": out_path,
            "source": source,
            "summary": {
                "n_trades": core.n_trades,
                "net_profit": core.net_profit,
                "win_rate_pct": round(core.win_rate * 100.0, 2),
                "profit_factor": core.profit_factor,
                "max_drawdown": core.max_drawdown,
            },
        }
    )


def run_strategy_gauntlet_export(
    csv_path: str | Path,
    *,
    strategy_name: str = "strategy",
    symbol: str = "ES",
    min_trades: int = 100,
    n_trials: int = 100,
    cost_stress_profile: str = "elevated",
) -> dict[str, Any]:
    """Run the institutional gauntlet on a supported trade-export CSV."""
    df, source = load_trade_export(csv_path)
    report = run_trade_gauntlet(
        df,
        strategy_name=strategy_name,
        symbol=symbol,
        min_trades=min_trades,
        n_trials=n_trials,
        cost_stress_profile=cost_stress_profile,
    )
    return _json_safe({"source": source, "gauntlet": report})


def estimate_strategy_costs(
    *,
    symbol: str,
    trades: int,
    quantity: float = 1.0,
    slippage_multiplier: float = 1.0,
    stress_profile: str = "normal",
) -> dict[str, Any]:
    """Estimate realistic futures round-turn costs for strategy planning."""
    return _json_safe(
        estimate_costs(
            symbol,
            trades=trades,
            quantity=quantity,
            slippage_multiplier=slippage_multiplier,
            stress_profile=stress_profile,
        )
    )


def create_strategy_scaffold(
    *,
    name: str,
    platform: str = "python",
    output_dir: str | Path = "strategies",
    overwrite: bool = False,
) -> dict[str, Any]:
    """Create a public strategy SDK scaffold."""
    return _json_safe(
        scaffold_strategy(
            name=name,
            platform=platform,  # type: ignore[arg-type]
            output_dir=output_dir,
            overwrite=overwrite,
        )
    )


def create_bridge_scaffold(
    *,
    name: str,
    output_dir: str | Path = "bridges",
    overwrite: bool = False,
) -> dict[str, Any]:
    """Create a bridge SDK scaffold."""
    return _json_safe(scaffold_bridge(name=name, output_dir=output_dir, overwrite=overwrite))
