# NT8 Data Infrastructure Operator Guide

![Portable NT8 data infrastructure](../../../docs/assets/diagrams/data-infrastructure.svg)

Use the [visual data runbook](../../../docs/operator-manual.md#8-operate-the-data-layer)
for the exact hydrate, audit, inspect, and retain sequence.

## Purpose

Create a reproducible local historical-data layer for Strategy Analyzer research without publishing exchange or provider data.

## Safe repository contents

Commit source code, exact-roll contracts, Analyzer settings, audit receipts, hashes, coverage summaries, synthetic fixtures, and research reports. Do not commit the local NinjaTrader database, Replay data, `.ncd`, `.nrd`, or raw tick exports.

## Hydration procedure

1. Connect NinjaTrader Desktop to an entitled historical-data provider.
2. In **Tools → Historical Data → Download**, select the exact futures contract, `Tick`, `1`, `Last`, and the requested date range.
3. Hydrate one exact contract at a time. Never substitute a merged/continuous instrument for an exact-roll campaign.
4. On roll, hydrate both contracts with overlap and record the roll map.
5. Repeat the trailing 14 days weekly. Provider archives can deliver late corrections or have transient holes.
6. Run `Test-NT8DataInfrastructure.ps1` and attach the JSON receipt to the campaign.

## What Last ticks can validate

Last ticks support price, auction, VWAP, volatility, session, trend, and volume-at-price research. A Strategy Analyzer test still needs high fill resolution, exact contracts, commissions, cost stress, chronological out-of-sample windows, and Sim/Playback before promotion.

## What requires more data

Historical bid/ask delta and imbalance need auditable Bid, Ask, and Last history. Absorption, DOM, liquidity pull, and queue logic require prospectively recorded native L1/L2/Replay evidence. No script can recreate that evidence from Last ticks after the fact.

## Audit command

```powershell
./platforms/ninjatrader/data-infra/scripts/Test-NT8DataInfrastructure.ps1 `
  -OutputPath ./artifacts/nt8-data-infrastructure-audit.json
```

The command is read-only. It does not connect to a broker, submit an order, download data, or expose tick values.
