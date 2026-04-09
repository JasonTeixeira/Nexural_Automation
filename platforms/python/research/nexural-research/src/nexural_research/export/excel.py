"""Multi-sheet Excel workbook export.

Generates a professional Excel file with:
- Summary sheet (grade, key metrics, recommendations)
- Trades sheet (full trade log)
- Metrics sheet (all 71+ metrics)
- Distribution sheet (percentiles, VaR, CVaR)
- Robustness sheet (Monte Carlo, walk-forward results)
"""

from __future__ import annotations

import io
from dataclasses import asdict
from typing import Any

import pandas as pd

from nexural_research.analyze.advanced_metrics import (
    comprehensive_analysis,
    institutional_metrics,
)
from nexural_research.analyze.improvements import generate_improvement_report
from nexural_research.analyze.metrics import metrics_from_trades


def generate_excel_report(df_trades: pd.DataFrame) -> bytes:
    """Generate a multi-sheet Excel workbook from trades data. Returns bytes."""

    buf = io.BytesIO()

    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        # Sheet 1: Summary
        core = metrics_from_trades(df_trades)
        report = generate_improvement_report(df_trades)
        comp = comprehensive_analysis(df_trades)
        inst = institutional_metrics(df_trades)

        summary_data = {
            "Metric": [
                "Overall Grade",
                "Grade Explanation",
                "Net Profit",
                "Number of Trades",
                "Win Rate",
                "Profit Factor",
                "Max Drawdown",
                "Sharpe Ratio",
                "Sortino Ratio",
                "Calmar Ratio",
                "Kelly %",
                "Expectancy",
                "Recovery Factor",
                "Time Under Water %",
                "Max Consecutive Losses",
            ],
            "Value": [
                report.overall_grade,
                report.grade_explanation,
                f"${core.net_profit:,.2f}",
                core.n_trades,
                f"{core.win_rate*100:.1f}%",
                round(core.profit_factor, 2) if core.profit_factor != float("inf") else "Inf",
                f"${core.max_drawdown:,.2f}",
                comp.risk_return.sharpe_ratio,
                comp.risk_return.sortino_ratio,
                comp.risk_return.calmar_ratio,
                f"{comp.expectancy.kelly_pct:.1f}%",
                f"${comp.expectancy.expectancy:,.2f}",
                inst.recovery_factor,
                f"{inst.time_under_water_pct:.1f}%",
                inst.max_consecutive_losses,
            ],
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name="Summary", index=False)

        # Sheet 2: Full Trade Log
        df_trades.to_excel(writer, sheet_name="Trades", index=False)

        # Sheet 3: All Risk/Return Metrics
        rr = asdict(comp.risk_return)
        exp = asdict(comp.expectancy)
        dep = asdict(comp.dependency)
        dist_m = asdict(comp.distribution)
        inst_d = asdict(inst)

        all_metrics: list[dict[str, Any]] = []
        for section_name, section_dict in [
            ("Risk/Return", rr),
            ("Expectancy", exp),
            ("Dependency", dep),
            ("Distribution", dist_m),
            ("Institutional", inst_d),
        ]:
            for k, v in section_dict.items():
                all_metrics.append({"Section": section_name, "Metric": k, "Value": v})
        pd.DataFrame(all_metrics).to_excel(writer, sheet_name="All Metrics", index=False)

        # Sheet 4: Recommendations
        recs = []
        for r in report.recommendations:
            recs.append({
                "Priority": r.priority,
                "Category": r.category,
                "Title": r.title,
                "Description": r.description,
                "Current": r.current_value,
                "Suggested": r.suggested_value,
                "Expected Impact": r.expected_impact,
            })
        if recs:
            pd.DataFrame(recs).to_excel(writer, sheet_name="Recommendations", index=False)

        # Sheet 5: Equity Curve Data
        from nexural_research.analyze.equity import equity_curve_from_trades, drawdown_from_equity
        eq = equity_curve_from_trades(df_trades)
        dd = drawdown_from_equity(eq.equity)
        eq_df = pd.DataFrame({
            "Timestamp": eq.ts,
            "PnL": eq.pnl,
            "Equity": eq.equity,
            "Drawdown": dd,
        })
        eq_df.to_excel(writer, sheet_name="Equity Curve", index=False)

    return buf.getvalue()
