from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(repo_root: Path) -> list[str]:
    schema_path = repo_root / "schemas" / "beta-evidence.schema.json"
    schema = load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors: list[str] = []
    for path in sorted((repo_root / "beta" / "evidence").glob("*.json")):
        for error in validator.iter_errors(load_json(path)):
            location = ".".join(str(part) for part in error.absolute_path) or "root"
            errors.append(f"{path}:{location}: {error.message}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate pseudonymous NT8 beta evidence.")
    parser.add_argument("--repo-root", default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    errors = validate(Path(args.repo_root).resolve())
    if errors:
        print("Beta evidence validation failed:")
        print("\n".join(errors))
        return 1
    print("Beta evidence schema and submitted evidence are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
