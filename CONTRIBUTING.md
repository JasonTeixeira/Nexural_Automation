# Contributing

Thanks for contributing. The goal is to build a repo that’s useful to real traders and developers: clear, cautious, and reproducible.

## Contribution values
- simulation-first
- clear documentation
- conservative claims (no hype)
- reproducible steps

## What you can contribute
- NinjaTrader 8 strategies/indicators (primary)
- TradingView Pine v5 indicators/strategies (secondary)
- Python strategy scaffolds for the Strategy SDK
- paper-first bridge scaffolds for external tools
- docs, research notes, validation checklists
- utilities and tooling (carefully)

## Module requirements (required for strategies/indicators)
Each module folder must contain:
- `metadata.yaml`
- `README.md`
- `parameters.md`
- `notes.md`
- `changelog.md`
- directories: `src/`, `screenshots/`, `test-results/`

Use the templates in `templates/`.

## Public automation examples

For Strategy SDK and Bridge SDK examples, start with:

- [Automation Academy](docs/automation-academy.md)
- [Example Catalog](docs/example-catalog.md)
- [MCP Contract](docs/mcp-contract.md)
- [Security Hardening](docs/security-hardening.md)

Validate examples before opening a PR:

```powershell
cd platforms\python\research\nexural-research
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
nexural-research validate-bridge ..\examples\bridges\ninjatrader_csv\bridge_contract.json
nexural-research quality-gate --threshold 0.95 --json --fast
```

## How to add a NinjaTrader strategy
1. Copy: `templates/strategy-template/` → `platforms/ninjatrader/Strategies/<StrategyName>/`
2. Fill out `metadata.yaml`.
3. Write the README first (logic + assumptions + failure modes).
4. Add code under `src/`.
5. Add sim/backtest notes under `test-results/`.

## How to add a TradingView indicator
1. Copy: `templates/indicator-template/` → `platforms/tradingview/indicators/<IndicatorName>/`
2. Put your `.pine` file(s) under `src/`.
3. Document repainting/lookahead behavior explicitly.

## PR checklist
- No performance marketing or profitability claims
- Parameters + units documented
- Failure modes documented
- Test notes included (even if minimal)
- No committed `.mcp.json`, `.env`, exports, reports, databases, or API keys
- Strategy examples declare no-lookahead execution assumptions
- Bridge examples stay paper-first unless external safety proofs are documented

By submitting a PR, you agree your contribution is licensed under Apache-2.0.
