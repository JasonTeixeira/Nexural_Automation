# NinjaTrader Opening Range Retest

Educational NinjaTrader strategy scaffold for contributors building NT8 modules
that can be validated by Nexural Automation.

## Thesis

Opening range breakouts that retest the range boundary can provide a cleaner
execution point than entering the initial breakout. The example requires the
range and retest bars to be closed before any modeled entry.

## Validation

Run metadata validation before adding Strategy Analyzer exports:

```powershell
nexural-research validate-strategy ..\examples\strategies\ninjatrader_opening_range_retest\metadata.yaml
```

This scaffold is paper-first and cannot route live orders.

