# Nexural Automation Docs

Nexural Automation is a public automation lab for futures strategy research,
MCP-powered agent workflows, strategy scaffolding, bridge development, and
paper-first validation.

## Start Here

- [Polished Docs Landing Page](index.html)
- [Public MVP Tutorial](public-mvp-tutorial.md)
- [MCP Automation Server](mcp-automation-server.md)
- [MCP Contract](mcp-contract.md)
- [Automation Academy](automation-academy.md)
- [Example Catalog](example-catalog.md)
- [Security Hardening](security-hardening.md)
- [Gauntlet Failure Guide](gauntlet-failures.md)
- [Public Launch Checklist](public-launch-checklist.md)

## Core Contracts

- Strategy metadata must pass `nexural-research validate-strategy`.
- Bridge contracts must pass `nexural-research validate-bridge`.
- Public quality must pass `nexural-research quality-gate --threshold 0.95 --json`.

## Safety

This project is for research, education, simulation, and paper-first workflows.
It does not provide financial advice or guarantee future performance.
