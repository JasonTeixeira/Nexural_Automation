# World-class qualification evidence

`world-class` is a computed state. It is never granted by editing a badge or checking a box.

Run the current evidence report:

```powershell
py -3.11 scripts/repo-tools/verify_world_class_gate.py --format markdown
```

Enforce the complete gate:

```powershell
py -3.11 scripts/repo-tools/verify_world_class_gate.py --require-complete
```

## Evidence boundaries

| Directory | Authority |
|---|---|
| `evidence/desktop/` | Independent NT8 GUI import, compile, Playback and Simulator runs |
| `evidence/automation/` | CI-generated property, fuzz, mutation, RTO and vulnerability results |
| `evidence/releases/` | Reproducibility, checksums, SBOM and Sigstore verification |
| `evidence/security-reviews/` | Independent external assessment attestations |
| `evidence/maintainers/` | Qualified critical-path maintainer attestations |
| `../beta/evidence/` | Pseudonymous learner and capstone evidence |

Every record is schema validated. Evidence must reference an immutable commit and use SHA-256
digests. Do not submit names, account identifiers, credentials, order identifiers, proprietary
market data, or raw trading records.

The repository intentionally ships with incomplete external evidence. The validator must report
those missing gates until real independent records are reviewed and merged.

## Frozen-candidate protocol

Qualification avoids the impossible requirement for a committed evidence file to reference the
commit that already contains itself:

1. Merge and freeze the release-candidate code and version; record its full SHA.
2. Run the automated workflow and all external desktop, learner, maintainer, and security work
   against that exact SHA and its archive digest.
3. Add only new, schema-valid `.json` records under `qualification/evidence/` and `beta/evidence/`.
4. Dispatch **Promote qualified release** with the version and frozen tested SHA.
5. Promotion proves the tagged release commit is a descendant whose entire delta is evidence-only,
   downloads the exact tested-SHA automation artifact, and evaluates every pre-release gate.
6. The immutable tag rebuilds twice, signs and verifies each payload, records every Sigstore bundle
   digest, passes the complete gate, and only then publishes.

`verify_qualification_delta.py` rejects modifications, deletions, source, workflow, policy, schema,
symlink, non-JSON, and traversal changes after the candidate is frozen. If any such change is needed,
create a new candidate SHA and repeat qualification.
