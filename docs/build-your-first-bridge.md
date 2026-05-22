# Build Your First Bridge

## 1. Create The Scaffold

```powershell
cd platforms\python\research\nexural-research
nexural-research new-bridge "NinjaTrader CSV" --output-dir ..\examples\bridges
```

## 2. Implement The Lifecycle

Every bridge must implement:

- `health()`
- `send_signal(signal)`
- `flatten(symbol, reason)`
- `kill_switch(reason)`
- `reconcile_fills(fills)`

## 3. Keep Live Routing Disabled

The public SDK is paper-first. Live routing must be impossible unless an external config is explicitly provided and reviewed.

## 4. Add Proof Artifacts

Create proof notes for:

- Health check.
- Paper signal roundtrip.
- Flatten acknowledgement.
- Kill-switch acknowledgement.
- Fill reconciliation.

## 5. Validate

```powershell
nexural-research validate-bridge ..\examples\bridges\ninjatrader_csv\bridge_contract.json
```

## 6. Run Quality Gate

```powershell
nexural-research quality-gate --threshold 0.95 --json --fast
```
