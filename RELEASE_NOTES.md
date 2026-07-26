# Release Notes

## 2.0 release candidate

This candidate turns Nexural Automation into a safety-first NT8 automation engineering system rather than a collection of strategy examples.

### Native execution safety

- Portable C# execution/risk kernel.
- Native NinjaScript Strategy and AddOn adapters.
- Exact `Sim101 + Simulator` and `Playback101 + Playback` gates with no live-routing switch.
- Persistent kill switch, reconciliation, sequence/age validation, order lifecycle, partial-fill handling, durable cursor/ACK recovery, and audit journal.
- Thirteen deterministic fault scenarios.
- Fifty thousand property cases, fifty thousand seeded fuzz cases, explicit mutation testing, and measured disconnect/restart recovery objectives.
- Native compile and validated archive tooling for NT8 8.1.7.2.

### Executable Academy

- Five tracks, sixty executable labs, and five capstones.
- English and Spanish concepts, starters, solutions, public checks, hidden-test metadata, expected traces, and evidence rubrics.
- Trusted data-only runner derives source hashes, traces, test results, fault evidence, and artifact digests.
- Complete Academy resources ship inside the Python wheel and are parity-tested against the source catalog.

### Security and release engineering

- Fail-closed, opt-in local path API with root confinement and atomic writes.
- HTML report output escaping.
- Immutable GitHub Action pins and critical-path CODEOWNERS.
- Exact-run release promotion, reproducible Python and NT8 builds, SPDX SBOM, SHA-256 checksums, post-signing Sigstore bundle evidence, a digest-pinned Alpine runtime with zero high/critical findings, PyPI trusted publishing, and GHCR provenance.
- Pseudonymous external-beta evidence schema and validator.
- Machine-enforced qualification policy for independent desktops, NT8 versions, account modes, recovery, adversarial testing, vulnerabilities, learners, capstones, security review, maintainership, and signed releases.

### Verification state

- Portable fault suite: 13/13 passed.
- Adversarial suite: 50,000 property cases, 50,000 fuzz cases, and 14/14 explicit mutants killed locally.
- Native NT8 8.1.7.2 adapter compile: 0 warnings, 0 errors.
- Academy: 5 tracks, 60 lessons, and 5 capstones loaded from an installed wheel.
- Two-machine/two-version NT8 desktop proof, Playback/Simulator evidence, 100 learners, 25 capstones, an external security review, a second qualified maintainer, and a qualifying signed release remain explicit external gates. They are not claimed by this candidate.

See [README.md](README.md), [ROADMAP.md](ROADMAP.md), and [the NT8 import procedure](platforms/ninjatrader/docs/IMPORT_AND_VERIFY.md) for the exact evidence contract.
