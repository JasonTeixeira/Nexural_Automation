# Public MVP Tutorial

This walkthrough is the shortest contributor path through the public MVP.

## 1. Install

```powershell
cd platforms\python\research\nexural-research
$env:SETUPTOOLS_USE_DISTUTILS = "stdlib"
py -3.11 -m pip install -e ".[dev,mcp]"
```

## 2. Create A Strategy

```powershell
nexural-research new-strategy "Opening Range Failure" --platform python --output-dir strategies
nexural-research validate-strategy strategies\opening_range_failure\metadata.yaml
```

Every strategy scaffold includes a thesis README, metadata, parameters,
validation checklist, notes file, and starter source.

## 3. Run The Gauntlet

```powershell
nexural-research gauntlet --input data\exports\sample_trades.csv --symbol NQ --strategy-name "Opening Range Failure"
```

Promotion requires a combined evidence package: sample size, Deflated Sharpe,
walk-forward efficiency, bootstrap confidence, path robustness, tail shape,
recency, drawdown-to-net, and cost stress.

## 4. Estimate Costs

```powershell
nexural-research costs --symbol NQ --trades 250 --quantity 1 --stress-profile elevated
```

Cost estimates are intentionally conservative. A strategy that only works before
commission and slippage is not ready for paper.

## 5. Create A Bridge

```powershell
nexural-research new-bridge "NinjaTrader CSV" --output-dir bridges
nexural-research validate-bridge bridges\ninjatrader_csv\bridge_contract.json
```

Bridge contracts require health, signal, and flatten methods. Live routing
requires paper roundtrip, flatten, kill-switch, and fill reconciliation proofs.

## 6. Run The Quality Gate

```powershell
nexural-research quality-gate --threshold 0.95 --json
```

The public MVP gate runs lint, tests, MCP smoke, contract validation, Bandit,
and the non-e2e backend test suite.
