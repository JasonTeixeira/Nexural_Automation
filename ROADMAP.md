# Roadmap

This roadmap is the release track for turning Nexural Automation from a static
strategy repository into a public, agent-callable automation and education
platform.

## Public MVP: Complete

The public MVP gives contributors a usable loop:

1. Build a strategy scaffold with `nexural-research new-strategy`.
2. Build a connector scaffold with `nexural-research new-bridge`.
3. Validate a historical export with `nexural-research gauntlet`.
4. Stress the strategy with realistic futures costs using `nexural-research costs`.
5. Call the same workflows from MCP, HTTP API, CLI, tests, or Strategy Lab.
6. Run the repo-local quality gate with `nexural-research quality-gate --threshold 0.95`.

## Remaining Phases To 100/100

### Phase 1: Release Hardening

- Keep MCP install and `mcp-smoke` green on Windows, macOS, and Linux.
- Add GitHub Actions for the public MVP quality gate.
- Add examples for one Python strategy, one NinjaTrader strategy, one TradingView strategy, and one CSV bridge.
- Publish a clean release checklist covering install, smoke, docs, and security scan.

### Phase 2: Contributor Experience

- Add tutorial walkthroughs for strategy creation, bridge creation, gauntlet review, and report export.
- Add a contributor-facing `examples/` catalog with expected inputs and outputs.
- Add schema validation for strategy metadata and bridge contracts.
- Add "what failed and why" docs for rejected gauntlet checks.

### Phase 3: Strategy Lab Product Wiring

- Surface the Nexural Automation gateway inside Strategy Lab UI workflows.
- Add authenticated UI actions for capabilities, CSV gauntlet, cost estimate, and report generation.
- Add Strategy Lab E2E tests that mock the Automation server and verify the gateway contract.
- Add a one-command local stack script for Strategy Lab plus Automation server.

### Phase 4: Public Launch Polish

- Add docs site or GitHub Pages landing docs.
- Add issue templates for strategies, bridges, docs, and validation failures.
- Add release notes and tagged versioning for the MCP/API contract.
- Add public demo data and screenshots without implying performance claims.

## Definition Of 100/100

- Quality gate score is 1.0 locally and in CI.
- Fresh clone install works with Python 3.11.
- MCP smoke passes without manual import-path fixes.
- Public docs explain build, validate, export, bridge, and Strategy Lab usage.
- No committed local secrets, database files, MCP host configs, or generated session artifacts.
- Strategy examples include explicit no-lookahead and paper-first disclaimers.
