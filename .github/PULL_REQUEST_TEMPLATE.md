# Pull Request

## Summary
Describe what this PR changes and why.

## Type
- [ ] Execution / risk boundary
- [ ] Academy lesson, grader, or credential
- [ ] New strategy module
- [ ] New indicator module
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] CI / tooling

## Platform
- [ ] NinjaTrader
- [ ] TradingView
- [ ] Python
- [ ] Docs only

## Checklist
- [ ] I read the repository **DISCLAIMER.md** and understand this project is research/education only.
- [ ] No marketing/performance claims are included.
- [ ] Module includes `metadata.yaml`, `README.md`, `parameters.md`, `notes.md`, and `changelog.md`.
- [ ] Risk controls and failure modes are documented.
- [ ] I simulated/backtested where applicable and documented notes under `test-results/` or `notes.md`.
- [ ] New or changed behavior has an executable test that failed before the implementation.
- [ ] Hosted inputs fail closed and do not expose arbitrary host filesystem paths.
- [ ] Academy grading derives results from executed artifacts; it does not trust submitted success flags.
- [ ] No public path can submit an order to a live account by default.
- [ ] Dependency, API, release, and compatibility changes are reflected in canonical context/docs.
- [ ] I did not bypass a required gate with `--no-verify`, `|| true`, or `continue-on-error`.

## Machine-produced evidence

Provide commands and immutable artifact paths. Execution/risk changes require Sim101 or Playback101
fault evidence covering partial fills, rejection/cancel races, disconnect/reconnect, restart
reconciliation, duplicate delivery, and the kill switch as applicable.

```text
tests:
artifact hashes:
NT8 version/account mode:
replay seed or fixture:
```

## Risk impact
- Does this change affect execution logic or risk controls? Explain.

## Threat-model delta

- Trust boundary changed:
- New authority or data flow:
- Failure mode and fail-closed behavior:
- Rollback owner and procedure:
