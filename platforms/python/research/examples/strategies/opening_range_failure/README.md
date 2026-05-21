# Opening Range Failure

This is a public example strategy scaffold for contributors. It is educational
only and intentionally incomplete until a researcher supplies data, parameters,
and validation evidence.

## Thesis

Opening range breakouts that fail quickly can expose trapped directional flow.
The example uses completed bars only and requires next-bar execution.

## Validation Loop

```powershell
cd platforms\python\research\nexural-research
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
nexural-research gauntlet --input data\exports\sample_trades.csv --symbol NQ --strategy-name "Opening Range Failure"
```

No strategy can be promoted from this template without passing gauntlet, cost
stress, and paper validation.
