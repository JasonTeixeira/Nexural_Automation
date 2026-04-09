"""Export and report generation endpoints."""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, Depends, Query

from nexural_research.api.auth import require_auth
from fastapi.responses import HTMLResponse, Response, StreamingResponse

from nexural_research.analyze.advanced_metrics import comprehensive_analysis
from nexural_research.analyze.advanced_robustness import deflated_sharpe_ratio, regime_analysis
from nexural_research.analyze.equity import equity_curve_from_trades
from nexural_research.analyze.improvements import generate_improvement_report
from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.analyze.portfolio import benchmark_comparison
from nexural_research.api.sessions import get_trades, safe_serialize, sessions
from nexural_research.report.html import build_trades_report_html

router = APIRouter(tags=["export"], dependencies=[Depends(require_auth)])


@router.get("/export/json")
def export_json(session_id: str = Query(default="default")):
    """Export all metrics as a single JSON payload."""
    df = get_trades(session_id)
    comp = comprehensive_analysis(df)
    dsr = deflated_sharpe_ratio(df)
    reg = regime_analysis(df)
    bm = benchmark_comparison(df, n_random_sims=500)
    improvements = generate_improvement_report(df)
    core = metrics_from_trades(df)

    return {
        "core_metrics": safe_serialize(core),
        "risk_return": safe_serialize(comp.risk_return),
        "expectancy": safe_serialize(comp.expectancy),
        "dependency": safe_serialize(comp.dependency),
        "distribution": safe_serialize(comp.distribution),
        "time_decay": safe_serialize(comp.time_decay),
        "institutional": safe_serialize(comp.institutional),
        "deflated_sharpe": safe_serialize(dsr),
        "regime": safe_serialize(reg),
        "benchmark": safe_serialize(bm),
        "improvements": safe_serialize(improvements),
    }


@router.get("/export/csv")
def export_csv(session_id: str = Query(default="default"), filtered: bool = Query(default=False)):
    """Export trades as CSV. If filtered=true, applies recommended time filters."""
    df = get_trades(session_id)

    if filtered:
        report = generate_improvement_report(df)
        tf = report.time_filter
        if tf and (tf.hours_to_remove or tf.days_to_remove):
            ts_col = "exit_time" if "exit_time" in df.columns else "entry_time"
            if ts_col in df.columns:
                ts = pd.to_datetime(df[ts_col], errors="coerce")
                mask = ~(ts.dt.hour.isin(tf.hours_to_remove) | ts.dt.day_name().isin(tf.days_to_remove))
                df = df[mask].copy()

    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    filename = f"trades_{'filtered' if filtered else 'full'}_{session_id}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/comparison")
def export_comparison(session_a: str = Query(...), session_b: str = Query(...)):
    """Compare two sessions side-by-side."""
    df_a = get_trades(session_a)
    df_b = get_trades(session_b)

    comp_a = comprehensive_analysis(df_a)
    comp_b = comprehensive_analysis(df_b)
    core_a = metrics_from_trades(df_a)
    core_b = metrics_from_trades(df_b)
    imp_a = generate_improvement_report(df_a)
    imp_b = generate_improvement_report(df_b)

    def delta(a: float, b: float) -> dict:
        diff = b - a
        pct = (diff / abs(a) * 100) if abs(a) > 1e-10 else 0.0
        return {"a": round(a, 4), "b": round(b, 4), "delta": round(diff, 4), "pct_change": round(pct, 2)}

    return {
        "session_a": session_a,
        "session_b": session_b,
        "trades": {"a": len(df_a), "b": len(df_b)},
        "grade": {"a": imp_a.overall_grade, "b": imp_b.overall_grade},
        "net_profit": delta(core_a.net_profit, core_b.net_profit),
        "win_rate": delta(core_a.win_rate, core_b.win_rate),
        "profit_factor": delta(core_a.profit_factor, core_b.profit_factor),
        "max_drawdown": delta(core_a.max_drawdown, core_b.max_drawdown),
        "sharpe": delta(comp_a.risk_return.sharpe_ratio, comp_b.risk_return.sharpe_ratio),
        "sortino": delta(comp_a.risk_return.sortino_ratio, comp_b.risk_return.sortino_ratio),
        "calmar": delta(comp_a.risk_return.calmar_ratio, comp_b.risk_return.calmar_ratio),
        "expectancy": delta(comp_a.expectancy.expectancy, comp_b.expectancy.expectancy),
        "kelly": delta(comp_a.expectancy.kelly_pct, comp_b.expectancy.kelly_pct),
        "equity_a": safe_serialize(equity_curve_from_trades(df_a)),
        "equity_b": safe_serialize(equity_curve_from_trades(df_b)),
    }


@router.get("/compare/matrix")
def compare_matrix(session_ids: str = Query(..., description="Comma-separated session IDs to compare")):
    """Compare 2-10 strategies side-by-side with ranked composite scoring."""
    from nexural_research.analyze.comparison import compare_strategies

    ids = [s.strip() for s in session_ids.split(",") if s.strip()]
    if len(ids) < 2:
        from fastapi import HTTPException
        raise HTTPException(400, "Need at least 2 session IDs to compare (comma-separated)")
    if len(ids) > 10:
        from fastapi import HTTPException
        raise HTTPException(400, "Maximum 10 strategies for comparison")

    strategy_data = []
    for sid in ids:
        if sid not in sessions:
            from fastapi import HTTPException
            raise HTTPException(404, f"Session not found: {sid}")
        s = sessions[sid]
        if s["kind"] != "trades":
            from fastapi import HTTPException
            raise HTTPException(400, f"Session {sid} is not trades data")
        strategy_data.append((sid, s.get("filename", sid), s["df"]))

    result = compare_strategies(strategy_data)
    return safe_serialize(result)


@router.get("/export/excel")
def export_excel(session_id: str = Query(default="default")):
    """Export multi-sheet Excel workbook with full analysis."""
    df = get_trades(session_id)
    from nexural_research.export.excel import generate_excel_report
    content = generate_excel_report(df)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=nexural_report_{session_id}.xlsx"},
    )


@router.get("/export/pdf-report", response_class=HTMLResponse)
def export_pdf_report(session_id: str = Query(default="default"), title: str = Query(default="Strategy Analysis Report")):
    """Generate professional PDF-ready HTML report with executive summary, metrics, recommendations, and stress tests."""
    df = get_trades(session_id)
    from nexural_research.export.pdf import generate_pdf_report_html
    html = generate_pdf_report_html(df, title=title)
    return HTMLResponse(content=html)


@router.get("/report/html", response_class=HTMLResponse)
def generate_html_report(session_id: str = Query(default="default"), title: str = Query(default="Nexural Research Report")):
    """Generate a full HTML report."""
    df = get_trades(session_id)
    return HTMLResponse(content=build_trades_report_html(df, title=title))
