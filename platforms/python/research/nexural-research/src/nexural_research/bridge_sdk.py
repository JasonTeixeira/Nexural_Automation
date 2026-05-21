"""Bridge SDK contracts for external automation connectors."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal, Protocol

BridgeStatus = Literal["ready", "degraded", "blocked"]


@dataclass(frozen=True)
class BridgeHealth:
    status: BridgeStatus
    name: str
    checks: list[dict[str, object]]


@dataclass(frozen=True)
class BridgeSignal:
    strategy_name: str
    symbol: str
    side: Literal["BUY", "SELL", "FLAT"]
    quantity: float
    timestamp: str
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class BridgeAck:
    accepted: bool
    bridge: str
    message: str
    external_id: str | None = None


class BridgeConnector(Protocol):
    name: str

    def health(self) -> BridgeHealth:
        ...

    def send_signal(self, signal: BridgeSignal) -> BridgeAck:
        ...

    def flatten(self, symbol: str, reason: str) -> BridgeAck:
        ...


class CsvSignalBridge:
    """Simple bridge that writes validated signals to JSONL for another process."""

    name = "csv_signal_bridge"

    def __init__(self, output_path: str | Path) -> None:
        self.output_path = Path(output_path).expanduser().resolve()

    def health(self) -> BridgeHealth:
        parent_ready = self.output_path.parent.exists()
        return BridgeHealth(
            status="ready" if parent_ready else "blocked",
            name=self.name,
            checks=[
                {
                    "name": "output_parent_exists",
                    "passed": parent_ready,
                    "detail": str(self.output_path.parent),
                }
            ],
        )

    def send_signal(self, signal: BridgeSignal) -> BridgeAck:
        health = self.health()
        if health.status != "ready":
            return BridgeAck(False, self.name, "Bridge output directory is not ready")
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        with self.output_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(asdict(signal), default=str) + "\n")
        return BridgeAck(True, self.name, "Signal written", str(self.output_path))

    def flatten(self, symbol: str, reason: str) -> BridgeAck:
        signal = BridgeSignal(
            strategy_name="bridge_control",
            symbol=symbol,
            side="FLAT",
            quantity=0,
            timestamp="bridge_time",
            metadata={"reason": reason},
        )
        return self.send_signal(signal)


def _slug(value: str) -> str:
    out = re.sub(r"[^a-zA-Z0-9_ -]+", "", value).strip().lower()
    return re.sub(r"[\s-]+", "_", out) or "new_bridge"


def scaffold_bridge(
    *,
    name: str,
    output_dir: str | Path = "bridges",
    overwrite: bool = False,
) -> dict[str, object]:
    slug = _slug(name)
    root = Path(output_dir).expanduser().resolve() / slug
    if root.exists() and not overwrite:
        raise FileExistsError(f"Bridge scaffold already exists: {root}")
    root.mkdir(parents=True, exist_ok=True)
    files = {
        "README.md": f"""# {name}

This bridge must implement the Nexural bridge contract:

- `health()`
- `send_signal(signal)`
- `flatten(symbol, reason)`

Live order routing must stay disabled until health, flatten, kill-switch, and
fill reconciliation pass.
""",
        "bridge_contract.json": json.dumps(
            {
                "schema_version": 1,
                "name": slug,
                "required_methods": ["health", "send_signal", "flatten"],
                "required_proofs": [
                    "health_check",
                    "paper_signal_roundtrip",
                    "flatten_ack",
                    "kill_switch_ack",
                    "fill_reconciliation",
                ],
            },
            indent=2,
        )
        + "\n",
        "bridge.py": _bridge_template(slug),
    }
    written = {}
    for rel, text in files.items():
        path = root / rel
        if path.exists() and not overwrite:
            raise FileExistsError(f"File already exists: {path}")
        path.write_text(text, encoding="utf-8")
        written[rel] = str(path)
    return {"bridge": slug, "root": str(root), "files": sorted(written)}


def _bridge_template(slug: str) -> str:
    cls = "".join(part.capitalize() for part in slug.split("_") if part) or "NewBridge"
    return f'''"""Nexural bridge scaffold."""

from nexural_research.bridge_sdk import BridgeAck, BridgeHealth, BridgeSignal


class {cls}:
    name = "{slug}"

    def health(self) -> BridgeHealth:
        return BridgeHealth(
            status="blocked",
            name=self.name,
            checks=[
                {{"name": "implemented", "passed": False, "detail": "Replace scaffold logic."}},
            ],
        )

    def send_signal(self, signal: BridgeSignal) -> BridgeAck:
        return BridgeAck(False, self.name, "send_signal not implemented")

    def flatten(self, symbol: str, reason: str) -> BridgeAck:
        return BridgeAck(False, self.name, "flatten not implemented")
'''
