# Threat model

## Assets

- Strategy exports and generated research reports.
- Academy submissions, evidence bundles, progress, and credentials.
- NT8 account, order, execution, position, and connection state.
- Release artifacts, signing identity, workflow permissions, and package registries.

## Trust boundaries

| Boundary | Untrusted input | Required control |
|---|---|---|
| Hosted API | Uploads, identifiers, titles, HTTP metadata | Opaque artifact IDs, streaming limits, escaping, per-owner authorization |
| Local CLI/MCP | Operator-selected paths | Explicit allowed roots, resolved-path confinement, local-only binding |
| Academy runner | Learner artifacts | Declarative/sandboxed execution, resource bounds, hidden derived checks |
| Python → NT8 bridge | Signals and control messages | Schema/version, TTL, nonce, idempotency, account allowlist, durable acknowledgement |
| NT8 → provider | Orders and account state | Risk kernel, Sim/Playback default, reconciliation, connection policy, kill switch |
| Release pipeline | Source, dependencies, workflow token | Required gates, immutable actions, OIDC, SBOM, signatures, provenance |

## Primary threats

1. Path traversal, symlink/UNC/ADS escape, unintended file reads, and report overwrite.
2. Stored HTML/script injection through report metadata.
3. Oversized uploads or synchronous analytics exhausting workers.
4. Learner-declared booleans forging Academy evidence or credentials.
5. Duplicate, late, missing, or reordered bridge and execution events.
6. Partial fills leaving a naked or over-protected position.
7. Strategy/account drift after restart or connection loss.
8. A live account being selected by default or through stale configuration.
9. Mutable CI actions, untested rebuilds, or version drift compromising releases.

## Safety invariants

- Uncertain authority, identity, data freshness, storage, or reconciliation fails closed.
- Public Academy and bridge paths are limited to Playback101 and Sim101.
- Signal receipt, file append, order acceptance, execution, flatten, and reconciliation are separate states.
- A persistent kill switch blocks new submissions until an explicit, audited reset.
- Credentials are derived only from independently executed artifacts and hidden checks.
- Releases are published only from immutable artifacts produced by the successful release gate.

## Verification

Static analysis and tests reduce risk but do not prove security. Each release requires adversarial
path tests, resource-limit tests, deterministic execution fault tests, dependency audits, and an
updated threat-model delta in the pull request.
