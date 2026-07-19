# Walk-Forward Examples

Walk-forward testing separates in-sample fitting from out-of-sample behavior.

## Good Result

- Out-of-sample net profit remains positive.
- Walk-forward efficiency is stable.
- Performance is not concentrated in one window.
- Costs do not flip the result.

Action: supply fitted/frozen, purged walk-forward evidence to the gauntlet. Consider
`PROMOTE_TO_PAPER` only when that evaluation and every other hard gate pass. The descriptive
rolling walk-forward report generated from a trade export is not promotion evidence.

## Weak Result

- In-sample result is strong.
- Out-of-sample result is flat or negative.
- One window creates most of the profit.
- Parameter sensitivity is high.

Action: `TUNE` or `REWRITE`.

## Failed Result

- Out-of-sample result is negative.
- Drawdown expands out of sample.
- Cost stress flips the edge.
- DSR flags overfitting.

Action: `REJECT`.
