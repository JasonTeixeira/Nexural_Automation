"""Institutional strategy gauntlet for trade-export validation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

from nexural_research.analyze.advanced_robustness import (
    RollingWalkForwardResult,
    deflated_sharpe_ratio,
    rolling_walk_forward,
)
from nexural_research.analyze.annualization import annualized_sharpe
from nexural_research.cost_model import CostModel


@dataclass(frozen=True)
class GauntletReport:
    strategy_name: str
    passed: bool
    n_passed: int
    n_failed: int
    score: float
    decision: str
    checks: list[dict[str, Any]]


def _pnl(df: pd.DataFrame) -> np.ndarray:
    return np.asarray(
        pd.to_numeric(df["profit"], errors="coerce").fillna(0.0).to_numpy(dtype=float),
        dtype=float,
    )


def _sharpe(values: np.ndarray) -> float:
    """Unannualized observation Sharpe for timestamp-free bootstrap samples."""
    return annualized_sharpe(np.asarray(values, dtype=float), periods_per_year=1.0)


def _profit_factor(values: np.ndarray) -> float:
    gains = float(values[values > 0].sum())
    losses = abs(float(values[values < 0].sum()))
    if losses <= 0:
        return float("inf") if gains > 0 else 0.0
    return gains / losses


def _max_drawdown(values: np.ndarray) -> float:
    if len(values) == 0:
        return 0.0
    equity = np.cumsum(values)
    return float(np.min(equity - np.maximum.accumulate(equity)))


def _bootstrap_sharpe_lower(values: np.ndarray, *, seed: int, n_bootstrap: int = 1000) -> float:
    if len(values) < 10:
        return 0.0
    rng = np.random.default_rng(seed)
    sharpes = np.zeros(n_bootstrap)
    for i in range(n_bootstrap):
        sample = rng.choice(values, size=len(values), replace=True)
        sharpes[i] = _sharpe(sample)
    return float(np.percentile(sharpes, 2.5))


def _shuffle_p_value(values: np.ndarray, *, seed: int, n_simulations: int = 1000) -> float:
    if len(values) < 10:
        return 1.0
    observed = _max_drawdown(values)
    rng = np.random.default_rng(seed)
    worse_or_equal = 0
    for _ in range(n_simulations):
        shuffled = rng.permutation(values)
        if _max_drawdown(shuffled) <= observed:
            worse_or_equal += 1
    return float(worse_or_equal / n_simulations)


def run_trade_gauntlet(
    df_trades: pd.DataFrame,
    *,
    strategy_name: str = "strategy",
    symbol: str = "ES",
    min_trades: int = 100,
    n_trials: int = 100,
    seed: int = 42,
    cost_stress_profile: str = "elevated",
    fitted_walk_forward: RollingWalkForwardResult | None = None,
) -> GauntletReport:
    """Run a 10-check gauntlet on normalized trade PnL."""
    values = _pnl(df_trades)
    checks: list[dict[str, Any]] = []

    def add(
        name: str,
        passed: bool,
        value: float | str,
        threshold: float | str,
        detail: str,
    ) -> None:
        checks.append(
            {
                "name": name,
                "passed": bool(passed),
                "value": value,
                "threshold": threshold,
                "detail": detail,
            }
        )

    trade_count = int(len(values))
    add(
        "trade_count",
        trade_count >= min_trades,
        float(trade_count),
        f">= {min_trades}",
        "Minimum sample size.",
    )

    dsr = deflated_sharpe_ratio(df_trades, n_trials=n_trials)
    add(
        "deflated_sharpe",
        bool(dsr.is_significant),
        float(dsr.p_value),
        "< 0.05 p-value",
        f"{dsr.interpretation} Basis: {dsr.annualization_basis}.",
    )

    pf = _profit_factor(values)
    add(
        "profit_factor",
        pf >= 1.30,
        round(min(pf, 999.0), 4),
        ">= 1.30",
        "Gross profit must materially exceed gross loss.",
    )

    temporal_stability = rolling_walk_forward(df_trades, n_windows=5)
    if fitted_walk_forward is None:
        add(
            "walk_forward_validation",
            False,
            "not_evaluated",
            "fit on IS, freeze parameters, evaluate disjoint OOS folds",
            (
                "Trade exports cannot prove fitted walk-forward validity. The descriptive "
                f"temporal stability result ({temporal_stability.walk_forward_efficiency:.4f}) "
                "is not a promotion gate. Supply a trusted fit/evaluate adapter."
            ),
        )
    else:
        valid_method = (
            fitted_walk_forward.parameters_frozen
            and fitted_walk_forward.methodology == "fit_freeze_evaluate"
            and fitted_walk_forward.oos_overlap_count == 0
        )
        add(
            "walk_forward_validation",
            bool(
                valid_method
                and fitted_walk_forward.walk_forward_efficiency >= 0.50
                and fitted_walk_forward.aggregate_oos_net > 0
            ),
            fitted_walk_forward.walk_forward_efficiency,
            ">= 0.50, OOS net > 0, frozen parameters, zero OOS overlap",
            (
                f"{fitted_walk_forward.methodology}; frozen="
                f"{fitted_walk_forward.parameters_frozen}; OOS overlap="
                f"{fitted_walk_forward.oos_overlap_count}; purge="
                f"{fitted_walk_forward.purge_size}; embargo="
                f"{fitted_walk_forward.embargo_size}."
            ),
        )

    lower = _bootstrap_sharpe_lower(values, seed=seed)
    add(
        "bootstrap_sharpe_ci",
        lower > 0.0,
        round(lower, 4),
        "> 0",
        "Lower 95% bootstrap Sharpe bound.",
    )

    shuffle_p = _shuffle_p_value(values, seed=seed)
    add(
        "monte_carlo_path",
        shuffle_p < 0.95,
        round(shuffle_p, 4),
        "< 0.95",
        "Path reshuffle should not expose fragile drawdown.",
    )

    skew = float(scipy_stats.skew(values)) if len(values) >= 3 else 0.0
    add(
        "tail_shape",
        skew > -1.5,
        round(skew, 4),
        "> -1.50 skew",
        "Rejects severe left-tail dependency.",
    )

    recent = values[int(len(values) * 0.75) :] if len(values) else values
    recent_sharpe = _sharpe(recent)
    add(
        "recency",
        recent_sharpe > 0.0,
        round(recent_sharpe, 4),
        "> 0",
        "Last quartile should still show positive edge.",
    )

    dd = abs(_max_drawdown(values))
    net = float(values.sum())
    dd_ratio = dd / max(abs(net), 1e-9)
    add(
        "drawdown_to_net",
        net > 0 and dd_ratio <= 3.0,
        round(dd_ratio, 4),
        "<= 3.0",
        "Drawdown cannot dwarf net profit.",
    )

    try:
        model = CostModel(symbol, stress_profile=cost_stress_profile)
        stressed = np.asarray(
            model.apply_round_turn_costs(values.tolist()),
            dtype=float,
        )
        stressed_net = float(stressed.sum())
        add(
            "cost_stress",
            stressed_net > 0,
            round(stressed_net, 2),
            "> 0 stressed net",
            f"{cost_stress_profile} futures cost profile applied to {symbol}.",
        )
    except Exception as exc:
        add("cost_stress", False, "error", "> 0 stressed net", str(exc))

    n_passed = sum(1 for item in checks if item["passed"])
    n_failed = len(checks) - n_passed
    score = round(100.0 * n_passed / max(len(checks), 1), 2)
    hard_failures = {item["name"] for item in checks if not item["passed"]}
    if n_failed == 0:
        decision = "PROMOTE_TO_PAPER"
    elif hard_failures.intersection({"deflated_sharpe", "walk_forward_validation", "cost_stress"}):
        decision = "REJECT"
    elif score >= 70:
        decision = "TUNE"
    else:
        decision = "REWRITE"

    return GauntletReport(
        strategy_name=strategy_name,
        passed=n_failed == 0,
        n_passed=n_passed,
        n_failed=n_failed,
        score=score,
        decision=decision,
        checks=checks,
    )
