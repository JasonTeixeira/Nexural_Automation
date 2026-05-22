# Cost Model Assumptions

The cost model exists to prevent fake edge. Every strategy must survive commissions and slippage before promotion to paper.

## Included Costs

- Round-turn commission estimate.
- Symbol-specific futures assumptions.
- Quantity scaling.
- Normal, elevated, and stress profiles.
- Optional slippage multiplier.

## Not Included

- Broker-specific fee schedules.
- Exchange fee changes after the release date.
- Real-time spread and queue-position modeling.
- Partial fill behavior.

## Usage

```powershell
nexural-research costs --symbol NQ --trades 250 --quantity 1 --stress-profile elevated
```

## Review Standard

A strategy that only works before costs should be rejected or rewritten. A strategy that works only under normal costs should usually be watchlisted or tuned, not promoted.
