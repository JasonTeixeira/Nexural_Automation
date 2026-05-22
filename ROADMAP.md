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

## Public Release Phases To 100/100

### Phase 1: Release Hardening - Complete Locally

- MCP install and `mcp-smoke` are covered by the repo-local quality gate.
- GitHub Actions runs the public MVP quality gate on Windows, macOS, and Linux.
- Example Python strategy and CSV bridge fixtures validate through the CLI.
- Release checklist covers install, smoke, docs, security defaults, and audit status.

### Phase 2: Contributor Experience - Complete For Public MVP

- Tutorial walkthroughs cover strategy creation, bridge creation, gauntlet review, and report export.
- Contributor-facing example catalog documents expected files and validation commands.
- Strategy metadata and bridge contract schemas are published under `schemas/`.
- Gauntlet failure docs explain every public rejection gate.

### Phase 3: Strategy Lab Product Wiring - MVP Wired

- Surface the Nexural Automation gateway inside Strategy Lab UI workflows.
- Add authenticated UI actions for capabilities, CSV gauntlet, cost estimate, and report generation.
- Add Strategy Lab E2E tests that mock the Automation server and verify the gateway contract.
- Add a one-command local stack script for Strategy Lab plus Automation server.

### Phase 4: Public Launch Polish - Complete For Release Pack

- Docs site landing page is available at `docs/index.html`.
- Add issue templates for strategies, bridges, docs, and validation failures.
- Add release notes and tagged versioning for the MCP/API contract.
- Add public walkthrough docs, glossary, architecture diagram, install matrix, and Strategy Lab wiring contract.

## Definition Of 100/100

- Quality gate score is 1.0 locally and in CI.
- Fresh clone install works with Python 3.11.
- MCP smoke passes without manual import-path fixes.
- Public docs explain build, validate, export, bridge, and Strategy Lab usage.
- No committed local secrets, database files, MCP host configs, or generated session artifacts.
- Strategy examples include explicit no-lookahead and paper-first disclaimers.
