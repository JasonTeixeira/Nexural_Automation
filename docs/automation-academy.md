# Automation Academy

Nexural Automation is meant to teach contributors how to build strategy systems, not just read strategy notes. The public learning path is a loop:

1. State a thesis.
2. Scaffold the strategy.
3. Validate the metadata contract.
4. Run a historical export through the gauntlet.
5. Estimate costs.
6. Export a report.
7. Decide reject, tune, watchlist, or promote to paper.
8. Build a bridge only after the research contract is clean.

## Track 1: Strategy Builder

Start with a strategy scaffold:

```powershell
cd platforms\python\research\nexural-research
nexural-research new-strategy "Opening Range Failure" --platform python --output-dir ..\examples\strategies
```

Every strategy must include:

- `metadata.yaml` with symbols, asset class, platform, no-lookahead policy, and promotion gate.
- `parameters.md` with tunable parameters and fixed assumptions.
- `validation.md` with walk-forward, cost, slippage, and rejection evidence.
- Source code that separates signal generation from execution assumptions.

Run:

```powershell
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
```

## Track 2: Gauntlet Operator

Use the gauntlet before trusting any backtest:

```powershell
nexural-research gauntlet --input C:\Exports\nq_strategy.csv --symbol NQ --strategy-name "NQ ORF"
nexural-research costs --symbol NQ --trades 250 --quantity 1 --stress-profile elevated
```

Required habits:

- Treat costs as part of the strategy, not a postscript.
- Reject lookahead, same-bar execution shortcuts, and synthetic fills.
- Compare Monte Carlo drawdown, walk-forward efficiency, DSR, and tail risk before reading net profit.
- Do not promote anything without a paper-first checkpoint.

## Track 3: Bridge Builder

Create a bridge scaffold only after the strategy has a clean metadata contract:

```powershell
nexural-research new-bridge "NinjaTrader CSV" --output-dir ..\examples\bridges
nexural-research validate-bridge ..\examples\bridges\ninjatrader_csv\bridge_contract.json
```

Bridge acceptance requires proof files or documented evidence for:

- Health check.
- Paper signal roundtrip.
- Flatten acknowledgement.
- Kill-switch acknowledgement.
- Fill reconciliation.

## Track 4: Agent Automation

Run the MCP server:

```powershell
nexural-mcp
```

Then ask an agent to analyze a CSV, scaffold a strategy, estimate costs, or generate a report. Keep `NEXURAL_ALLOWED_DATA_DIRS` set when an agent can read local files.

## Graduation Standard

A contributor is ready to submit public examples when they can:

- Explain why the strategy is not using lookahead.
- Run `validate-strategy`, `validate-bridge`, and `quality-gate`.
- Interpret each gauntlet rejection.
- Produce a paper-first bridge proof without live order routing.

