---
title: Qualification and evidence status
description: A truthful ledger of what this documentation proves and what remains unverified.
---

# Qualification and evidence status

<div class="status-matrix">
  <div class="status-card status-card--blocked">
    <span class="status-card__label">Release qualification</span>
    <strong>NOT QUALIFIED</strong>
    <p>No complete, independent qualification bundle is asserted by this documentation.</p>
  </div>
  <div class="status-card status-card--blocked">
    <span class="status-card__label">NT8 desktop import</span>
    <strong>NOT INDEPENDENTLY VERIFIED</strong>
    <p>A build harness and manual procedure exist; this page does not claim desktop proof.</p>
  </div>
  <div class="status-card status-card--available">
    <span class="status-card__label">Documentation source</span>
    <strong>AVAILABLE</strong>
    <p>Runbooks, diagrams, policies, and local validation commands are source controlled.</p>
  </div>
  <div class="status-card">
    <span class="status-card__label">Strategy performance</span>
    <strong>NO PERFORMANCE CLAIM</strong>
    <p>Examples and simulation results do not establish profitability or capital readiness.</p>
  </div>
</div>

## What this status means

`NOT QUALIFIED` is a protective state, not a release score. It means the documentation
does not contain enough independently reviewed evidence to assert that every release,
security, reproducibility, learner, and native desktop gate has passed against one
frozen commit and one immutable artifact set.

No score such as `1.00`, “production ready,” or “verified” should be inferred from:

- the presence of source code or a workflow;
- a local unit-test or compile result;
- a simulated or Playback execution;
- a generated archive without independent desktop import evidence;
- a diagram, tutorial, example, badge, or documentation statement.

## Evidence required for qualification

The [qualification checklist](public-launch-checklist.md) is authoritative. At minimum,
the candidate needs:

1. one frozen commit, version, and artifact digest;
2. complete automated gates against that exact candidate;
3. independent, sanitized desktop evidence where native behavior is in scope;
4. reproducible builds and matching payload digests;
5. reviewed security results with no unresolved critical or high findings;
6. signed artifacts, a verified manifest, and a software bill of materials;
7. an evidence-only delta after the candidate freeze.

If the candidate changes, its evidence does not transfer automatically.

## Evidence handling rule

Preserve failures and unknown states. Do not replace a missing artifact with prose,
convert an acceptance ACK into fill proof, or treat self-attestation as independent
review. The valid outcomes include `REJECT`, `BLOCKED`, `UNQUALIFIED`, and
`NOT VERIFIED`.

Use the [operator manual](operator-manual.md#when-to-stop) for stop conditions and the
[NT8 safety guide](nt8-safety.md) for the native boundary.
