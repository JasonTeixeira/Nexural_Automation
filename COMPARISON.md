# How Nexural compares to other tools

Quant trading is a crowded toolspace. Nexural_Automation isn't trying to replace event-driven backtesters, broker frameworks, or vectorized research libraries — it sits at a **specific seam**: take a trade-execution export, harden it against the kinds of mistakes that kill live deployments, and expose the result as research artifacts and MCP tools.

This document is an honest read of where Nexural fits and where you should pick something else.

## At a glance

| Capability                                       | **Nexural_Automation** | nautilus_trader | Freqtrade | vectorbt | QuantConnect Lean |
| ------------------------------------------------ | ---------------------- | --------------- | --------- | -------- | ----------------- |
| Primary audience                                 | NT8/TV traders doing post-hoc validation | Pro Python quants | Crypto retail | Vector research | Cloud/algo desks |
| Asset focus                                      | Futures (NQ/ES/CL/GC), equities | Multi-asset | Crypto | Multi-asset | Multi-asset |
| Ingest **broker exports** (NT8 Trades/Executions/Optimization) | ✅ first-class | partial | ❌ | ❌ | ❌ |
| Event-driven backtest engine                     | ❌ (intentional)        | ✅ best-in-class | ✅ | ❌ | ✅ |
| Vectorized backtest engine                       | ❌                      | partial | ❌ | ✅ | partial |
| **Institutional gauntlet** (PF/Sharpe/DD/robustness/cost-stress as one decision) | ✅ | ❌ | ❌ | ❌ | partial |
| **Futures cost model** (commissions + slippage + exchange fees + cost stress) | ✅ | manual | manual | manual | manual |
| Monte Carlo / bootstrap robustness               | ✅ built-in             | manual | manual | via numpy | manual |
| Walk-forward analysis                            | ✅ built-in             | manual | manual | manual | ✅ |
| **MCP server** (Claude/Cursor/IDE tools)         | ✅ 8 tools              | ❌ | ❌ | ❌ | ❌ |
| NinjaTrader 8 module templates                   | ✅ first-class          | ❌ | ❌ | ❌ | ❌ |
| TradingView indicator templates                  | ✅ first-class          | ❌ | ❌ | ❌ | ❌ |
| Live order routing                               | ❌ (intentional)        | ✅ | ✅ | ❌ | ✅ |
| Hosted cloud                                     | ❌                      | ❌ | ❌ | ❌ | ✅ (Lean Cloud) |
| License                                          | Apache-2.0             | LGPL-3.0 | GPL-3.0 | (commercial PRO + AGPL) | Apache-2.0 |

## When to pick Nexural

- You already trade on **NinjaTrader 8** or **TradingView** and want a way to **validate** what came back rather than rebuild your strategy in Python.
- You want a single CLI/MCP tool that ingests trade exports and returns a **pass/fail gauntlet** (PF, Sharpe, drawdown, robustness, cost-stress) instead of glueing five libraries together.
- You want your trading workflow exposed as **MCP tools** so Claude / Cursor / your IDE can call `gauntlet`, `report`, `costs`, etc.
- You want clean module templates (strategy + indicator) with metadata so a portfolio of modules is reviewable.

## When to pick something else

- **You need an event-driven backtester.** Use [nautilus_trader](https://nautilustrader.io). Best-in-class for Python, multi-asset, production-grade.
- **You're a crypto retail trader who wants to live-trade.** Use [Freqtrade](https://www.freqtrade.io). Great UX for crypto exchanges, big community.
- **You want vectorized research and large parameter sweeps.** Use [vectorbt](https://vectorbt.dev). Numpy-first, blazing fast for indicator sweeps and signal stacking.
- **You want a hosted, end-to-end algo desk in the cloud.** Use [QuantConnect Lean](https://www.quantconnect.com). Live brokerage integrations, hosted research, big data feeds.
- **You need formal exchange connectivity (FIX, broker SDKs, OMS).** Nexural deliberately stops at validation. Use a production framework.

## Honest limitations

- **No live order routing.** Ever. This is a research tool. Live = your responsibility on your platform of choice.
- **No general event-driven engine.** Nexural reasons about what already happened (trade exports), not what could happen tick by tick.
- **Futures-leaning cost model.** Equities work, options aren't first-class.
- **Single-strategy gauntlet.** Multi-strategy correlation/portfolio gauntlet is on the roadmap, not shipped.
- **Python 3.11 only** (right now). 3.12 support is in progress.

## Coexistence

A common pattern that works well:

1. **Idea → research:** sketch in vectorbt or pandas notebooks.
2. **Refine → execute:** trade live in NinjaTrader 8 / TradingView.
3. **Validate → publish:** export trades, run Nexural's gauntlet, get the HTML report, attach it to your module's `test-results/`.
4. **Automate → expose:** wire the MCP server into your IDE so you can ask the assistant to re-run the gauntlet on the latest export without leaving the editor.

Nexural is the validation + module-publishing seam — not the backtester, not the broker. Use it for what it's good at, and lean on the other tools for the rest.
