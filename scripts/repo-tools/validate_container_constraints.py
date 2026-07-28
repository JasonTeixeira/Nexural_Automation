"""Validate the production container's exact Python dependency constraints."""

from __future__ import annotations

import re
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PACKAGE_ROOT = ROOT / "platforms" / "python" / "research" / "nexural-research"
CONSTRAINTS = PACKAGE_ROOT / "container-constraints.txt"
CI_LOCK = PACKAGE_ROOT / "requirements" / "py311-ci-lock.txt"

ALLOWED_CONTAINER_ONLY = {
    "backports-tarfile",
    "jaraco-context",
    "pip",
    "setuptools",
    "uvloop",
    "wheel",
}
ALLOWED_VERSION_DIFFERENCES = {
    # The newer CI version has no CPython 3.11 musllinux wheel.
    "duckdb": ("1.3.2", "1.5.4"),
}


def canonicalize(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def exact_pins(path: Path) -> dict[str, str]:
    pins: dict[str, str] = {}
    invalid: list[str] = []
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), 1
    ):
        line = raw_line.partition("#")[0].strip()
        if not line:
            continue
        match = re.fullmatch(r"([A-Za-z0-9_.-]+)==([^\s;]+)(?:\s*;\s*.+)?", line)
        if match is None:
            invalid.append(f"{path}:{line_number}: {line}")
            continue
        name, version = match.groups()
        pins[canonicalize(name)] = version
    if invalid:
        raise ValueError(
            "Every container constraint must be an exact pin:\n" + "\n".join(invalid)
        )
    return pins


def project_dependency_names() -> set[str]:
    pyproject = tomllib.loads(
        (PACKAGE_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    )
    dependencies = pyproject["project"]["dependencies"]
    names: set[str] = set()
    for dependency in dependencies:
        match = re.match(r"([A-Za-z0-9_.-]+)", dependency)
        if match is None:
            raise ValueError(f"Could not parse project dependency: {dependency}")
        names.add(canonicalize(match.group(1)))
    return names


def main() -> None:
    container = exact_pins(CONSTRAINTS)
    ci = exact_pins(CI_LOCK)

    missing_top_level = sorted(project_dependency_names() - container.keys())
    if missing_top_level:
        raise SystemExit(
            "Container constraints omit top-level dependencies: "
            + ", ".join(missing_top_level)
        )

    unexpected_extras = sorted(container.keys() - ci.keys() - ALLOWED_CONTAINER_ONLY)
    if unexpected_extras:
        raise SystemExit(
            "Container-only pins require an explicit policy entry: "
            + ", ".join(unexpected_extras)
        )

    mismatches: list[str] = []
    for name in sorted(container.keys() & ci.keys()):
        if container[name] == ci[name]:
            continue
        if ALLOWED_VERSION_DIFFERENCES.get(name) == (container[name], ci[name]):
            continue
        mismatches.append(f"{name}: container={container[name]}, ci={ci[name]}")
    if mismatches:
        raise SystemExit(
            "Container pins drifted from the tested CI lock:\n" + "\n".join(mismatches)
        )

    print(
        f"Container constraints valid: {len(container)} exact pins; "
        f"{len(project_dependency_names())} top-level dependencies covered."
    )


if __name__ == "__main__":
    main()
