# Roadmap

Nexural Automation is being built as a safety-first NT8 automation engineering and learning system. Progress is measured by executable evidence, not feature count.

## 2.0 safety spine

| Workstream | State | Evidence |
|---|---|---|
| Filesystem/API confinement | Complete | Traversal, symlink, UNC/device, ADS, invalid-root, and output-escape tests |
| Academy artifact packaging | Complete | Wheel smoke loads 5 tracks, 60 lessons, and 5 capstones outside the source tree |
| Release repair | Complete in repository | Exact-run promotion, reproducible builds, immutable pins, SBOM, checksums, verified Sigstore bundles, trusted publishers |
| Branch protection | Complete | Pull requests, required checks, CODEOWNERS review, linear history, and conversation resolution are enforced on `main` |
| Native NT8 compile harness | Complete | Exact adapters compile against local NT8 8.1.7.2 with zero warnings/errors |
| C# execution/risk kernel | Complete | Portable core plus 13-scenario deterministic fault suite |
| Kernel adversarial testing | Complete | 50,000 property cases, 50,000 fuzz cases, 14/14 explicit mutants killed, measured disconnect/restart RTOs |
| Sim/Playback bridge | Complete for source and native compile | Strict account/provider pairing; desktop import and fill behavior remain manual gates |
| Code-derived Academy grading | Complete | Trusted runner derives trace, tests, fault evidence, source hash, and digest |
| Sixty-lab curriculum | Complete | Five tracks and five capstones, with English/Spanish content and acceptance rubrics |
| External beta contract | Complete | Pseudonymous schema, validator, issue template, and quantitative promotion gates |
| External beta evidence | Not yet complete | Requires real learners and real Playback/Sim environments; results will not be fabricated |

## Qualification state

The machine-readable authority is [`qualification/policy.json`](qualification/policy.json). Run
`py -3.11 scripts/repo-tools/verify_world_class_gate.py --format markdown` for the current report.
The infrastructure is complete; the repository must continue to report **not qualified** until the
external and release evidence below is genuine, reviewed, and merged.

## Next evidence milestones

### Desktop qualification

- Import the generated archive through NinjaTrader's desktop UI.
- Compile the full local NinjaScript library without unrelated pre-existing errors.
- Run the fault matrix in Playback101 and Sim101.
- Capture provider identity, NT8 version, scenario logs, ACK journal, recovery timings, and archive hash.
- Run the frozen archive on both predeclared `desktop_qualification_target_versions`; only the reviewed evidence and signed aggregate report may call them verified.
- Repeat on a second independently operated Windows machine and a second supported NT8 patch version.
- Prove disconnect recovery within 5 seconds and restart recovery within 30 seconds.

### External beta

- At least 100 pseudonymous learners.
- At least 25 completed capstones.
- At least 3 distinct provider/environment profiles.
- At least 95% clean setup completion.
- Zero critical safety failures.
- No profit claims, brokerage credentials, account numbers, or raw personal trading data.

### Signed ecosystem

- Freeze one release-candidate SHA, gather every external record against it, and allow only evidence JSON in the final tag delta.
- Exercise the complete release workflow on an immutable 2.x tag.
- Verify wheel/sdist attestations, GHCR provenance, SPDX SBOM, checksum manifest, and Sigstore bundle.
- Publish the signed NT8 archive only after the release gate passes.
- Require protected-branch checks and critical-path ownership before accepting external code.

### Independent assurance

- Remediate every critical/high finding before qualification.
- Merge an independent external security-review attestation and report digest.
- Qualify a second non-owner maintainer for execution, risk, release, and evidence review.

## Non-goals

- Live-account routing.
- Profit or performance certification.
- Arbitrary hosted execution of learner Python or C#.
- Adding standalone strategies before safety, learning, and evidence gaps are closed.

The release is 99+ quality only when automated gates are green and every manual or external claim is explicitly labeled with its evidence state.
