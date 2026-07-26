from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create CI-derived NT8 qualification evidence."
    )
    parser.add_argument("--adversarial", type=Path, required=True)
    parser.add_argument("--mutations", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--workflow-run", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--critical", type=int, default=0)
    parser.add_argument("--high", type=int, default=0)
    args = parser.parse_args()
    adversarial = load_json(args.adversarial)
    mutations = load_json(args.mutations)
    evidence = {
        "schema_version": "1.0.0",
        "tested_commit": args.commit,
        "workflow_run": args.workflow_run,
        "kernel": {
            "property_cases": adversarial["property_cases"],
            "fuzz_cases": adversarial["fuzz_cases"],
            "mutation_score_percent": mutations["mutation_score_percent"],
            "surviving_critical_mutants": mutations["surviving_critical_mutants"],
        },
        "recovery": {
            "disconnect_rto_seconds": adversarial["disconnect_rto_seconds"],
            "restart_rto_seconds": adversarial["restart_rto_seconds"],
        },
        "vulnerabilities": {
            "critical": args.critical,
            "high": args.high,
            "scanners": ["bandit", "pip-audit", "npm-audit", "trivy"],
        },
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
