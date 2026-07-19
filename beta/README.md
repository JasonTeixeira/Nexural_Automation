# External NT8 beta

This directory is the evidence boundary for independent Playback101 and Sim101 validation.
It contains no claimed participants or manufactured results.

## Submission contract

1. Open the **External NT8 beta validation** issue form.
2. Run the published deterministic scenario bundle on the exact commit under review.
3. Remove account names, usernames, machine names, order IDs, and proprietary data.
4. Hash each evidence bundle with SHA-256.
5. Submit one JSON record under `beta/evidence/` matching
   [`schemas/beta-evidence.schema.json`](../schemas/beta-evidence.schema.json).

Only `Playback101` and `Sim101` evidence is accepted. External beta evidence does not certify
profitability, production safety, broker suitability, or readiness for live capital.

## Promotion gate

The project may report **external beta complete** only after independently reviewed evidence
shows:

- at least 100 learners completed one executable lab;
- at least 25 learners completed a code-graded capstone;
- at least three distinct connection/provider environments passed the required fault matrix;
- at least 95% clean-machine setup success;
- zero unresolved duplicate-order, naked-position, reconciliation, or kill-switch failures.
