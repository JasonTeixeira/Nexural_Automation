# MCP/API Examples

## Capabilities

MCP tool:

```json
{
  "tool": "list_capabilities",
  "arguments": {}
}
```

Expected shape:

```json
{
  "name": "Nexural Automation",
  "version": "2.1.0",
  "automation_workflows": ["institutional_gauntlet", "strategy_scaffolding", "bridge_scaffolding"]
}
```

## Run Gauntlet

```json
{
  "tool": "run_strategy_gauntlet",
  "arguments": {
    "csv_path": "C:/Exports/nq_strategy.csv",
    "strategy_name": "NQ Opening Range",
    "symbol": "NQ",
    "min_trades": 100,
    "n_trials": 100,
    "cost_stress_profile": "elevated"
  }
}
```

Decision values:

- `REJECT`
- `TUNE`
- `REWRITE`
- `PROMOTE_TO_PAPER`

## Estimate Costs

```json
{
  "tool": "estimate_strategy_costs",
  "arguments": {
    "symbol": "NQ",
    "trades": 250,
    "quantity": 1,
    "stress_profile": "elevated"
  }
}
```

## Generate Report

```json
{
  "tool": "generate_report",
  "arguments": {
    "csv_path": "C:/Exports/nq_strategy.csv",
    "output_dir": "C:/Reports/Nexural",
    "title": "NQ Opening Range Review"
  }
}
```

## Scaffold Strategy

```json
{
  "tool": "scaffold_strategy",
  "arguments": {
    "name": "Opening Range Failure",
    "platform": "python",
    "output_dir": "strategies"
  }
}
```

## Scaffold Bridge

```json
{
  "tool": "scaffold_bridge",
  "arguments": {
    "name": "NinjaTrader CSV",
    "output_dir": "bridges"
  }
}
```
