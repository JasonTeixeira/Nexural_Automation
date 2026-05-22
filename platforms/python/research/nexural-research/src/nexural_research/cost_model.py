"""Futures execution cost model used by public strategy validation."""

from __future__ import annotations

from dataclasses import dataclass


def _fees(
    broker: float,
    exchange: float,
    nfa: float = 0.04,
    clearing: float = 0.30,
) -> dict[str, float]:
    return {
        "broker_fee": broker,
        "exchange_fee": exchange,
        "nfa_fee": nfa,
        "clearing_fee": clearing,
        "commission": round(broker + exchange + nfa + clearing, 2),
    }


INSTRUMENT_COSTS: dict[str, dict[str, float]] = {
    "ES": {**_fees(1.80, 3.00), "half_spread_ticks": 0.25, "tick_value": 12.50},
    "NQ": {**_fees(1.80, 3.00), "half_spread_ticks": 0.50, "tick_value": 5.00},
    "RTY": {**_fees(1.80, 3.00), "half_spread_ticks": 1.00, "tick_value": 5.00},
    "CL": {**_fees(1.80, 3.40), "half_spread_ticks": 1.00, "tick_value": 10.00},
    "GC": {**_fees(1.80, 3.40), "half_spread_ticks": 1.00, "tick_value": 10.00},
    "SI": {**_fees(1.80, 3.40), "half_spread_ticks": 1.00, "tick_value": 25.00},
    "HG": {**_fees(1.80, 3.40), "half_spread_ticks": 1.00, "tick_value": 12.50},
    "ZB": {**_fees(1.80, 2.70), "half_spread_ticks": 1.00, "tick_value": 31.25},
}


@dataclass(frozen=True)
class CostStressProfile:
    name: str
    slippage_multiplier: float = 1.0
    commission_multiplier: float = 1.0
    adverse_ticks: float = 0.0


COST_STRESS_PROFILES: dict[str, CostStressProfile] = {
    "normal": CostStressProfile("normal"),
    "elevated": CostStressProfile("elevated", 1.5, 1.10, 0.25),
    "crisis": CostStressProfile("crisis", 3.0, 1.25, 1.0),
}


def resolve_stress_profile(profile: str | CostStressProfile | None = None) -> CostStressProfile:
    if profile is None:
        return COST_STRESS_PROFILES["normal"]
    if isinstance(profile, CostStressProfile):
        return profile
    key = profile.lower().strip()
    if key not in COST_STRESS_PROFILES:
        raise ValueError(
            f"Unknown cost stress profile '{profile}'. Available: {sorted(COST_STRESS_PROFILES)}"
        )
    return COST_STRESS_PROFILES[key]


class CostModel:
    """Round-turn futures cost model with commission, spread, and stress profiles."""

    def __init__(
        self,
        symbol: str,
        *,
        slippage_multiplier: float = 1.0,
        stress_profile: str | CostStressProfile | None = None,
    ) -> None:
        key = symbol.upper().split()[0]
        if key not in INSTRUMENT_COSTS:
            raise ValueError(f"Unknown symbol '{symbol}'. Available: {sorted(INSTRUMENT_COSTS)}")
        self.symbol = key
        self.spec = INSTRUMENT_COSTS[key]
        self.slippage_multiplier = float(slippage_multiplier)
        self.stress_profile = resolve_stress_profile(stress_profile)

    @property
    def commission_round_turn(self) -> float:
        return float(self.spec["commission"]) * self.stress_profile.commission_multiplier

    @property
    def effective_half_spread_ticks(self) -> float:
        return (
            float(self.spec["half_spread_ticks"])
            * self.slippage_multiplier
            * self.stress_profile.slippage_multiplier
            + self.stress_profile.adverse_ticks
        )

    def round_turn_cost_dollars(self, quantity: float = 1.0) -> float:
        spread = 2.0 * self.effective_half_spread_ticks * float(self.spec["tick_value"])
        return abs(float(quantity)) * (self.commission_round_turn + spread)

    def apply_round_turn_costs(
        self,
        profits: list[float],
        *,
        quantity: float = 1.0,
        already_net: bool = True,
    ) -> list[float]:
        """Return cost-adjusted trade profits.

        If exports are already net of commission, leave ``already_net`` true to
        stress only incremental spread/adverse slippage.
        """
        full_cost = self.round_turn_cost_dollars(quantity)
        base_commission = abs(float(quantity)) * float(self.spec["commission"])
        incremental = full_cost - (base_commission if already_net else 0.0)
        return [float(value) - incremental for value in profits]


def estimate_costs(
    symbol: str,
    *,
    trades: int,
    quantity: float = 1.0,
    slippage_multiplier: float = 1.0,
    stress_profile: str = "normal",
) -> dict[str, float | str]:
    model = CostModel(
        symbol,
        slippage_multiplier=slippage_multiplier,
        stress_profile=stress_profile,
    )
    per_trade = model.round_turn_cost_dollars(quantity)
    return {
        "symbol": model.symbol,
        "stress_profile": model.stress_profile.name,
        "quantity": quantity,
        "trades": trades,
        "commission_round_turn": round(model.commission_round_turn, 2),
        "effective_half_spread_ticks": round(model.effective_half_spread_ticks, 4),
        "round_turn_cost_per_trade": round(per_trade, 2),
        "estimated_total_cost": round(per_trade * max(0, int(trades)), 2),
    }
