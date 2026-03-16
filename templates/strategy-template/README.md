# Strategy Module Template

Use this template when adding a new **strategy** module for NinjaTrader or TradingView.

## Quick start
1. Copy this folder into the appropriate platform:
   - NinjaTrader: `platforms/ninjatrader/Strategies/<StrategyName>/`
   - TradingView: `platforms/tradingview/strategies/<StrategyName>/`
2. Fill out `metadata.yaml`.
3. Write the `README.md` and `parameters.md` first.
4. Add code under `src/`.

## What makes a good module
A good module is:
- clear about what it is trying to do
- honest about where it fails
- explicit about parameters and units
- reproducible (someone else can run the same sim test)

## Required files
- `metadata.yaml`
- `README.md`
- `parameters.md`
- `notes.md`
- `changelog.md`
- directories: `src/`, `screenshots/`, `test-results/`

## README expectations
Your module README should include:
- purpose and market context
- entry/exit logic (plain language)
- required data (volumetric, bid/ask, etc.)
- risk controls (max loss, session rules)
- assumptions and failure modes

## Safety
Research/education only. Users are responsible for validation and any live use.
See the repository `DISCLAIMER.md`.
