# Nexural Research — Data Dictionary

> Every metric explained: what it is, how it's calculated, and why it matters.

## Core Metrics

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Net Profit** | Sum of all trade PnL | Total money made/lost |
| **Win Rate** | Winning trades / Total trades | How often you win (not how much) |
| **Profit Factor** | Gross profit / Gross loss | Dollars won per dollar lost. >1.5 is viable, >2.0 is strong |
| **Max Drawdown** | Largest peak-to-trough equity decline | Worst losing streak in dollar terms |
| **Avg Winner** | Mean of positive trades | Average profit on winning trades |
| **Avg Loser** | Mean of negative trades | Average loss on losing trades |
| **Ulcer Index** | RMS of percentage drawdowns | Measures pain of drawdowns (like Sharpe but for drawdowns) |

## Risk-Adjusted Returns

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Sharpe Ratio** | (Mean return - Risk-free) / Std dev × sqrt(252) | Return per unit of total risk. >1.0 decent, >2.0 excellent |
| **Sortino Ratio** | (Mean return - MAR) / Downside deviation × sqrt(252) | Like Sharpe but only penalizes downside volatility. Better for asymmetric returns |
| **Calmar Ratio** | Total return / abs(Max drawdown) | Return relative to worst drawdown. Higher = faster recovery |
| **Omega Ratio** | Sum(gains above threshold) / Sum(losses below threshold) | Probability-weighted gain/loss. >1.0 means more upside than downside |
| **Tail Ratio** | 95th percentile / abs(5th percentile) | Right tail vs left tail. >1.0 means bigger wins than losses in extremes |
| **Gain-to-Pain** | Total return / Sum(abs(negative returns)) | How much you earn per dollar of pain endured |
| **Risk of Ruin** | (q/p)^N where q=loss rate, p=win rate | Probability of total account destruction |

## Expectancy & Position Sizing

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Expectancy** | Mean PnL per trade | Average dollars earned per trade |
| **Payoff Ratio** | Avg win / Avg loss | How much you win relative to losses |
| **Kelly %** | (Win rate × Payoff - Loss rate) / Payoff | Theoretically optimal position size. Use half-Kelly in practice |
| **Half-Kelly** | Kelly / 2 | Conservative position sizing — lower variance |
| **Optimal f** | Ralph Vince's fraction maximizing geometric growth | Found by testing f from 0.01 to 0.99, maximizing TWR |

## Trade Dependency

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Z-Score** | (Runs - Expected runs) / Std(runs) | Are wins/losses clustered or alternating? |Z|>1.96 = significant |
| **Serial Correlation** | Pearson r of PnL[t] vs PnL[t-1] | Does today's result predict tomorrow's? |
| **Max Consecutive Wins/Losses** | Longest streak count | Psychological preparation — what streaks to expect |

## Distribution Analysis

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Skewness** | Third standardized moment | <0 = left-skewed (fat left tail), >0 = right-skewed (big winners) |
| **Kurtosis** | Fourth standardized moment - 3 | >0 = fat tails (more extreme events than normal). Trading PnL is almost always >0 |
| **VaR 95%** | 5th percentile of PnL | "95% of the time, your worst trade is better than this" |
| **CVaR 95%** | Mean of trades worse than VaR | "When things go wrong, this is the average loss." Always worse than VaR |
| **Jarque-Bera** | Test statistic for normality | p<0.05 = returns are NOT normally distributed (almost always true for trading) |

## Institutional Metrics

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Recovery Factor** | Net profit / abs(Max drawdown) | How many times you've earned back your worst loss |
| **Time Under Water** | % of trades in drawdown | How often you're losing. >50% = painful to trade |
| **Profit per Day** | Net profit / Trading days | Daily earning rate |
| **Max DD Duration** | Longest drawdown in trade count | How many trades until new equity high |

## Desk-Level Analytics

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Hurst Exponent** | R/S analysis slope | H<0.5 = mean-reverting, H=0.5 = random walk, H>0.5 = trending |
| **ACF** | Autocorrelation at lags 1-20 | Which lag distances show trade dependency |
| **Rolling Correlation** | Windowed lag-1 autocorrelation over time | Is your strategy's character changing? |
| **Information Ratio** | (Recent mean - Baseline mean) / Tracking error | Is recent performance improving or degrading vs your own history? |

## Stress Testing

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Tail Amplification** | Worst N% of trades × multiplier | "What if my worst trades were 2-3x worse than backtested?" |
| **Parameter Sensitivity** | Metrics across stop/size grid | How fragile is the edge to parameter changes? High robustness = good |
| **Robustness Score** | % of grid combinations that are profitable | 0-100. Above 70 = robust, below 30 = fragile/overfit |

## Robustness Testing

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **Deflated Sharpe** | Sharpe adjusted for multiple testing | Does the Sharpe survive after accounting for how many strategies you tested? |
| **Walk-Forward Efficiency** | OOS performance / IS performance | How much does out-of-sample degrade from in-sample? >0.5 = good |
| **Block Bootstrap** | Resample preserving autocorrelation | Sharpe confidence intervals that respect trade dependency |
