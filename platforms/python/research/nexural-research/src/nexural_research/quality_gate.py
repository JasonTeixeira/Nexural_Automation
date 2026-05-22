"""Repo-local quality gate for the Nexural Automation public MVP."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Sequence

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MVP_PYTHON_TARGETS = [
    "src/nexural_research/automation.py",
    "src/nexural_research/mcp_server.py",
    "src/nexural_research/mcp_hosts.py",
    "src/nexural_research/cost_model.py",
    "src/nexural_research/gauntlet.py",
    "src/nexural_research/strategy_sdk.py",
    "src/nexural_research/bridge_sdk.py",
    "src/nexural_research/contracts.py",
    "src/nexural_research/quality_gate.py",
    "src/nexural_research/api/routers/automation.py",
    "tests/test_automation.py",
    "tests/test_api.py",
    "tests/test_mcp_contract.py",
]

SECURITY_TARGETS = [
    target
    for target in MVP_PYTHON_TARGETS
    if target.startswith("src/") and target != "src/nexural_research/quality_gate.py"
]


@dataclass(frozen=True)
class CheckResult:
    name: str
    command: list[str]
    passed: bool
    returncode: int
    stdout: str
    stderr: str


def _run(command: Sequence[str]) -> CheckResult:
    completed = subprocess.run(
        list(command),
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return CheckResult(
        name=" ".join(command[:3]),
        command=list(command),
        passed=completed.returncode == 0,
        returncode=completed.returncode,
        stdout=completed.stdout[-4000:],
        stderr=completed.stderr[-4000:],
    )


def run_quality_gate(*, fast: bool = False) -> dict[str, object]:
    """Run the local quality gate and return a structured score report."""
    py = sys.executable
    checks = [
        _run([py, "-m", "ruff", "check", *MVP_PYTHON_TARGETS]),
        _run(
            [
                py,
                "-m",
                "pytest",
                "tests/test_automation.py",
                "tests/test_api.py",
                "tests/test_mcp_contract.py",
                "-q",
            ]
        ),
        _run([py, "-m", "nexural_research.cli", "mcp-smoke"]),
        _run(
            [
                py,
                "-m",
                "nexural_research.cli",
                "validate-strategy",
                "../examples/strategies/opening_range_failure/metadata.yaml",
            ]
        ),
        _run(
            [
                py,
                "-m",
                "nexural_research.cli",
                "validate-bridge",
                "../examples/bridges/ninjatrader_csv/bridge_contract.json",
            ]
        ),
        _run([py, "-m", "bandit", "-q", *SECURITY_TARGETS]),
    ]
    if not fast:
        checks.append(_run([py, "-m", "pytest", "tests", "--ignore=tests/e2e", "-q"]))

    passed = sum(1 for check in checks if check.passed)
    score = passed / max(len(checks), 1)
    return {
        "score": round(score, 4),
        "passed": passed == len(checks),
        "checks_passed": passed,
        "checks_total": len(checks),
        "checks": [asdict(check) for check in checks],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nexural-research quality-gate",
        description="Run the repo-local public MVP quality gate.",
    )
    parser.add_argument("--threshold", type=float, default=0.95)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument("--fast", action="store_true", help="Skip the full non-e2e pytest suite")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    report = run_quality_gate(fast=args.fast)
    report["threshold"] = args.threshold
    report["passed"] = bool(report["score"] >= args.threshold and report["passed"])

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        status = "PASS" if report["passed"] else "FAIL"
        print(f"{status} score={report['score']} threshold={args.threshold}")
        for check in report["checks"]:
            check_status = "PASS" if check["passed"] else "FAIL"
            print(f"{check_status} {' '.join(check['command'])}")

    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
