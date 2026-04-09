"""PDF report generation — professional institutional-grade strategy report.

Generates a self-contained HTML report and converts to PDF-ready format.
Uses the existing HTML report builder as foundation, enhanced with
executive summary, grading, and recommendations.

Note: For actual PDF generation, the frontend or a tool like weasyprint/puppeteer
converts the HTML. This module generates the enhanced HTML content.
"""

from __future__ import annotations

from dataclasses import asdict

import pandas as pd

from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.analyze.advanced_metrics import (
    comprehensive_analysis,
    institutional_metrics,
)
from nexural_research.analyze.advanced_analytics import hurst_exponent, information_ratio
from nexural_research.analyze.improvements import generate_improvement_report
from nexural_research.analyze.stress_testing import tail_amplification_stress_test


def generate_pdf_report_html(
    df_trades: pd.DataFrame,
    *,
    title: str = "Strategy Analysis Report",
    analyst: str = "Nexural Research v2.0",
) -> str:
    """Generate a comprehensive HTML report designed for PDF conversion.

    Returns self-contained HTML with inline CSS, ready for print or PDF export.
    """

    core = metrics_from_trades(df_trades)
    comp = comprehensive_analysis(df_trades)
    inst = institutional_metrics(df_trades)
    improvements = generate_improvement_report(df_trades)
    hurst = hurst_exponent(df_trades)
    ir = information_ratio(df_trades)
    stress = tail_amplification_stress_test(df_trades)

    rr = comp.risk_return
    exp = comp.expectancy
    dist = comp.distribution

    grade = improvements.overall_grade
    grade_colors = {"A": "#10b981", "B+": "#3b82f6", "B": "#3b82f6", "C": "#f59e0b", "D": "#f97316", "F": "#ef4444"}
    grade_color = grade_colors.get(grade, grade_colors.get(grade[0], "#6b7280"))

    # Build recommendations HTML
    recs_html = ""
    for r in improvements.recommendations[:8]:
        priority_color = {"critical": "#ef4444", "high": "#f97316", "medium": "#f59e0b", "low": "#6b7280"}.get(r.priority, "#6b7280")
        recs_html += f"""
        <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><span style="color:{priority_color};font-weight:600;text-transform:uppercase;font-size:11px;">{r.priority}</span></td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:500;">{r.title}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">{r.description[:120]}</td>
        </tr>"""

    # Stress scenarios HTML
    stress_html = ""
    for s in stress.scenarios[:6]:
        survive = "Yes" if s.still_profitable else "NO"
        survive_color = "#10b981" if s.still_profitable else "#ef4444"
        stress_html += f"""
        <tr>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-size:12px;">{s.label}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${s.adjusted_net:,.2f}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${s.adjusted_mdd:,.2f}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;color:{survive_color};font-weight:600;">{survive}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
    @page {{ size: A4; margin: 1.5cm; }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.5; }}
    .page {{ page-break-after: always; padding: 20px; }}
    .page:last-child {{ page-break-after: avoid; }}
    h1 {{ font-size: 24px; font-weight: 700; margin-bottom: 4px; }}
    h2 {{ font-size: 16px; font-weight: 600; margin: 20px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }}
    h3 {{ font-size: 13px; font-weight: 600; margin: 12px 0 6px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #111827; }}
    .grade {{ display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 12px; font-size: 28px; font-weight: 800; color: white; }}
    .metrics-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }}
    .metric {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }}
    .metric-label {{ font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }}
    .metric-value {{ font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }}
    .metric-value.positive {{ color: #10b981; }}
    .metric-value.negative {{ color: #ef4444; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
    th {{ text-align: left; padding: 8px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; color: #6b7280; }}
    .disclaimer {{ margin-top: 30px; padding: 12px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; font-size: 10px; color: #92400e; }}
    .footer {{ margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; }}
</style>
</head>
<body>

<!-- PAGE 1: Executive Summary -->
<div class="page">
    <div class="header">
        <div>
            <h1>{title}</h1>
            <p style="color:#6b7280;font-size:12px;">Generated by {analyst} | {core.n_trades} trades analyzed</p>
        </div>
        <div style="text-align:right;">
            <div class="grade" style="background:{grade_color};">{grade}</div>
            <p style="font-size:10px;color:#6b7280;margin-top:4px;">{improvements.grade_explanation}</p>
        </div>
    </div>

    <h2>Key Performance Metrics</h2>
    <div class="metrics-grid">
        <div class="metric">
            <div class="metric-label">Net Profit</div>
            <div class="metric-value {'positive' if core.net_profit >= 0 else 'negative'}">${core.net_profit:,.2f}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value">{core.win_rate*100:.1f}%</div>
        </div>
        <div class="metric">
            <div class="metric-label">Profit Factor</div>
            <div class="metric-value">{core.profit_factor:.2f}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Max Drawdown</div>
            <div class="metric-value negative">${core.max_drawdown:,.2f}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Sharpe Ratio</div>
            <div class="metric-value">{rr.sharpe_ratio}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Sortino Ratio</div>
            <div class="metric-value">{rr.sortino_ratio}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Kelly %</div>
            <div class="metric-value">{exp.kelly_pct:.1f}%</div>
        </div>
        <div class="metric">
            <div class="metric-label">Recovery Factor</div>
            <div class="metric-value">{inst.recovery_factor}</div>
        </div>
    </div>

    <h2>Risk-Adjusted Performance</h2>
    <div class="metrics-grid">
        <div class="metric">
            <div class="metric-label">Calmar Ratio</div>
            <div class="metric-value">{rr.calmar_ratio}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Omega Ratio</div>
            <div class="metric-value">{rr.omega_ratio}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Expectancy</div>
            <div class="metric-value">${exp.expectancy:,.2f}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Risk of Ruin</div>
            <div class="metric-value">{rr.risk_of_ruin*100:.2f}%</div>
        </div>
    </div>

    <h2>Strategy Character</h2>
    <div class="metrics-grid">
        <div class="metric">
            <div class="metric-label">Hurst Exponent</div>
            <div class="metric-value">{hurst.hurst_exponent} ({hurst.regime})</div>
        </div>
        <div class="metric">
            <div class="metric-label">Information Ratio</div>
            <div class="metric-value">{ir.information_ratio}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Time Under Water</div>
            <div class="metric-value">{inst.time_under_water_pct:.1f}%</div>
        </div>
        <div class="metric">
            <div class="metric-label">Profit/Day</div>
            <div class="metric-value">${inst.profit_per_day:,.2f}</div>
        </div>
    </div>

    <h2>Distribution</h2>
    <div class="metrics-grid">
        <div class="metric">
            <div class="metric-label">Skewness</div>
            <div class="metric-value">{dist.skewness}</div>
        </div>
        <div class="metric">
            <div class="metric-label">Kurtosis</div>
            <div class="metric-value">{dist.kurtosis}</div>
        </div>
        <div class="metric">
            <div class="metric-label">VaR 95%</div>
            <div class="metric-value negative">${dist.var_95:,.2f}</div>
        </div>
        <div class="metric">
            <div class="metric-label">CVaR 95%</div>
            <div class="metric-value negative">${dist.cvar_95:,.2f}</div>
        </div>
    </div>
</div>

<!-- PAGE 2: Recommendations & Stress Testing -->
<div class="page">
    <h2>Recommendations</h2>
    <table>
        <thead><tr><th>Priority</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>{recs_html}</tbody>
    </table>

    <h2>Tail Stress Testing</h2>
    <p style="margin-bottom:8px;color:#6b7280;font-size:12px;">What if your worst trades were worse than backtested?</p>
    <table>
        <thead><tr><th>Scenario</th><th>Adjusted Net</th><th>Adjusted MDD</th><th>Survives?</th></tr></thead>
        <tbody>{stress_html}</tbody>
    </table>
    <p style="margin-top:8px;font-size:12px;color:#6b7280;">{stress.interpretation}</p>

    <div class="disclaimer">
        <strong>Disclaimer:</strong> This report is generated from backtested trade data and is for research purposes only.
        Past performance does not guarantee future results. All trading involves risk of loss.
        Metrics are calculated from the provided CSV data and have not been independently verified.
        This is not financial advice.
    </div>

    <div class="footer">
        Generated by Nexural Research v2.0 | Institutional Strategy Analysis Engine
    </div>
</div>

</body>
</html>"""

    return html
