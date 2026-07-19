"""Exercise-authoring primitives shared by future CLI and content CI."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

import yaml  # type: ignore[import-untyped]

PACKAGE_FILES = (
    "manifest.yaml",
    "concept.en.md",
    "concept.es.md",
    "starter/program.yaml",
    "tests/visible.yaml",
    "tests/hidden.yaml",
    "solution/program.yaml",
    "expected-trace.json",
    "rubric.yaml",
)
ITEM_ID = re.compile(r"^[a-z][a-z0-9_.-]+$")


@dataclass(frozen=True)
class ValidationReport:
    valid: bool
    errors: tuple[str, ...]


def validate_package(package: str | Path) -> ValidationReport:
    root = Path(package).resolve()
    errors: list[str] = []
    for relative in PACKAGE_FILES:
        path = root / relative
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"missing or empty: {relative}")
    if errors:
        return ValidationReport(False, tuple(errors))

    try:
        manifest = _yaml(root / "manifest.yaml")
        visible = _yaml(root / "tests" / "visible.yaml")
        hidden = _yaml(root / "tests" / "hidden.yaml")
        rubric = _yaml(root / "rubric.yaml")
        expected_trace = json.loads((root / "expected-trace.json").read_text(encoding="utf-8"))
    except (ValueError, yaml.YAMLError, json.JSONDecodeError) as exc:
        return ValidationReport(False, (f"invalid package data: {exc}",))

    if not ITEM_ID.fullmatch(str(manifest.get("id", ""))):
        errors.append("manifest id is invalid")
    translations = manifest.get("translations", {})
    if not isinstance(translations, dict) or not {"en", "es"} <= set(translations):
        errors.append("manifest requires en and es translations")
    execution = manifest.get("execution", {})
    if execution.get("runner") != "nexural.declarative-trace.v1":
        errors.append("unsupported or missing runner")
    visible_ids = _test_ids(visible, errors, "visible")
    hidden_ids = _test_ids(hidden, errors, "hidden")
    rubric_ids = {str(row.get("id")) for row in rubric.get("criteria", ()) if isinstance(row, dict)}
    manifest_rubric_ids = {
        str(row.get("id")) for row in manifest.get("rubric", ()) if isinstance(row, dict)
    }
    if visible_ids | hidden_ids != rubric_ids or rubric_ids != manifest_rubric_ids:
        errors.append("test and rubric ids must match exactly")
    weights = [
        int(row.get("weight", 0)) for row in manifest.get("rubric", ()) if isinstance(row, dict)
    ]
    if sum(weights) != 100:
        errors.append("rubric weights must total 100")
    if not isinstance(expected_trace, dict) or expected_trace.get("status") != "complete":
        errors.append("expected trace must describe a complete run")
    for locale in ("en", "es"):
        concept = (root / f"concept.{locale}.md").read_text(encoding="utf-8")
        for heading in ("## Objectives", "## Exercise", "## Evidence"):
            localized = (
                heading
                if locale == "en"
                else {
                    "## Objectives": "## Objetivos",
                    "## Exercise": "## Ejercicio",
                    "## Evidence": "## Evidencia",
                }[heading]
            )
            if localized not in concept:
                errors.append(f"{locale} concept missing {localized}")
    return ValidationReport(not errors, tuple(errors))


def scaffold_item(
    lessons_root: str | Path,
    *,
    item_id: str,
    track: str,
    title: str,
    title_es: str,
) -> Path:
    """Create a complete, intentionally failing executable exercise skeleton."""
    if not ITEM_ID.fullmatch(item_id):
        raise ValueError("item_id must use lowercase dotted/kebab Academy syntax")
    package = Path(lessons_root).resolve() / item_id.replace(".", "-")
    if package.exists():
        raise FileExistsError(package)
    (package / "starter").mkdir(parents=True)
    (package / "tests").mkdir()
    (package / "solution").mkdir()

    manifest = _manifest_template(item_id, track, title, title_es)
    (package / "manifest.yaml").write_text(
        yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    for locale, localized_title in (("en", title), ("es", title_es)):
        headings = (
            ("Objectives", "Exercise", "Evidence")
            if locale == "en"
            else ("Objetivos", "Ejercicio", "Evidencia")
        )
        (package / f"concept.{locale}.md").write_text(
            f"# {localized_title}\n\n## {headings[0]}\n\n"
            "- Implement the required trace operation.\n"
            f"\n## {headings[1]}\n\nReplace `TODO` in the declarative program.\n"
            f"\n## {headings[2]}\n\nThe runner derives a deterministic trace and hidden check.\n",
            encoding="utf-8",
        )
    starter = {"program": {"operations": ["TODO"], "settings": {"mode": "paper"}}}
    solution = {
        "program": {
            "operations": ["implement_required_behavior", "deduplicate_by_event_id"],
            "settings": {"mode": "paper"},
        }
    }
    for relative, payload in (
        ("starter/program.yaml", starter),
        ("solution/program.yaml", solution),
    ):
        (package / relative).write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    visible = {
        "tests": [
            {
                "id": "trace-complete",
                "path": "trace.status",
                "operator": "equals",
                "expected": "complete",
                "message": "The program must execute without TODO steps.",
            }
        ]
    }
    hidden = {
        "tests": [
            {
                "id": "required-behavior",
                "path": "source.program.operations",
                "operator": "contains",
                "expected": "implement_required_behavior",
                "message": "The hidden behavior contract was not satisfied.",
            },
            {
                "id": "fault-resilience",
                "path": "fault_evidence.duplicate.handled",
                "operator": "equals",
                "expected": True,
                "message": "The duplicate-delivery replay was not handled.",
            },
        ]
    }
    test_files: tuple[tuple[str, dict], ...] = (
        ("tests/visible.yaml", visible),
        ("tests/hidden.yaml", hidden),
    )
    for relative, test_payload in test_files:
        (package / relative).write_text(
            yaml.safe_dump(test_payload, sort_keys=False), encoding="utf-8"
        )
    rubric = {
        "criteria": [
            {"id": "trace-complete", "weight": 30, "evidence": "machine trace"},
            {"id": "required-behavior", "weight": 35, "evidence": "hidden replay"},
            {"id": "fault-resilience", "weight": 35, "evidence": "seeded fault replay"},
        ]
    }
    (package / "rubric.yaml").write_text(yaml.safe_dump(rubric, sort_keys=False), encoding="utf-8")
    (package / "expected-trace.json").write_text(
        json.dumps(
            {
                "status": "complete",
                "operations": ["implement_required_behavior", "deduplicate_by_event_id"],
                "deterministic": True,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return package


def _manifest_template(item_id: str, track: str, title: str, title_es: str) -> dict:
    return {
        "id": item_id,
        "track": track,
        "title": title,
        "updated_at": "2026-07-19",
        "estimated_minutes": 45,
        "objectives": ["Produce machine-verifiable evidence from a deterministic trace."],
        "prerequisites": [],
        "tags": ["executable", "paper-only"],
        "translations": {
            "en": {"title": title, "summary": "Build and verify the required behavior."},
            "es": {
                "title": title_es,
                "summary": "Construye y verifica el comportamiento requerido.",
            },
        },
        "hints": ["Inspect the visible trace contract before changing the program."],
        "execution": {
            "runner": "nexural.declarative-trace.v1",
            "starter": "starter/program.yaml",
            "visible_tests": "tests/visible.yaml",
            "hidden_tests": "tests/hidden.yaml",
            "solution": "solution/program.yaml",
            "expected_trace": "expected-trace.json",
            "fault_profiles": ["duplicate"],
        },
        "rubric": [
            {
                "id": "trace-complete",
                "metric": "tests.trace-complete.passed",
                "operator": "equals",
                "expected": True,
                "weight": 30,
                "visibility": "public",
                "message": "The machine trace did not complete.",
            },
            {
                "id": "required-behavior",
                "metric": "tests.required-behavior.passed",
                "operator": "equals",
                "expected": True,
                "weight": 35,
                "visibility": "hidden",
                "message": "A hidden behavior check failed.",
            },
            {
                "id": "fault-resilience",
                "metric": "fault_evidence.duplicate.handled",
                "operator": "equals",
                "expected": True,
                "weight": 35,
                "visibility": "hidden",
                "message": "The duplicate-delivery replay failed.",
            },
        ],
    }


def _yaml(path: Path) -> dict:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected mapping in {path}")
    return payload


def _test_ids(payload: dict, errors: list[str], visibility: str) -> set[str]:
    rows = payload.get("tests", ())
    if not isinstance(rows, list) or not rows:
        errors.append(f"{visibility} tests must be a non-empty list")
        return set()
    return {str(row.get("id")) for row in rows if isinstance(row, dict)}


def main(argv: list[str] | None = None) -> int:
    """Run the dependency-light exercise authoring CLI."""
    parser = argparse.ArgumentParser(prog="python -m nexural_research.academy.authoring")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("new", help="Scaffold a complete executable lab package")
    create.add_argument("item_id")
    create.add_argument("--root", required=True)
    create.add_argument("--track", required=True)
    create.add_argument("--title", required=True)
    create.add_argument("--title-es", required=True)
    validate = commands.add_parser("validate", help="Validate an executable lab package")
    validate.add_argument("package")
    args = parser.parse_args(argv)
    if args.command == "new":
        package = scaffold_item(
            args.root,
            item_id=args.item_id,
            track=args.track,
            title=args.title,
            title_es=args.title_es,
        )
        print(package)
        return 0
    report = validate_package(args.package)
    if report.valid:
        print("valid")
        return 0
    for error in report.errors:
        print(f"error: {error}")
    return 1


if __name__ == "__main__":  # pragma: no cover - exercised through main()
    raise SystemExit(main())
