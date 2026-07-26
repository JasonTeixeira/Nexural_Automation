# NT8 Data Infrastructure

This module makes local NinjaTrader 8 history auditable and reproducible without redistributing provider-licensed market data.

It contains:

- a read-only local archive audit;
- a rolling exact-contract hydration specification;
- a sanitized coverage snapshot from the Nexural research workstation; and
- explicit boundary rules for price, volume-profile, and order-flow research.

It never downloads, decodes, uploads, routes, or republishes historical market data.

## Quick start

Run this from PowerShell after NinjaTrader is closed or idle:

```powershell
./platforms/ninjatrader/data-infra/scripts/Test-NT8DataInfrastructure.ps1 `
  -OutputPath ./artifacts/nt8-data-infrastructure-audit.json
```

The script reads only `Documents\NinjaTrader 8\db`. It reports file counts, byte totals, exact-contract date spans, data kinds (`Last`, `Bid`, `Ask`), and Replay-file presence. It emits metadata and no market prices, sizes, or raw tick rows.

## Daily operating contract

Use [rolling-360d-last-tick-hydration.json](specs/rolling-360d-last-tick-hydration.json) as the authoritative operator contract:

1. Keep NT8 connected to an entitled historical-data provider.
2. Hydrate **Last Tick** for the active exact contract after each session.
3. During a roll, hydrate both outgoing and incoming exact contracts with overlap.
4. Re-hydrate the prior 14 calendar days each weekend to repair late or missing provider history.
5. Run the audit and retain its JSON receipt before campaign selection or out-of-sample testing.
6. Keep 360 days for broad screens and 24 months for candidates that advance to validation.

NinjaTrader Desktop performs the actual historical download through **Control Center → Tools → Historical Data → Download**. Its supported desktop connection is the authority for provider entitlement and historical availability; this repository does not attempt to bypass it.

## Research eligibility

| Input | Eligible research | Not eligible without more evidence |
|---|---|---|
| Exact-contract Last ticks | price action, auction, VWAP, trend, volatility, session, volume-at-price, 1-tick-fill Analyzer tests | Bid/Ask delta, imbalance, absorption, queue position |
| Historical Bid + Ask + Last | bid/ask stamped volumetric and delta research, subject to per-provider audit | DOM queue reconstruction and L2 order-book claims |
| Continuous native Replay / L1 / L2 capture | Playback/Sim execution review | historic queue priority unless the recorded feed actually contains it |

## Publishing boundary

Do not commit or publish `db/tick`, `db/cache`, `db/replay`, `.ncd`, `.nrd`, or raw-tick CSV files. They are provider/exchange data and may be licensed for the subscriber only. Publish the contract, manifest, hashes, settings, source, and derived research evidence instead. Each collaborator hydrates the same exact contracts with their own data entitlement.

See [current-coverage-snapshot.json](coverage/current-coverage-snapshot.json) for the sanitized local example and `../docs/NT8_DATA_INFRASTRUCTURE.md` for the full operator guide.
