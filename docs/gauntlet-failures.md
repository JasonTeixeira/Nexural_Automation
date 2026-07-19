# Gauntlet Failure Guide

The gauntlet is supposed to reject weak research early. A failure is useful
evidence, not an error to hide.

| Check | What It Means | Typical Fix |
| --- | --- | --- |
| `trade_count` | Not enough observations for the claim | Extend test window or reduce claims |
| `deflated_sharpe` | Edge may be multiple-testing noise | Reduce parameter mining, add true OOS |
| `profit_factor` | Gross wins do not sufficiently exceed losses | Improve exit/risk logic |
| `walk_forward_validation` | A trade export cannot prove fitting discipline, or fitted OOS edge failed | Supply a trusted fit/evaluate adapter with frozen parameters and disjoint purged/embargoed folds |
| `bootstrap_sharpe_ci` | Lower confidence interval is not positive | Increase robustness or sample quality |
| `monte_carlo_path` | Equity path is fragile to ordering | Reduce clustered loss exposure |
| `tail_shape` | Left-tail dependency is too severe | Add hard risk caps and tail filters |
| `recency` | Latest quartile lost edge | Check regime drift and stale parameters |
| `drawdown_to_net` | Drawdown dwarfs net profit | Improve sizing, stops, or reject |
| `cost_stress` | Edge disappears after realistic costs | Reduce turnover or improve entry quality |

Promotion rule: do not paper-trade a strategy just because the equity curve is
pretty. It must survive the checks together.
