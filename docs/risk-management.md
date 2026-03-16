# Risk Management

This repo treats risk as part of the engineering work, not an afterthought.

## Minimum expectations (for strategy contributions)
- define a stop / invalidation condition
- define session boundaries (when it is allowed to trade)
- include a max-loss safety brake (daily or per-session)
- document what happens on disconnect/reconnect

## Practical controls to consider
- max daily loss
- max trades per day
- cooldown after consecutive losses
- volatility filters
- news/time filters
- position sizing model

## Notes
Even “good” logic can fail in live conditions due to microstructure, slippage, and execution issues.
