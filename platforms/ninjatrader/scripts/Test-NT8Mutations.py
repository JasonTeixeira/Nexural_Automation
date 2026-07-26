from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Mutant:
    identifier: str
    file: str
    original: str
    replacement: str


MUTANTS = (
    Mutant(
        "sim-account-provider-pair",
        "SignalSafety.cs",
        "&& providerKind == AccountProviderKind.Simulator",
        "|| providerKind == AccountProviderKind.Simulator",
    ),
    Mutant(
        "playback-account-provider-pair",
        "SignalSafety.cs",
        "&& providerKind == AccountProviderKind.Playback",
        "|| providerKind == AccountProviderKind.Playback",
    ),
    Mutant(
        "signal-expiry-boundary",
        "SignalSafety.cs",
        "nowUtc >= signal.ExpiresUtc",
        "nowUtc > signal.ExpiresUtc",
    ),
    Mutant(
        "signal-future-boundary",
        "SignalSafety.cs",
        "signal.CreatedUtc > nowUtc.Add(maximumFutureSkew)",
        "signal.CreatedUtc >= nowUtc.Add(maximumFutureSkew)",
    ),
    Mutant(
        "signal-duplicate-check",
        "SignalSafety.cs",
        "if (cursor.RecentSignalIds.Contains(signal.SignalId))",
        "if (false && cursor.RecentSignalIds.Contains(signal.SignalId))",
    ),
    Mutant(
        "signal-sequence-gap",
        "SignalSafety.cs",
        "if (signal.Sequence != cursor.LastSequence + 1)",
        "if (signal.Sequence < cursor.LastSequence + 1)",
    ),
    Mutant(
        "risk-reconciliation",
        "RiskEngine.cs",
        "if (!snapshot.IsReconciled)",
        "if (snapshot.IsReconciled)",
    ),
    Mutant(
        "risk-quantity",
        "RiskEngine.cs",
        "if (quantity > limits.MaximumOrderQuantity)",
        "if (quantity < limits.MaximumOrderQuantity)",
    ),
    Mutant(
        "risk-position",
        "RiskEngine.cs",
        "if (Math.Abs(snapshot.CurrentPosition + signedQuantity) > limits.MaximumAbsolutePosition)",
        "if (Math.Abs(snapshot.CurrentPosition + signedQuantity) < limits.MaximumAbsolutePosition)",
    ),
    Mutant(
        "risk-loss-boundary",
        "RiskEngine.cs",
        "if (snapshot.RealizedPnl <= -limits.MaximumDailyLoss)",
        "if (snapshot.RealizedPnl < -limits.MaximumDailyLoss)",
    ),
    Mutant(
        "risk-session-boundary",
        "RiskEngine.cs",
        "if (snapshot.AcceptedSignalsThisSession >= limits.MaximumSignalsPerSession)",
        "if (snapshot.AcceptedSignalsThisSession > limits.MaximumSignalsPerSession)",
    ),
    Mutant(
        "execution-deduplication",
        "OrderExecutionStateMachine.cs",
        "if (executionIds.Contains(executionId))",
        "if (false && executionIds.Contains(executionId))",
    ),
    Mutant(
        "execution-overfill",
        "OrderExecutionStateMachine.cs",
        "if (FilledQuantity + quantity > RequestedQuantity)",
        "if (FilledQuantity + quantity < RequestedQuantity)",
    ),
    Mutant(
        "kill-switch-entry-block",
        "BridgeCoordinator.cs",
        "if (killSwitch.Current.Engaged && signal.Action != SignalAction.Flatten)",
        "if (killSwitch.Current.Engaged && signal.Action == SignalAction.Flatten)",
    ),
)


def run_mutation(root: Path, mutant: Mutant) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="nexural-mutant-") as temporary:
        sandbox = Path(temporary)
        source = sandbox / "src" / "Nexural.NT8.Core"
        fault = sandbox / "tests" / "Nexural.NT8.Core.FaultSuite"
        adversarial = sandbox / "tests" / "Nexural.NT8.Core.AdversarialSuite"
        shutil.copytree(root / "src" / "Nexural.NT8.Core", source)
        shutil.copytree(root / "tests" / "Nexural.NT8.Core.FaultSuite", fault)
        shutil.copytree(
            root / "tests" / "Nexural.NT8.Core.AdversarialSuite", adversarial
        )
        target = source / mutant.file
        content = target.read_text(encoding="utf-8")
        if content.count(mutant.original) < 1:
            raise RuntimeError(f"{mutant.identifier}: mutation marker was not found")
        target.write_text(
            content.replace(mutant.original, mutant.replacement, 1), encoding="utf-8"
        )

        outputs: list[str] = []
        for project in (fault, adversarial):
            completed = subprocess.run(
                [
                    "dotnet",
                    "run",
                    "--project",
                    str(next(project.glob("*.csproj"))),
                    "--configuration",
                    "Release",
                ],
                cwd=sandbox,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            output = completed.stdout + completed.stderr
            outputs.append(output)
            if "error CS" in output or "Build FAILED" in output:
                return {
                    "id": mutant.identifier,
                    "status": "invalid",
                    "exit_code": completed.returncode,
                }
            if completed.returncode != 0:
                return {
                    "id": mutant.identifier,
                    "status": "killed",
                    "exit_code": completed.returncode,
                }
        return {"id": mutant.identifier, "status": "survived", "exit_code": 0}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run deterministic source mutations against the NT8 kernel suites."
    )
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument("--minimum-score", type=float, default=85.0)
    args = parser.parse_args()
    results = [run_mutation(args.root.resolve(), mutant) for mutant in MUTANTS]
    invalid = [item for item in results if item["status"] == "invalid"]
    valid = [item for item in results if item["status"] != "invalid"]
    killed = [item for item in valid if item["status"] == "killed"]
    survived = [item for item in valid if item["status"] == "survived"]
    score = 100.0 * len(killed) / len(valid) if valid else 0.0
    report = {
        "schema_version": "1.0.0",
        "mutation_score_percent": round(score, 2),
        "total_mutants": len(MUTANTS),
        "valid_mutants": len(valid),
        "killed_mutants": len(killed),
        "surviving_critical_mutants": len(survived),
        "invalid_mutants": len(invalid),
        "results": results,
    }
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    print(payload, end="")
    if invalid or survived or score < args.minimum_score:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
