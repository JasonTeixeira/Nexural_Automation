# Nexural Automation Docs

Nexural Automation is a public automation lab for futures strategy research,
MCP-powered agent workflows, strategy scaffolding, bridge development, and
paper-first validation.

## Start Here

- [Polished Docs Landing Page](index.html)
- [Public MVP Tutorial](public-mvp-tutorial.md)
- [MCP Automation Server](mcp-automation-server.md)
- [MCP Contract](mcp-contract.md)
- [MCP/API Examples](mcp-api-examples.md)
- [Automation Academy](automation-academy.md)
- [Build Your First Strategy](build-your-first-strategy.md)
- [Build Your First Bridge](build-your-first-bridge.md)
- [Example Catalog](example-catalog.md)
- [Install Matrix](install-matrix.md)
- [Security Hardening](security-hardening.md)
- [Secret Rotation](secret-rotation.md)
- [Gauntlet Failure Guide](gauntlet-failures.md)
- [Why Strategies Fail The Gauntlet](why-strategies-fail-the-gauntlet.md)
- [Cost Model Assumptions](cost-model-assumptions.md)
- [Walk-Forward Examples](walk-forward-examples.md)
- [Overfitting Primer](overfitting-primer.md)
- [Automation Glossary](automation-glossary.md)
- [Strategy Lab Wiring](strategy-lab-wiring.md)
- [Backward Compatibility](backward-compatibility.md)
- [Public Launch Checklist](public-launch-checklist.md)

## Core Contracts

- Strategy metadata must pass `nexural-research validate-strategy`.
- Bridge contracts must pass `nexural-research validate-bridge`.
- Public quality must pass `nexural-research quality-gate --threshold 0.95 --json`.

## Safety

This project is for research, education, simulation, and paper-first workflows.
It does not provide financial advice or guarantee future performance.
