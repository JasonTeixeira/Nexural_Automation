from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9_-]{24,}\b")),
    ("anthropic_key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{24,}\b")),
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b")),
    ("aws_access_key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("private_key", re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----")),
    (
        "generic_assignment",
        re.compile(
            r"(?i)\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['\"]"
            r"(?!<|your-|example|changeme|placeholder|test_|dummy|local)"
            r"[A-Za-z0-9_./+=-]{24,}['\"]"
        ),
    ),
]

SKIP_PARTS = {
    ".git",
    ".next",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "coverage",
    "test-results",
    "screenshots",
}

SKIP_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".parquet",
    ".duckdb",
    ".db",
    ".zip",
}


def tracked_files(repo_root: Path) -> list[Path]:
    completed = subprocess.run(
        ["git", "ls-files"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    return [repo_root / line for line in completed.stdout.splitlines() if line.strip()]


def should_scan(path: Path, repo_root: Path) -> bool:
    rel = path.relative_to(repo_root)
    if any(part in SKIP_PARTS for part in rel.parts):
        return False
    return path.suffix.lower() not in SKIP_SUFFIXES


def scan_file(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []

    findings: list[str] = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if "placeholder" in stripped.lower() or stripped.startswith("#"):
            continue
        for name, pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(f"{path}:{line_no}: potential {name}")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan tracked files for obvious committed secrets.")
    parser.add_argument("--repo-root", default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    findings: list[str] = []
    for path in tracked_files(repo_root):
        if should_scan(path, repo_root):
            findings.extend(scan_file(path))

    if findings:
        print("Potential secrets found:")
        print("\n".join(findings))
        return 1

    print("Secret scan passed: no obvious committed secrets in tracked files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

