# Quickstart (60 seconds)

A typed transcript of what the full demo flow looks like. Anyone reading this
should be able to reproduce it on a fresh clone.

```text
$ git clone https://github.com/JasonTeixeira/Nexural_Automation.git
Cloning into 'Nexural_Automation'...

$ cd Nexural_Automation
$ make setup
cd platforms/python/research/nexural-research && pip install -e ".[dev,mcp]"
Successfully installed nexural-research-0.2.0

$ make smoke
Decision: pass | Score: 87 | Passed: True
PASS trades_count                 200 / 100
PASS profit_factor                1.34 / 1.20
PASS sharpe                       1.61 / 1.00
PASS max_drawdown_pct            -8.40 / -15.00
PASS robustness_p_value           0.018 / 0.050
PASS cost_stress_moderate         pass / pass

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

## What the gauntlet checks

| Check                  | Why it matters                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `trades_count`         | Avoid drawing conclusions from a too-small sample                     |
| `profit_factor`        | Gross win / gross loss — primary edge signal                          |
| `sharpe`               | Risk-adjusted return                                                  |
| `max_drawdown_pct`     | How bad does the worst stretch look?                                  |
| `robustness_p_value`   | Bootstrap test — could the result come from luck?                     |
| `cost_stress_moderate` | Re-prices trades under stressed commissions + slippage                |

A run that **passes the gauntlet is not a green light to trade**. It is a
research artifact saying "this dataset survives the basic skeptic checks."
Live deployment requires far more rigor — see
[`docs/backtesting-policy.md`](backtesting-policy.md).
