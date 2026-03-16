# Backtesting Policy and Limitations

Backtesting is useful, but it is also easy to misuse.

## What backtests in this repo mean
Backtests and screenshots (if provided) are **examples** of how someone tested a module. They are not a promise of future performance.

## Common failure points
- different fill models (limit/market behavior differs)
- spread/slippage varies
- data quality differences between vendors
- order flow features depend heavily on how historical bid/ask is constructed
- overfitting (especially with many parameters)

## What contributors should include
When submitting a strategy/indicator PR, include at least:
- instrument(s) + session template
- data source/vendor (if known)
- period tested (date range)
- slippage/commission assumptions (even rough)
- what you expected to happen vs what actually happened
- known failure modes (conditions where it performs poorly)

## Simulation-first workflow
We strongly prefer:
1) backtest
2) sim test
3) only then consider live deployment (at your own risk)
