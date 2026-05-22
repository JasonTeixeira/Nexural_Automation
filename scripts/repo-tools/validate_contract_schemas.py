from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator


def load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_many(repo_root: Path) -> list[str]:
    strategy_schema = load_json(repo_root / "schemas" / "strategy-metadata.schema.json")
    bridge_schema = load_json(repo_root / "schemas" / "bridge-contract.schema.json")
    strategy_validator = Draft202012Validator(strategy_schema)
    bridge_validator = Draft202012Validator(bridge_schema)

    errors: list[str] = []
    for path in sorted(repo_root.glob("platforms/python/research/examples/strategies/**/metadata.yaml")):
        data = load_yaml(path)
        for error in strategy_validator.iter_errors(data):
            errors.append(f"{path}: {error.message}")

    for path in sorted(repo_root.glob("platforms/python/research/examples/bridges/**/bridge_contract.json")):
        data = load_json(path)
        for error in bridge_validator.iter_errors(data):
            errors.append(f"{path}: {error.message}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate public strategy and bridge schemas.")
    parser.add_argument("--repo-root", default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    errors = validate_many(repo_root)
    if errors:
        print("Schema validation failed:")
        print("\n".join(errors))
        return 1

    print("Schema validation passed for public strategy and bridge examples.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

