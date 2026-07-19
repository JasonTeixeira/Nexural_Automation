# Nexural Automation Academy

A safety-first, scenario-driven curriculum for NinjaTrader and quantitative automation. Each
mission is an executable, versioned content package evaluated by `nexural_research.academy`.
Learners repair a data-only declarative trace program. A trusted deterministic runner derives the
trace, test results, source hash, seeded fault evidence, and artifact digest; submitted pass/fail
claims are ignored. The hosted API never imports or executes learner-supplied code. No rubric
awards points for profitability, Sharpe, returns, or win rate.

The five tracks are NinjaTrader Foundations, Strategy Builder, Research Operator, Bridge Engineer,
and Agent Automation Engineer. Exactly 60 executable labs lead to five capstones. Prerequisites are enforced by the domain service,
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

Each lab contains `concept.en.md`, `concept.es.md`, a failing starter program, public tests,
hidden-test metadata, a reference solution, an expected trace, and an evidence rubric. To create
or validate compatible packages without executing code:

```powershell
python -m nexural_research.academy.authoring new nt8.example --root academy/lessons --track nt8-foundations --title "Example" --title-es "Ejemplo"
python -m nexural_research.academy.authoring validate academy/lessons/nt8-example
```

API routes are available below `/api/academy/*` and `/api/v1/academy/*`. When
`NEXURAL_AUTH_ENABLED=true`, bearer authentication also isolates learner state by API-key subject.

## Extension surface

The curriculum includes deterministic seeded fault profiles wired into grading, a trace-aware tiered mentor,
instructor cohort summaries, bilingual English/Spanish concepts and exercise instructions, signed local
knowledge attestations, a digest-verified starter marketplace, and typed plugin extension points. Plugin
entry points load none by default and require an exact local distribution allowlist through
`academy plugins --allow-distribution ...`. Hosted services keep arbitrary plugin and learner
code disabled.

`academy/tools/generate_curriculum.py` is the deterministic source for the canonical 60-lab
catalog. Update the topic metadata and `updated_at`, regenerate, then run schema, package,
freshness, interface, and Academy tests.
