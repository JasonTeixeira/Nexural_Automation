# Indicator Module Template

Use this template when adding a new **indicator** module for NinjaTrader or TradingView.

## Quick start
1. Copy this folder into the appropriate platform:
   - NinjaTrader: `platforms/ninjatrader/Indicators/<IndicatorName>/`
   - TradingView: `platforms/tradingview/indicators/<IndicatorName>/`
2. Fill out `metadata.yaml`.
3. Document repainting/lookahead behavior (if any).
4. Add code under `src/`.

## Indicator README expectations
- what it measures and why
- required data types (e.g., volumetric)
- outputs/plots
- performance considerations
- repainting/lookahead behavior

## Safety
Research/education only. Users are responsible for validation and any live use.
See the repository `DISCLAIMER.md`.
