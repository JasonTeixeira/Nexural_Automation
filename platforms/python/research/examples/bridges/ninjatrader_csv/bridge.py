"""Educational NinjaTrader CSV bridge example."""

from __future__ import annotations

from pathlib import Path

from nexural_research.bridge_sdk import BridgeFill, BridgeSignal, CsvSignalBridge


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


def run_lifecycle_proof(output_path: str | Path) -> dict[str, bool]:
    bridge = CsvSignalBridge(output_path)
    signal_ack = bridge.send_signal(
        BridgeSignal(
            strategy_name="opening_range_failure",
            symbol="NQ",
            side="BUY",
            quantity=1,
            timestamp="2026-01-01T14:30:00Z",
            metadata={"mode": "paper", "proof": "paper_signal_roundtrip"},
        )
    )
    flatten_ack = bridge.flatten("NQ", "end_of_session")
    kill_ack = bridge.kill_switch("operator_requested_test")
    reconcile_ack = bridge.reconcile_fills(
        [
            BridgeFill(
                symbol="NQ",
                side="BUY",
                quantity=1,
                price=18000.25,
                timestamp="2026-01-01T14:31:00Z",
                external_id="paper-fill-001",
                metadata={"source": "mock_nt_bridge"},
            )
        ]
    )
    return {
        "health_check": bridge.health().status == "ready",
        "paper_signal_roundtrip": signal_ack.accepted,
        "flatten_ack": flatten_ack.accepted,
        "kill_switch_ack": kill_ack.accepted,
        "fill_reconciliation": reconcile_ack.accepted,
    }
