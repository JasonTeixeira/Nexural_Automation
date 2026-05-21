"""Educational NinjaTrader CSV bridge example."""

from __future__ import annotations

from pathlib import Path

from nexural_research.bridge_sdk import BridgeSignal, CsvSignalBridge


def write_example_signal(output_path: str | Path) -> None:
    bridge = CsvSignalBridge(output_path)
    ack = bridge.send_signal(
        BridgeSignal(
            strategy_name="opening_range_failure",
            symbol="NQ",
            side="BUY",
            quantity=1,
            timestamp="2026-01-01T14:30:00Z",
            metadata={"mode": "paper"},
        )
    )
    if not ack.accepted:
        raise RuntimeError(ack.message)
