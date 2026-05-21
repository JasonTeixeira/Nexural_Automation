"""Validation contracts for public strategy and bridge contributions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

VALID_PLATFORMS = {"python", "ninjatrader", "tradingview"}
VALID_PROMOTION_GATES = {"PROMOTE_TO_PAPER", "REJECT", "TUNE", "REWRITE"}
REQUIRED_STRATEGY_FIELDS = {
    "schema_version",
    "slug",
    "name",
    "platform",
    "status",
    "asset_class",
    "symbols",
    "lookahead_policy",
    "promotion_gate",
}
REQUIRED_BRIDGE_METHODS = {"health", "send_signal", "flatten"}
REQUIRED_BRIDGE_PROOFS = {
    "health_check",
    "paper_signal_roundtrip",
    "flatten_ack",
    "kill_switch_ack",
    "fill_reconciliation",
}


def _read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"YAML document must be an object: {path}")
    return data


def validate_strategy_metadata(path: str | Path) -> dict[str, Any]:
    """Validate a strategy metadata.yaml file and return a JSON-safe report."""
    metadata_path = Path(path).expanduser().resolve()
    metadata = _read_yaml(metadata_path)
    errors: list[str] = []
    warnings: list[str] = []

    missing = sorted(REQUIRED_STRATEGY_FIELDS.difference(metadata))
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")

    if metadata.get("schema_version") != 1:
        errors.append("schema_version must be 1")

    platform = str(metadata.get("platform", "")).lower()
    if platform not in VALID_PLATFORMS:
        errors.append(f"platform must be one of {sorted(VALID_PLATFORMS)}")

    symbols = metadata.get("symbols")
    if not isinstance(symbols, list) or not symbols or not all(isinstance(s, str) for s in symbols):
        errors.append("symbols must be a non-empty list of strings")

    if metadata.get("promotion_gate") not in VALID_PROMOTION_GATES:
        errors.append(f"promotion_gate must be one of {sorted(VALID_PROMOTION_GATES)}")

    lookahead_policy = str(metadata.get("lookahead_policy", "")).lower()
    if "next_bar" not in lookahead_policy and "bar_close" not in lookahead_policy:
        errors.append("lookahead_policy must explicitly require next-bar or bar-close execution")

    if metadata.get("status") == "live":
        errors.append("public examples cannot declare live status")

    if not (metadata_path.parent / "validation.md").exists():
        warnings.append("validation.md is missing next to metadata.yaml")
    if not (metadata_path.parent / "parameters.md").exists():
        warnings.append("parameters.md is missing next to metadata.yaml")

    return {
        "path": str(metadata_path),
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "metadata": metadata,
    }


def validate_bridge_contract(path: str | Path) -> dict[str, Any]:
    """Validate a bridge_contract.json file and return a JSON-safe report."""
    contract_path = Path(path).expanduser().resolve()
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    if not isinstance(contract, dict):
        raise ValueError(f"Bridge contract must be an object: {contract_path}")

    errors: list[str] = []
    warnings: list[str] = []
    if contract.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if not str(contract.get("name", "")).strip():
        errors.append("name is required")

    methods = set(contract.get("required_methods") or [])
    missing_methods = sorted(REQUIRED_BRIDGE_METHODS.difference(methods))
    if missing_methods:
        errors.append(f"missing required methods: {', '.join(missing_methods)}")

    proofs = set(contract.get("required_proofs") or [])
    missing_proofs = sorted(REQUIRED_BRIDGE_PROOFS.difference(proofs))
    if missing_proofs:
        errors.append(f"missing required proofs: {', '.join(missing_proofs)}")

    if not (contract_path.parent / "README.md").exists():
        warnings.append("README.md is missing next to bridge_contract.json")

    return {
        "path": str(contract_path),
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "contract": contract,
    }
