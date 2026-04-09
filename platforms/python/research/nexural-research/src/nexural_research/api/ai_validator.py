"""AI Response Validator — cross-references AI claims against actual metric data.

When the AI says "your Sharpe is 2.1" or "consider reducing position to 1.5%",
this module checks whether those numbers actually match the data.

This is the moat — no competitor does this.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from nexural_research.analyze.metrics import metrics_from_trades
from nexural_research.analyze.advanced_metrics import (
    risk_return_metrics,
    expectancy_metrics,
    institutional_metrics,
)


@dataclass
class ValidationResult:
    """Result of validating AI claims against actual data."""
    total_claims: int
    verified: int
    contradicted: int
    unverifiable: int
    details: list[ClaimValidation]
    confidence_score: float  # 0-100, how trustworthy is this AI response


@dataclass
class ClaimValidation:
    """A single validated claim."""
    claim: str
    metric_name: str
    ai_value: float | str
    actual_value: float | str
    status: str  # "verified", "contradicted", "close", "unverifiable"
    difference_pct: float | None = None


def validate_ai_response(response_text: str, df_trades: pd.DataFrame) -> ValidationResult:
    """Extract numeric claims from AI response and verify against actual data."""

    core = metrics_from_trades(df_trades)
    rr = risk_return_metrics(df_trades)
    exp = expectancy_metrics(df_trades)
    inst = institutional_metrics(df_trades)

    # Build lookup of actual values
    actuals: dict[str, float] = {
        "sharpe": rr.sharpe_ratio,
        "sharpe ratio": rr.sharpe_ratio,
        "sortino": rr.sortino_ratio,
        "sortino ratio": rr.sortino_ratio,
        "calmar": rr.calmar_ratio,
        "calmar ratio": rr.calmar_ratio,
        "omega": rr.omega_ratio,
        "omega ratio": rr.omega_ratio,
        "win rate": core.win_rate * 100,
        "win_rate": core.win_rate * 100,
        "profit factor": core.profit_factor,
        "profit_factor": core.profit_factor,
        "net profit": core.net_profit,
        "net_profit": core.net_profit,
        "max drawdown": abs(core.max_drawdown),
        "max_drawdown": abs(core.max_drawdown),
        "drawdown": abs(core.max_drawdown),
        "kelly": exp.kelly_pct,
        "kelly criterion": exp.kelly_pct,
        "kelly_pct": exp.kelly_pct,
        "half kelly": exp.half_kelly_pct,
        "expectancy": exp.expectancy,
        "payoff ratio": exp.payoff_ratio,
        "payoff_ratio": exp.payoff_ratio,
        "optimal f": exp.optimal_f,
        "optimal_f": exp.optimal_f,
        "recovery factor": inst.recovery_factor,
        "recovery_factor": inst.recovery_factor,
        "risk of ruin": rr.risk_of_ruin * 100,
        "risk_of_ruin": rr.risk_of_ruin * 100,
        "trades": float(core.n_trades),
        "total trades": float(core.n_trades),
        "n_trades": float(core.n_trades),
        "avg trade": core.avg_trade,
        "avg_trade": core.avg_trade,
        "avg win": core.avg_win,
        "avg_win": core.avg_win,
        "avg loss": abs(core.avg_loss),
        "avg_loss": abs(core.avg_loss),
        "tail ratio": rr.tail_ratio,
        "gain to pain": rr.gain_to_pain_ratio,
        "cpc ratio": rr.cpc_ratio,
        "var": abs(float(getattr(rr, 'var_95', 0)) if hasattr(rr, 'var_95') else 0),
    }

    # Extract numeric claims from AI response
    # Patterns: "Sharpe ratio of 1.45", "Sharpe is 1.45", "Sharpe: 1.45", "your Sharpe (1.45)"
    claims: list[ClaimValidation] = []

    for metric_name, actual_value in actuals.items():
        if not np.isfinite(actual_value):
            continue

        # Build regex patterns for this metric
        patterns = [
            rf'{re.escape(metric_name)}\s*(?:is|of|=|:)\s*\$?([\d,]+\.?\d*)',
            rf'{re.escape(metric_name)}\s*\(?\$?([\d,]+\.?\d*)\)?',
            rf'{re.escape(metric_name)}\s*(?:ratio|%|percent)?\s*(?:is|of|=|:)\s*\$?([\d,]+\.?\d*)',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, response_text, re.IGNORECASE)
            for match in matches:
                try:
                    ai_val = float(match.group(1).replace(",", ""))
                except (ValueError, IndexError):
                    continue

                if actual_value == 0:
                    if ai_val == 0:
                        status = "verified"
                        diff = 0.0
                    else:
                        status = "contradicted"
                        diff = 100.0
                else:
                    diff = abs(ai_val - actual_value) / abs(actual_value) * 100
                    if diff < 5:
                        status = "verified"
                    elif diff < 20:
                        status = "close"
                    else:
                        status = "contradicted"

                claims.append(ClaimValidation(
                    claim=match.group(0).strip(),
                    metric_name=metric_name,
                    ai_value=ai_val,
                    actual_value=round(actual_value, 4),
                    status=status,
                    difference_pct=round(diff, 1),
                ))
                break  # one match per metric per pattern is enough

    # Deduplicate by metric name (keep first match)
    seen = set()
    unique_claims = []
    for c in claims:
        if c.metric_name not in seen:
            seen.add(c.metric_name)
            unique_claims.append(c)

    verified = sum(1 for c in unique_claims if c.status == "verified")
    contradicted = sum(1 for c in unique_claims if c.status == "contradicted")
    close = sum(1 for c in unique_claims if c.status == "close")

    total = len(unique_claims)
    confidence = 0.0
    if total > 0:
        confidence = round((verified + close * 0.5) / total * 100, 1)

    return ValidationResult(
        total_claims=total,
        verified=verified,
        contradicted=contradicted,
        unverifiable=total - verified - contradicted - close,
        details=unique_claims,
        confidence_score=confidence,
    )


def build_conversation_context(
    df_trades: pd.DataFrame,
    conversation_history: list[dict[str, str]],
    base_context: str,
) -> list[dict[str, str]]:
    """Build multi-turn conversation messages with persistent strategy context.

    The base context (all metrics) is injected into the first user message.
    Follow-up messages reference the same data without re-sending everything.
    """
    messages = []

    for i, msg in enumerate(conversation_history):
        if i == 0 and msg["role"] == "user":
            # First user message gets the full context
            messages.append({
                "role": "user",
                "content": f"{base_context}\n\n---\n\nTrader's question: {msg['content']}",
            })
        else:
            messages.append(msg)

    return messages
