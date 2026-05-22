# Example Catalog

This catalog lists the public examples that are intended to stay valid in CI and useful for contributors.

## Strategies

### Opening Range Failure

Path:

```text
platforms/python/research/examples/strategies/opening_range_failure
```

Purpose:

- Demonstrates a Python strategy scaffold.
- Shows required `metadata.yaml`, `parameters.md`, and `validation.md`.
- Uses explicit next-bar execution language to avoid lookahead assumptions.

Validation:

```powershell
cd platforms\python\research\nexural-research
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
```

Expected result:

```json
{"valid": true}
```

### NinjaTrader Opening Range Retest

Path:

```text
platforms/python/research/examples/strategies/ninjatrader_opening_range_retest
```

Purpose:

- Demonstrates a NinjaScript strategy example.
- Documents next-bar execution and paper-first validation.
- Shows how NinjaTrader examples should structure parameters and validation notes.

### TradingView VWAP Reversion

Path:

```text
platforms/python/research/examples/strategies/tradingview_vwap_reversion
```

Purpose:

- Demonstrates a Pine strategy example.
- Calls out repainting and bar-close behavior.
- Keeps promotion gated behind out-of-sample validation.

### Multi-Symbol Regime Filter

Path:

```text
platforms/python/research/examples/strategies/multi_symbol_regime_filter
```

Purpose:

- Demonstrates multi-symbol Python strategy structure.
- Separates regime filter inputs from trade execution.
- Documents no-lookahead rules for cross-symbol features.

## Bridges

### NinjaTrader CSV Bridge

Path:

```text
platforms/python/research/examples/bridges/ninjatrader_csv
```

Purpose:

- Demonstrates the minimum bridge contract.
- Keeps live order routing out of the public example.
- Documents required proof artifacts for health, paper roundtrip, flatten, kill-switch, and fills.

Validation:

```powershell
cd platforms\python\research\nexural-research
nexural-research validate-bridge ..\examples\bridges\ninjatrader_csv\bridge_contract.json
```

Expected result:

```json
{"valid": true}
```

## Adding A New Example

New strategy examples must include:

- `metadata.yaml`.
- `README.md`.
- `parameters.md`.
- `validation.md`.
- Source code under `src/`.

New bridge examples must include:

- `bridge_contract.json`.
- `README.md`.
- Connector source.
- Paper-only proof notes.

No example may claim profitability, use live status, or require real API keys to validate.
