from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator, FormatChecker


@dataclass(frozen=True)
class Requirement:
    id: str
    passed: bool
    observed: Any
    required: Any
    evidence: str


@dataclass(frozen=True)
class QualificationReport:
    schema_version: str
    label: str
    stage: str
    target_commit: str | None
    complete: bool
    requirements: tuple[Requirement, ...]
    validation_errors: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "label": self.label,
            "stage": self.stage,
            "target_commit": self.target_commit,
            "complete": self.complete,
            "requirements": [asdict(item) for item in self.requirements],
            "validation_errors": list(self.validation_errors),
        }


EVIDENCE_CONTRACTS = {
    "desktop": (
        "schemas/desktop-qualification.schema.json",
        "qualification/evidence/desktop",
    ),
    "automation": (
        "schemas/automation-qualification.schema.json",
        "qualification/evidence/automation",
    ),
    "releases": (
        "schemas/release-qualification.schema.json",
        "qualification/evidence/releases",
    ),
    "security_reviews": (
        "schemas/external-security-review.schema.json",
        "qualification/evidence/security-reviews",
    ),
    "maintainers": (
        "schemas/maintainer-attestation.schema.json",
        "qualification/evidence/maintainers",
    ),
    "beta": ("schemas/beta-evidence.schema.json", "beta/evidence"),
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_validated_records(
    repo_root: Path, schema_relative: str, evidence_relative: str
) -> tuple[list[dict[str, Any]], list[str]]:
    schema_path = repo_root / schema_relative
    schema = load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    records: list[dict[str, Any]] = []
    errors: list[str] = []
    for path in sorted((repo_root / evidence_relative).glob("*.json")):
        try:
            record = load_json(path)
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{path.relative_to(repo_root)}:root: {error}")
            continue
        record_errors = sorted(
            validator.iter_errors(record), key=lambda item: list(item.path)
        )
        if record_errors:
            for error in record_errors:
                location = ".".join(str(part) for part in error.absolute_path) or "root"
                errors.append(
                    f"{path.relative_to(repo_root)}:{location}: {error.message}"
                )
            continue
        records.append(record)
    return records, errors


def _maximum(records: Iterable[dict[str, Any]], *path: str) -> float:
    values: list[float] = []
    for record in records:
        value: Any = record
        for part in path:
            value = value.get(part, {}) if isinstance(value, dict) else {}
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            values.append(float(value))
    return max(values, default=0.0)


def evaluate(
    repo_root: Path, stage: str = "complete", target_commit: str | None = None
) -> QualificationReport:
    if stage not in {"pre-release", "complete"}:
        raise ValueError(f"Unknown qualification stage: {stage}")
    policy = load_json(repo_root / "qualification" / "policy.json")
    thresholds = policy["thresholds"]
    records: dict[str, list[dict[str, Any]]] = {}
    validation_errors: list[str] = []
    for name, (schema, directory) in EVIDENCE_CONTRACTS.items():
        records[name], errors = _load_validated_records(repo_root, schema, directory)
        validation_errors.extend(errors)
    if target_commit:
        commit_fields = {
            "desktop": "tested_commit",
            "automation": "tested_commit",
            "releases": "tested_commit",
            "security_reviews": "reviewed_commit",
            "maintainers": "reviewed_commit",
            "beta": "tested_commit",
        }
        records = {
            name: [
                record
                for record in items
                if record[commit_fields[name]] == target_commit
            ]
            for name, items in records.items()
        }

    desktop = records["desktop"]
    machines = {record["machine_id"] for record in desktop}
    testers = {record["tester_id"] for record in desktop}
    versions = {record["environment"]["nt8_version"] for record in desktop}
    modes = {record["account_mode"] for record in desktop}
    disconnect_times = [
        record["recovery"]["disconnect_detected_seconds"] for record in desktop
    ]
    restart_times = [
        record["recovery"]["restart_reconciled_seconds"] for record in desktop
    ]
    support = load_json(
        repo_root / "platforms/ninjatrader/packaging/supported-versions.json"
    )
    declared_desktop_versions = set(
        support["ninjatrader"]["desktop_qualification_target_versions"]
    )

    automation = records["automation"]
    max_property = int(_maximum(automation, "kernel", "property_cases"))
    max_fuzz = int(_maximum(automation, "kernel", "fuzz_cases"))
    max_mutation = _maximum(automation, "kernel", "mutation_score_percent")
    critical_mutants = min(
        (record["kernel"]["surviving_critical_mutants"] for record in automation),
        default=1,
    )
    unresolved_critical = min(
        (record["vulnerabilities"]["critical"] for record in automation), default=1
    )
    unresolved_high = min(
        (record["vulnerabilities"]["high"] for record in automation), default=1
    )
    automated_disconnect = _maximum(automation, "recovery", "disconnect_rto_seconds")
    automated_restart = _maximum(automation, "recovery", "restart_rto_seconds")
    qualifying_automation = [
        record
        for record in automation
        if record["kernel"]["property_cases"] >= thresholds["property_cases"]
        and record["kernel"]["fuzz_cases"] >= thresholds["fuzz_cases"]
        and record["kernel"]["mutation_score_percent"]
        >= thresholds["mutation_score_percent"]
        and record["kernel"]["surviving_critical_mutants"] == 0
        and record["recovery"]["disconnect_rto_seconds"]
        <= thresholds["disconnect_rto_seconds"]
        and record["recovery"]["restart_rto_seconds"]
        <= thresholds["restart_rto_seconds"]
        and record["vulnerabilities"]["critical"]
        <= thresholds["unresolved_critical_vulnerabilities"]
        and record["vulnerabilities"]["high"]
        <= thresholds["unresolved_high_vulnerabilities"]
    ]

    submitted_beta = records["beta"]
    beta = [
        record
        for record in submitted_beta
        if all(scenario["result"] == "pass" for scenario in record["scenarios"])
        and record["learning"]["code_derived_grading"]
        and bool(record["learning"]["grading_digest"])
    ]
    learners = {record["participant_id"] for record in beta}
    capstone_completers = {
        record["participant_id"]
        for record in beta
        if record["learning"]["completed_capstones"]
    }
    providers = {record["environment"]["connection"] for record in beta}
    clean_setup_learners = {
        record["participant_id"] for record in beta if record["setup"]["clean_machine"]
    }
    clean_setup_rate = (
        len(clean_setup_learners) / len(learners) if learners else 0.0
    )

    releases = records["releases"]
    qualifying_releases = [
        record
        for record in releases
        if record["reproducible"]["matching"]
        and record["sigstore"]["signed"]
        and record["sigstore"]["verified"]
    ]
    reviews = records["security_reviews"]
    maintainers = {record["github_login"] for record in records["maintainers"]}
    owner_maintainers = {
        record["github_login"] for record in records["maintainers"] if record["owner"]
    }
    non_owner_maintainers = {
        record["github_login"]
        for record in records["maintainers"]
        if not record["owner"]
    }

    def requirement(
        identifier: str, passed: bool, observed: Any, required: Any, evidence: str
    ) -> Requirement:
        return Requirement(identifier, bool(passed), observed, required, evidence)

    required_modes = set(thresholds["required_account_modes"])
    requirements = (
        requirement(
            "windows-machines",
            len(machines) >= thresholds["independent_windows_machines"],
            len(machines),
            thresholds["independent_windows_machines"],
            "qualification/evidence/desktop",
        ),
        requirement(
            "desktop-testers",
            len(testers) >= thresholds["independent_desktop_testers"],
            len(testers),
            thresholds["independent_desktop_testers"],
            "qualification/evidence/desktop",
        ),
        requirement(
            "nt8-patch-versions",
            len(versions) >= thresholds["supported_nt8_patch_versions"],
            sorted(versions),
            thresholds["supported_nt8_patch_versions"],
            "qualification/evidence/desktop",
        ),
        requirement(
            "qualification-target-versions",
            bool(versions) and versions <= declared_desktop_versions,
            sorted(versions),
            sorted(declared_desktop_versions),
            "platforms/ninjatrader/packaging/supported-versions.json",
        ),
        requirement(
            "playback-and-simulator",
            required_modes <= modes,
            sorted(modes),
            sorted(required_modes),
            "qualification/evidence/desktop",
        ),
        requirement(
            "desktop-disconnect-rto",
            bool(disconnect_times)
            and max(disconnect_times) <= thresholds["disconnect_rto_seconds"],
            max(disconnect_times, default=None),
            thresholds["disconnect_rto_seconds"],
            "qualification/evidence/desktop",
        ),
        requirement(
            "desktop-restart-rto",
            bool(restart_times)
            and max(restart_times) <= thresholds["restart_rto_seconds"],
            max(restart_times, default=None),
            thresholds["restart_rto_seconds"],
            "qualification/evidence/desktop",
        ),
        requirement(
            "automated-evidence-bundle",
            bool(qualifying_automation),
            len(qualifying_automation),
            1,
            "qualification/evidence/automation",
        ),
        requirement(
            "property-testing",
            max_property >= thresholds["property_cases"],
            max_property,
            thresholds["property_cases"],
            "qualification/evidence/automation",
        ),
        requirement(
            "fuzz-testing",
            max_fuzz >= thresholds["fuzz_cases"],
            max_fuzz,
            thresholds["fuzz_cases"],
            "qualification/evidence/automation",
        ),
        requirement(
            "mutation-testing",
            max_mutation >= thresholds["mutation_score_percent"]
            and critical_mutants == 0,
            {
                "score_percent": max_mutation,
                "surviving_critical_mutants": critical_mutants,
            },
            {
                "score_percent": thresholds["mutation_score_percent"],
                "surviving_critical_mutants": 0,
            },
            "qualification/evidence/automation",
        ),
        requirement(
            "automated-disconnect-rto",
            bool(automation)
            and automated_disconnect <= thresholds["disconnect_rto_seconds"],
            automated_disconnect if automation else None,
            thresholds["disconnect_rto_seconds"],
            "qualification/evidence/automation",
        ),
        requirement(
            "automated-restart-rto",
            bool(automation) and automated_restart <= thresholds["restart_rto_seconds"],
            automated_restart if automation else None,
            thresholds["restart_rto_seconds"],
            "qualification/evidence/automation",
        ),
        requirement(
            "critical-vulnerabilities",
            unresolved_critical <= thresholds["unresolved_critical_vulnerabilities"],
            unresolved_critical,
            thresholds["unresolved_critical_vulnerabilities"],
            "qualification/evidence/automation",
        ),
        requirement(
            "high-vulnerabilities",
            unresolved_high <= thresholds["unresolved_high_vulnerabilities"],
            unresolved_high,
            thresholds["unresolved_high_vulnerabilities"],
            "qualification/evidence/automation",
        ),
        requirement(
            "signed-releases",
            len(qualifying_releases) >= thresholds["qualifying_signed_releases"],
            len(qualifying_releases),
            thresholds["qualifying_signed_releases"],
            "qualification/evidence/releases",
        ),
        requirement(
            "external-learners",
            len(learners) >= thresholds["external_learners"],
            len(learners),
            thresholds["external_learners"],
            "beta/evidence",
        ),
        requirement(
            "capstone-completers",
            len(capstone_completers) >= thresholds["capstone_completers"],
            len(capstone_completers),
            thresholds["capstone_completers"],
            "beta/evidence",
        ),
        requirement(
            "provider-profiles",
            len(providers) >= thresholds["provider_profiles"],
            len(providers),
            thresholds["provider_profiles"],
            "beta/evidence",
        ),
        requirement(
            "clean-setup-rate",
            clean_setup_rate >= thresholds["clean_setup_rate"],
            round(clean_setup_rate, 4),
            thresholds["clean_setup_rate"],
            "beta/evidence",
        ),
        requirement(
            "external-security-review",
            len(reviews) >= thresholds["external_security_reviews"],
            len(reviews),
            thresholds["external_security_reviews"],
            "qualification/evidence/security-reviews",
        ),
        requirement(
            "qualified-maintainers",
            len(maintainers) >= thresholds["qualified_maintainers"],
            len(maintainers),
            thresholds["qualified_maintainers"],
            "qualification/evidence/maintainers",
        ),
        requirement(
            "owner-maintainer",
            len(owner_maintainers) >= thresholds["owner_maintainers"],
            len(owner_maintainers),
            thresholds["owner_maintainers"],
            "qualification/evidence/maintainers",
        ),
        requirement(
            "non-owner-maintainer",
            len(non_owner_maintainers) >= thresholds["non_owner_maintainers"],
            len(non_owner_maintainers),
            thresholds["non_owner_maintainers"],
            "qualification/evidence/maintainers",
        ),
    )
    blocking_requirements = tuple(
        item
        for item in requirements
        if stage == "complete" or item.id != "signed-releases"
    )
    complete = not validation_errors and all(
        item.passed for item in blocking_requirements
    )
    return QualificationReport(
        schema_version="1.0.0",
        label=policy["label"],
        stage=stage,
        target_commit=target_commit,
        complete=complete,
        requirements=requirements,
        validation_errors=tuple(validation_errors),
    )


def render_markdown(report: QualificationReport) -> str:
    lines = [
        "# World-class qualification report",
        "",
        f"**Stage:** `{report.stage}`",
        "",
        f"**Target commit:** `{report.target_commit or 'not pinned'}`",
        "",
        f"**Status:** {'QUALIFIED' if report.complete else 'NOT QUALIFIED'}",
        "",
        "| Gate | Status | Observed | Required | Evidence |",
        "|---|---:|---|---|---|",
    ]
    for item in report.requirements:
        status = "PASS" if item.passed else "MISSING"
        observed = json.dumps(item.observed, sort_keys=True).replace("|", "\\|")
        required = json.dumps(item.required, sort_keys=True).replace("|", "\\|")
        lines.append(
            f"| `{item.id}` | {status} | `{observed}` | `{required}` | `{item.evidence}` |"
        )
    if report.validation_errors:
        lines.extend(["", "## Invalid evidence", ""])
        lines.extend(f"- {error}" for error in report.validation_errors)
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compute the Nexural world-class evidence gate."
    )
    parser.add_argument(
        "--repo-root", type=Path, default=Path(__file__).resolve().parents[2]
    )
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--require-complete", action="store_true")
    parser.add_argument(
        "--stage", choices=("pre-release", "complete"), default="complete"
    )
    parser.add_argument(
        "--commit",
        help="Full immutable commit to qualify (defaults to the repository HEAD).",
    )
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    target_commit = args.commit
    if target_commit is None:
        target_commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    if len(target_commit) != 40 or any(
        character not in "0123456789abcdef" for character in target_commit
    ):
        parser.error("--commit must be a full lowercase Git SHA")
    report = evaluate(repo_root, stage=args.stage, target_commit=target_commit)
    output = (
        json.dumps(report.to_dict(), indent=2, sort_keys=True) + "\n"
        if args.format == "json"
        else render_markdown(report)
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 1 if args.require_complete and not report.complete else 0


if __name__ == "__main__":
    raise SystemExit(main())
