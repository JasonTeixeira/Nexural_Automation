# Quickstart (60 seconds)

A typed transcript of what the full demo flow looks like. Anyone reading this
should be able to reproduce it on a fresh clone.

```text
$ git clone https://github.com/JasonTeixeira/Nexural_Automation.git
Cloning into 'Nexural_Automation'...

$ cd Nexural_Automation
$ make setup
cd platforms/python/research/nexural-research && pip install -e ".[dev,mcp]"
Successfully installed nexural-research-2.0.0

$ make smoke
Decision: REJECT | Score: 90.0 | Passed: False
PASS trade_count                  200 / >= 100
PASS profit_factor                ... / >= 1.2
PASS deflated_sharpe              ... / significant
FAIL walk_forward_validation      not_evaluated / fitted adapter required
PASS cost_stress                  ... / profitable

$ make report
📄 Report written to: /tmp/nexural-demo-report.html

$ open /tmp/nexural-demo-report.html
# → equity curve, drawdown, MAE/MFE histograms, time-of-day heatmap
```

That's it. To run on your own trades:

```text
$ make gauntlet CSV=/path/to/your_trades.csv
```

To record this as an animated cast for the README, install
[`asciinema`](https://asciinema.org) and run:

```bash
asciinema rec -c "bash -lc 'make smoke && make report'" docs/assets/quickstart.cast
```

Then embed the resulting `.cast` (or its rendered SVG) in `README.md`.

The exact metric values can change as the institutional methodology improves;
the decision vocabulary and check names are contract-tested.

## What the gauntlet checks

| Check                  | Why it matters                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `trade_count`          | Avoid drawing conclusions from a too-small sample                     |
| `profit_factor`        | Gross win / gross loss — primary edge signal                          |
| `sharpe`               | Risk-adjusted return                                                  |
| `max_drawdown_pct`     | How bad does the worst stretch look?                                  |
| `deflated_sharpe`      | Corrects headline Sharpe for multiple-testing bias                    |
| `walk_forward_validation` | Requires fit-on-IS, frozen parameters, disjoint OOS folds, and purge/embargo evidence |
| `cost_stress`          | Re-prices trades under stressed commissions + slippage                |

A run that **passes the gauntlet is not a green light to trade**. It is a
research artifact saying "this dataset survives the basic skeptic checks."
Live deployment requires far more rigor — see
[`docs/backtesting-policy.md`](backtesting-policy.md).
