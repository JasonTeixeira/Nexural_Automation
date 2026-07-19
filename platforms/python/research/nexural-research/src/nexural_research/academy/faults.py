"""Seeded fault profiles for safe automation failure labs."""

from __future__ import annotations

import copy
import random
from collections.abc import Callable, Sequence
from typing import Any

FaultHandler = Callable[[list[dict[str, Any]], random.Random], list[dict[str, Any]]]


class FaultInjector:
    def __init__(self) -> None:
        self.profiles: dict[str, FaultHandler] = {
            "disconnect": self._disconnect,
            "duplicate": self._duplicate,
            "latency": self._latency,
            "partial_fill": self._partial_fill,
            "stale_data": self._stale_data,
        }

    def register(self, name: str, handler: FaultHandler) -> None:
        if not name or name in self.profiles:
            raise ValueError(f"Fault profile already exists or is invalid: {name}")
        self.profiles[name] = handler

    def apply(
        self,
        profile: str,
        events: Sequence[dict[str, Any]],
        *,
        seed: int = 0,
    ) -> list[dict[str, Any]]:
        try:
            handler = self.profiles[profile]
        except KeyError as exc:
            raise KeyError(f"Unknown fault profile: {profile}") from exc
        # Deliberately reproducible simulation, never used for secrets or security decisions.
        return handler(copy.deepcopy(list(events)), random.Random(seed))  # nosec B311

    @staticmethod
    def _disconnect(events: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
        index = rng.randrange(len(events) + 1)
        return events[:index] + [{"fault": "disconnect", "after_index": index - 1}]

    @staticmethod
    def _duplicate(events: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
        if not events:
            return []
        index = rng.randrange(len(events))
        duplicate = copy.deepcopy(events[index])
        duplicate["fault"] = "duplicate"
        events.insert(index + 1, duplicate)
        return events

    @staticmethod
    def _latency(events: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
        for event in events:
            event["delay_ms"] = rng.choice((50, 100, 250, 500))
            event["fault"] = "latency"
        return events

    @staticmethod
    def _partial_fill(events: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
        for event in events:
            quantity = int(event.get("quantity", 1))
            event["filled_quantity"] = rng.randrange(quantity + 1)
            event["fault"] = "partial_fill"
        return events

    @staticmethod
    def _stale_data(events: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
        if len(events) < 2:
            return events
        source = rng.randrange(len(events) - 1)
        target = rng.randrange(source + 1, len(events))
        events[target] = copy.deepcopy(events[source])
        events[target]["fault"] = "stale_data"
        return events
