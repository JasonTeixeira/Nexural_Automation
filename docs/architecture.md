# Architecture

![Nexural Automation system map](assets/diagrams/system-map.svg)

Use the [visual operator manual](operator-manual.md#1-understand-the-system) for a
guided reading of every promotion boundary and evidence return path.

## Goals
- Multi-platform: NinjaTrader (C#), TradingView (Pine v5), Python research tooling.
- Contributor-friendly: clear module boundaries and documentation requirements.
- Safety posture: simulation-first, research-oriented, no performance marketing.

## Repository domains
- `platforms/`: platform-specific code (source of truth for runnable artifacts)
- `templates/`: canonical module templates used to create new modules
- `docs/`: project documentation, policies, and conventions
- `tests-notes/`: validation methodology, limitations, checklists
- `configs/`: reusable configuration presets and examples
- `scripts/`: repo tooling (catalog generation, validation, release helpers)

## Public MVP flow

The system map above is the authoritative orientation. The public API, CLI, MCP, and
UI are interfaces to the research engine; none bypass the promotion gate or the
native NT8 safety kernel.

## Module boundary
A *module* is a strategy or indicator folder that ships with documentation and metadata:
- `src/`: code
- `README.md`: what it does and what it does *not* do
- `parameters.md`: parameter table with defaults and units
- `notes.md`: research notes and known limitations
- `changelog.md`: module-level changes
- `metadata.yaml`: machine-readable metadata

## Platform boundaries
- NinjaTrader code lives under `platforms/ninjatrader/`.
- TradingView code lives under `platforms/tradingview/`.
- Python tooling lives under `platforms/python/`.

## Release philosophy
This repository will treat templates and examples as versioned artifacts:
- semantic versioning at the repo level
- module-level changelogs for material changes
