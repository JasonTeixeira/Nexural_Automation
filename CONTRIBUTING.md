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

By submitting a PR, you agree your contribution is licensed under Apache-2.0.
