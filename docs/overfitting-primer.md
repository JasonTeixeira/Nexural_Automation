# Overfitting Primer

## Deflated Sharpe Ratio

Deflated Sharpe Ratio adjusts for multiple trials and non-normal returns. A high backtest Sharpe is not enough if it came from many parameter attempts.

## PBO

Probability of Backtest Overfitting estimates how likely a selected strategy is a product of the search process instead of durable edge.

## Monte Carlo

Monte Carlo resamples trade outcomes to estimate drawdown and tail risk. It answers: what happens if the same edge arrives in a worse order?

## CVaR

Conditional Value at Risk estimates average loss beyond a tail threshold. It is more useful than only asking for the single worst trade.

## Slippage

Slippage is the difference between assumed fill and realistic fill. A futures strategy that ignores slippage is not production-ready.
