from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "platforms" / "python" / "research" / "nexural-research"
GOLDEN = Path(__file__).with_name("docs-smoke.golden.json")


def _check_documented_syntax() -> list[str]:
    errors: list[str] = []
    sources = [ROOT / "GETTING_STARTED.md", ROOT / "docs" / "quickstart.md"]
    stale = {
        "new-strategy --name": "strategy name is positional",
        "new-bridge --name": "bridge name is positional",
        "mcp-install --client": "MCP installer uses --host",
        "--cost-stress-profile moderate": "profiles are normal/elevated/crisis",
        "--stress-profile moderate": "profiles are normal/elevated/crisis",
        "Decision: pass": "decision values are uppercase contract enums",
    }
    for source in sources:
        text = source.read_text(encoding="utf-8")
        for needle, reason in stale.items():
            if needle in text:
                errors.append(
                    f"{source.relative_to(ROOT)} contains {needle!r}: {reason}"
                )
    return errors


def main() -> int:
    if sys.version_info[:2] != (3, 11):
        print(
            f"docs-smoke requires Python 3.11, got {sys.version.split()[0]}",
            file=sys.stderr,
        )
        return 2

    errors = _check_documented_syntax()
    commands = json.loads(GOLDEN.read_text(encoding="utf-8"))
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT / "src")
    env["SETUPTOOLS_USE_DISTUTILS"] = "stdlib"

    with tempfile.TemporaryDirectory(prefix="nexural-docs-smoke-") as temp_dir:
        substitutions = {
            "tmp": Path(temp_dir).as_posix(),
            "demo": (ROOT / "examples" / "demo_nq_trades.csv").as_posix(),
        }
        for spec in commands:
            args = [arg.format(**substitutions) for arg in spec["args"]]
            command = [sys.executable, "-m", "nexural_research.cli", *args]
            result = subprocess.run(
                command,
                cwd=PROJECT,
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            output = result.stdout + result.stderr
            if result.returncode != 0:
                errors.append(
                    f"{spec['name']} exited {result.returncode}\n"
                    f"command: {' '.join(command)}\n{output[-2000:]}"
                )
                continue
            for expected in spec["contains"]:
                if expected not in output:
                    errors.append(f"{spec['name']} missing golden text {expected!r}")
            print(f"PASS {spec['name']}")

    if errors:
        print("\nDOCS SMOKE FAILURES", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Docs smoke passed: {len(commands)} executable contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
