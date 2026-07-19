"""Trace-aware, deterministic mentor with escalating local hints."""

from __future__ import annotations

from .models import Hint, LearningItem, TraceEvent


class TraceAwareMentor:
    def hint(
        self,
        item: LearningItem,
        level: int,
        failures: tuple[str, ...],
        events: tuple[TraceEvent, ...] = (),
    ) -> Hint:
        if not item.hints:
            text = (
                "Inspect the last failed safety criterion and reduce the problem to one invariant."
            )
        else:
            index = min(max(level - 1, 0), len(item.hints) - 1)
            text = item.hints[index]
        failed_checks = sum(
            event.event in {"check_failed", "submission_failed"} for event in events
        )
        if failed_checks:
            text = f"{text} This guidance reflects {failed_checks} failed trace event(s)."
        if failures and level > len(item.hints):
            text = f"{text} One unresolved safety invariant remains; inspect behavior, not labels."
        return Hint(item_id=item.id, level=level, text=text)
