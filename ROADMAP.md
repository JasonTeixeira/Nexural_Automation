# Roadmap

Nexural Automation is being built as a safety-first NT8 automation engineering and learning system. Progress is measured by executable evidence, not feature count.

## 2.0 safety spine

| Workstream | State | Evidence |
|---|---|---|
| Filesystem/API confinement | Complete | Traversal, symlink, UNC/device, ADS, invalid-root, and output-escape tests |
| Academy artifact packaging | Complete | Wheel smoke loads 5 tracks, 60 lessons, and 5 capstones outside the source tree |
| Release repair | Complete in repository | Immutable action pins, tag/version gate, SBOM, checksums, Sigstore, trusted publishers |
| Branch protection | Pending repository activation | Required checks must be observed on the 2.0 pull request before locking contexts |
| Native NT8 compile harness | Complete | Exact adapters compile against local NT8 8.1.7.2 with zero warnings/errors |
| C# execution/risk kernel | Complete | Portable core plus 13-scenario deterministic fault suite |
| Sim/Playback bridge | Complete for source and native compile | Strict account/provider pairing; desktop import and fill behavior remain manual gates |
| Code-derived Academy grading | Complete | Trusted runner derives trace, tests, fault evidence, source hash, and digest |
| Sixty-lab curriculum | Complete | Five tracks and five capstones, with English/Spanish content and acceptance rubrics |
| External beta contract | Complete | Pseudonymous schema, validator, issue template, and quantitative promotion gates |
| External beta evidence | Not yet complete | Requires real learners and real Playback/Sim environments; results will not be fabricated |

## Next evidence milestones

### Desktop qualification

- Import the generated archive through NinjaTrader's desktop UI.
- Compile the full local NinjaScript library without unrelated pre-existing errors.
- Run the fault matrix in Playback101 and Sim101.
- Capture provider identity, NT8 version, scenario logs, ACK journal, recovery timings, and archive hash.
- Add the proven version to `desktop_import_verified_versions` only after all evidence is reviewed.

### External beta

- At least 100 pseudonymous learners.
- At least 25 completed capstones.
- At least 3 distinct provider/environment profiles.
- At least 95% clean setup completion.
- Zero critical safety failures.
- No profit claims, brokerage credentials, account numbers, or raw personal trading data.

### Signed ecosystem

- Exercise the complete release workflow on an immutable 2.x tag.
- Verify wheel/sdist attestations, GHCR provenance, SPDX SBOM, checksum manifest, and Sigstore bundle.
- Publish the signed NT8 archive only after the release gate passes.
- Require protected-branch checks and critical-path ownership before accepting external code.

## Non-goals

- Live-account routing.
- Profit or performance certification.
- Arbitrary hosted execution of learner Python or C#.
- Adding standalone strategies before safety, learning, and evidence gaps are closed.

The release is 99+ quality only when automated gates are green and every manual or external claim is explicitly labeled with its evidence state.
