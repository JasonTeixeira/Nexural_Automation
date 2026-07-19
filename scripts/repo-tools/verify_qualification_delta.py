from __future__ import annotations

import argparse
import subprocess
from pathlib import Path, PurePosixPath

ALLOWED_PREFIXES = (
    PurePosixPath("qualification/evidence"),
    PurePosixPath("beta/evidence"),
)


def is_allowed_evidence_path(value: str) -> bool:
    path = PurePosixPath(value.replace("\\", "/"))
    return (
        path.suffix == ".json"
        and any(path.is_relative_to(prefix) for prefix in ALLOWED_PREFIXES)
        and ".." not in path.parts
    )


def changed_entries(
    repo_root: Path, tested_commit: str, release_commit: str
) -> list[tuple[str, str]]:
    completed = subprocess.run(
        [
            "git",
            "diff",
            "--no-renames",
            "--name-status",
            "-z",
            tested_commit,
            release_commit,
        ],
        cwd=repo_root,
        capture_output=True,
        check=True,
    )
    fields = [item.decode("utf-8") for item in completed.stdout.split(b"\0") if item]
    if len(fields) % 2:
        raise SystemExit("Could not parse the qualification Git delta.")
    return list(zip(fields[0::2], fields[1::2], strict=True))


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Prove that a qualified release differs from its tested commit "
            "only by JSON evidence."
        )
    )
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--tested-commit", required=True)
    parser.add_argument("--release-commit", required=True)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()

    if not all(
        len(value) == 40 and set(value) <= set("0123456789abcdef")
        for value in (args.tested_commit, args.release_commit)
    ):
        raise SystemExit("Both commits must be full lowercase Git SHAs.")
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", args.tested_commit, args.release_commit],
        cwd=repo_root,
        check=False,
    )
    if ancestor.returncode != 0:
        raise SystemExit("The tested commit is not an ancestor of the release commit.")

    rejected = []
    for status, value in changed_entries(
        repo_root, args.tested_commit, args.release_commit
    ):
        if status != "A" or not is_allowed_evidence_path(value):
            rejected.append(f"{status} {value}")
            continue
        target = repo_root / value
        if target.exists() and (target.is_symlink() or not target.is_file()):
            rejected.append(value)
    if rejected:
        print("Qualification delta contains non-evidence changes:")
        print("\n".join(f"- {value}" for value in rejected))
        return 1
    print(
        "Qualification delta is evidence-only: "
        f"{args.tested_commit}..{args.release_commit}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
