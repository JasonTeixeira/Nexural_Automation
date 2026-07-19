# Nexural Automation Academy

A safety-first, scenario-driven curriculum for quantitative automation. Each mission is a
versioned YAML manifest evaluated by `nexural_research.academy`. Learners repair an intentionally
failing JSON control/evidence payload; public checks provide actionable feedback while hidden
checks protect safety invariants. The hosted API evaluates constrained data only and never
executes learner-supplied code. No rubric awards points for profitability, Sharpe, returns, or
win rate.

The four tracks are Research Operator, Strategy Builder, Bridge Engineer, and Agent Automation
Engineer. Twelve labs lead to three capstones. Prerequisites are enforced by the domain service,
successful submissions create immutable snapshots in a hash-chained experiment ledger, and signed
knowledge attestations are issued only from server-derived capstone completion. These attestations
certify curriculum knowledge, not the behavior or safety of arbitrary learner code.

## Interfaces

Use the Academy from the default web workspace, versioned API, or CLI:

```powershell
nexural-research academy catalog
nexural-research academy start research.lookahead --learner local-operator
nexural-research academy check research.lookahead --learner local-operator --submission academy/fixtures/lookahead-safe-submission.json
nexural-research academy trace --learner local-operator
```

API routes are available below `/api/academy/*` and `/api/v1/academy/*`. When
`NEXURAL_AUTH_ENABLED=true`, bearer authentication also isolates learner state by API-key subject.

## Extension surface

The curriculum includes deterministic seeded fault profiles, a trace-aware tiered mentor,
instructor cohort summaries, bilingual English/Spanish titles and summaries, signed local
knowledge attestations, a digest-verified starter marketplace, and typed plugin extension points. Plugin
entry points load none by default and require an exact local distribution allowlist through
`academy plugins --allow-distribution ...`. Hosted services keep arbitrary plugin and learner
code disabled.

Content lives under each manifest's `translations` map. Update `updated_at` when an item is
reviewed, then run the schema, freshness, interface, and Academy tests.
