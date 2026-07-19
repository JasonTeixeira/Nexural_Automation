"""Agent-facing automation service for Nexural Research.

This module is intentionally independent from FastAPI and MCP transports. It
turns the existing research engine into reusable workflows that can be called
from the CLI, HTTP API, MCP tools, tests, or future schedulers.
"""

from __future__ import annotations

import math
import ntpath
import os
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from nexural_research import __version__
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
    "version": __version__,
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


def _json_dict(value: Any) -> dict[str, Any]:
    """Normalize and assert the mapping shape promised by public workflows."""
    normalized = _json_safe(value)
    if not isinstance(normalized, dict):
        raise TypeError("Expected a JSON object from workflow result")
    return normalized


def _configured_roots(variable: str, *, required: bool) -> list[Path]:
    raw = os.environ.get(variable, "").strip()
    if not raw:
        if required:
            raise PermissionError(f"{variable} must be configured for confined path access")
        return []
    roots: list[Path] = []
    for item in raw.split(os.pathsep):
        item = item.strip()
        if item:
            _reject_confined_path_syntax(item)
            try:
                root = Path(item).expanduser().resolve(strict=True)
            except (OSError, RuntimeError) as exc:
                raise PermissionError(f"Configured path root is unavailable: {variable}") from exc
            if not root.is_dir():
                raise PermissionError(f"Configured path root is not a directory: {variable}")
            roots.append(root)
    if required and not roots:
        raise PermissionError(f"{variable} must contain at least one path root")
    return roots


def _reject_confined_path_syntax(path: str | Path) -> None:
    raw = os.fspath(path)
    if not raw or "\x00" in raw:
        raise PermissionError("unsafe path syntax")

    windows_form = raw.replace("/", "\\")
    drive, tail = ntpath.splitdrive(windows_form)
    if windows_form.startswith("\\\\") or drive.startswith("\\\\"):
        raise PermissionError("unsafe path syntax: network and device paths are not allowed")
    if ":" in tail:
        raise PermissionError("unsafe path syntax: alternate data streams are not allowed")

    posix_parts = Path(raw).parts
    windows_parts = tuple(part for part in windows_form.split("\\") if part)
    if ".." in posix_parts or ".." in windows_parts:
        raise PermissionError("unsafe path syntax: traversal is not allowed")


def _is_under(candidate: Path, roots: list[Path]) -> bool:
    return any(candidate == root or candidate.is_relative_to(root) for root in roots)


def resolve_confined_input_file(
    path: str | Path,
    *,
    require_configured_roots: bool = False,
) -> Path:
    """Resolve an input file, applying fail-closed roots for HTTP/local-path mode.

    CLI and MCP callers retain the historical unrestricted local default. Once
    roots are configured, or ``require_configured_roots`` is true, traversal,
    network/device paths, ADS syntax, and symlink escapes are rejected.
    """

    roots = _configured_roots(
        "NEXURAL_ALLOWED_DATA_DIRS",
        required=require_configured_roots,
    )
    if roots or require_configured_roots:
        _reject_confined_path_syntax(path)
    try:
        candidate = Path(path).expanduser().resolve(strict=True)
    except FileNotFoundError as exc:
        raise FileNotFoundError("Input file does not exist") from exc
    except (OSError, RuntimeError) as exc:
        raise PermissionError("Input path could not be resolved safely") from exc
    if not candidate.is_file():
        raise ValueError("Input path is not a file")
    if roots and not _is_under(candidate, roots):
        raise PermissionError("Input file is outside configured roots")
    return candidate


def resolve_confined_output_directory(
    path: str | Path,
    *,
    require_configured_roots: bool = False,
) -> Path:
    """Resolve a report directory without allowing an output-root escape."""

    roots = _configured_roots(
        "NEXURAL_ALLOWED_REPORT_DIRS",
        required=require_configured_roots,
    )
    if roots or require_configured_roots:
        _reject_confined_path_syntax(path)
    try:
        candidate = Path(path).expanduser().resolve(strict=False)
    except (OSError, RuntimeError) as exc:
        raise PermissionError("Output path could not be resolved safely") from exc
    if roots and not _is_under(candidate, roots):
        raise PermissionError("Output directory is outside configured roots")
    if candidate.exists() and (candidate.is_symlink() or not candidate.is_dir()):
        raise PermissionError("Output path is not a safe directory")
    return candidate


def load_trade_export(
    path: str | Path,
    *,
    require_confinement: bool = False,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load a supported trade export and return normalized trades plus metadata."""
    p = resolve_confined_input_file(
        path,
        require_configured_roots=require_confinement,
    )
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
    walk_forward_methodology = str(summary.get("walk_forward_methodology") or "unknown")
    parameters_frozen = bool(summary.get("walk_forward_parameters_frozen"))

    blockers: list[str] = []
    if grade in {"D", "F"}:
        blockers.append(f"strategy grade is {grade}")
    if profit_factor < 1.2:
        blockers.append("profit factor is below 1.20")
    if sharpe < 0.5:
        blockers.append("Sharpe ratio is below 0.50")
    if not survives_deflation:
        blockers.append("deflated Sharpe does not pass overfitting threshold")
    if walk_forward_methodology != "fit_freeze_evaluate" or not parameters_frozen:
        blockers.append("fitted walk-forward validation was not executed")
    elif walk_forward_efficiency < 0.35:
        blockers.append("fitted walk-forward efficiency is below 0.35")

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
    require_confinement: bool = False,
) -> dict[str, Any]:
    """Run the full agent-ready strategy due diligence workflow."""
    df, source = load_trade_export(csv_path, require_confinement=require_confinement)

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
        "walk_forward_methodology": walk_forward.methodology,
        "walk_forward_parameters_frozen": walk_forward.parameters_frozen,
        "walk_forward_oos_overlap_count": walk_forward.oos_overlap_count,
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
    return _json_dict(result)


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
    return _json_dict({"sources": sources, "comparison": matrix})


def generate_strategy_report(
    csv_path: str | Path,
    *,
    output_dir: str | Path | None = None,
    title: str | None = None,
    require_confinement: bool = False,
) -> dict[str, Any]:
    """Generate an HTML research report and return its path plus quick summary."""
    df, source = load_trade_export(csv_path, require_confinement=require_confinement)
    in_path = Path(source["path"])
    if require_confinement and output_dir is None:
        raise PermissionError("A confined output directory is required")
    out_dir = resolve_confined_output_directory(
        output_dir if output_dir is not None else in_path.parent / "nexural_reports",
        require_configured_roots=require_confinement,
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    report_title = title or f"Nexural Research Report - {source['filename']}"
    out_path = out_dir / f"{in_path.stem}_nexural_report.html"
    if out_path.is_symlink() or (out_path.exists() and not out_path.is_file()):
        raise PermissionError("Report target is not a safe regular file")
    report_html = build_trades_report_html(df, title=report_title)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=out_dir,
            prefix=".nexural-report-",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary.write(report_html)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_name = temporary.name
        Path(temporary_name).replace(out_path)
    finally:
        if temporary_name:
            Path(temporary_name).unlink(missing_ok=True)

    core = metrics_from_trades(df)
    return _json_dict(
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
    require_confinement: bool = False,
) -> dict[str, Any]:
    """Run the institutional gauntlet on a supported trade-export CSV."""
    df, source = load_trade_export(csv_path, require_confinement=require_confinement)
    report = run_trade_gauntlet(
        df,
        strategy_name=strategy_name,
        symbol=symbol,
        min_trades=min_trades,
        n_trials=n_trials,
        cost_stress_profile=cost_stress_profile,
    )
    return _json_dict({"source": source, "gauntlet": report})


def estimate_strategy_costs(
    *,
    symbol: str,
    trades: int,
    quantity: float = 1.0,
    slippage_multiplier: float = 1.0,
    stress_profile: str = "normal",
) -> dict[str, Any]:
    """Estimate realistic futures round-turn costs for strategy planning."""
    return _json_dict(
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
    return _json_dict(
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
    return _json_dict(scaffold_bridge(name=name, output_dir=output_dir, overwrite=overwrite))
