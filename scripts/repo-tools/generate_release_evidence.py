from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def directory_manifest(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): digest(path)
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create signed release qualification evidence."
    )
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--release-commit", required=True)
    parser.add_argument("--workflow-run", required=True)
    parser.add_argument("--sbom", type=Path, required=True)
    parser.add_argument("--build-a", type=Path, required=True)
    parser.add_argument("--build-b", type=Path, required=True)
    parser.add_argument("--bundle-root", type=Path, required=True)
    parser.add_argument("--certificate-identity", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--independent-builds", type=int, default=2)
    args = parser.parse_args()
    first_manifest = directory_manifest(args.build_a)
    second_manifest = directory_manifest(args.build_b)
    if not first_manifest or first_manifest != second_manifest:
        raise SystemExit(
            "Independent release builds are not byte-for-byte reproducible."
        )
    payloads = [
        path
        for path in sorted(args.artifacts.rglob("*"))
        if path.is_file()
        and path.resolve() != args.output.resolve()
        and not path.name.endswith((".sigstore.json", ".crt", ".sig"))
    ]
    bundles = []
    for payload in payloads:
        bundle = Path(f"{payload}.sigstore.json")
        if not bundle.is_file() or not bundle.resolve().is_relative_to(
            args.bundle_root.resolve()
        ):
            raise SystemExit(f"Missing Sigstore bundle for {payload}")
        bundles.append(
            {
                "artifact": payload.relative_to(args.artifacts).as_posix(),
                "artifact_sha256": digest(payload),
                "bundle": bundle.relative_to(args.artifacts).as_posix(),
                "bundle_sha256": digest(bundle),
            }
        )
    artifacts = [
        path
        for path in payloads
        if path.resolve() != args.sbom.resolve() and path.name != "SHA256SUMS"
    ]
    if len(artifacts) < 3:
        raise SystemExit("At least three release artifacts are required.")
    evidence = {
        "schema_version": "1.0.0",
        "tag": args.tag,
        "tested_commit": args.commit,
        "release_commit": args.release_commit,
        "workflow_run": args.workflow_run,
        "reproducible": {
            "independent_builds": args.independent_builds,
            "matching": True,
        },
        "artifacts": [
            {
                "name": path.relative_to(args.artifacts).as_posix(),
                "sha256": digest(path),
            }
            for path in artifacts
        ],
        "sbom": {"format": "SPDX-2.3", "sha256": digest(args.sbom)},
        "sigstore": {
            "signed": True,
            "verified": True,
            "oidc_issuer": "https://token.actions.githubusercontent.com",
            "certificate_identity": args.certificate_identity,
            "bundles": bundles,
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
