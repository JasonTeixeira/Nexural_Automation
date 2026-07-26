# Engineering workflow

## Development

1. Define the invariant and executable acceptance test.
2. Add a failing test or machine-verifiable proof requirement.
3. Implement the smallest complete behavior.
4. Run focused tests, then full repository gates.
5. Review security boundaries, failure modes, documentation, and release impact.

## Required gates

- Python 3.11 tests, full-tree lint, blocking type checks, security audit, and dependency audit.
- Frontend typecheck, production build, Playwright journeys, axe accessibility, and visual QA.
- Portable NT8 core tests on every PR touching `platforms/ninjatrader`.
- Windows/NT8 compile/import and Playback/Sim101 evidence before a NinjaScript package is released.
- Machine-derived proof for every Academy credential or package promotion.
- At least 50,000 property cases, 50,000 fuzz cases, 85% mutation score, and measured recovery RTOs for the execution/risk kernel.
- A complete policy-derived qualification report before any stable release is published.

## Review policy

- Pull requests are mandatory for `main`.
- Execution, risk, authentication, filesystem, and release changes require a second qualified
  maintainer. No owner-only self-approval qualifies a stable release.
- Never suppress a required gate with `|| true`, `continue-on-error`, `--no-verify`, or equivalent.
- Every release includes rollback instructions and an evidence manifest.

## Safety policy

- No lookahead bias or in-sample promotion.
- No live routing in public examples or Academy paths.
- Every connection loss, partial fill, rejection, duplicate event, and restart is an explicit state.
- Fail closed when authority, storage, account identity, data freshness, or reconciliation is uncertain.
