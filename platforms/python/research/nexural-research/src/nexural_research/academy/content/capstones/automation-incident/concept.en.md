# Bridge Incident Recovery

## Objectives

- Explain how to integrate the track under all incident profiles.
- Produce replayable evidence instead of declaring success in a JSON field.

## Concept

Automation is safe only when its behavior can be reconstructed from ordered facts. This lab models
**bridge incident recovery** as an explicit operation in a deterministic, paper-only trace. The runner owns
the clock, seed, fixture, assertions, and fault injection; the learner owns the implementation steps.

## Exercise

Open `starter/program.yaml`, replace `TODO` with the operation implied by the visible specification,
and add the recovery operation required by the seeded `disconnect` scenario. Never paste expected
test booleans into a submission: the grader ignores them and replays the source.

## Evidence

A valid artifact binds the source hash, ordered operations, seeded fault trace, public assertions, hidden
safety checks, and final digest. Compare it with `expected-trace.json`, then explain any divergence.
