# Getting Started

Welcome to **Nexural_Automation** — a simulation-first toolkit for serious algorithmic-trading research. This guide takes you from zero to publishing your own strategy module, organized into three tracks:

| Track            | Time      | You'll learn to…                                                |
| ---------------- | --------- | --------------------------------------------------------------- |
| 🟢 **Beginner**  | ~10 min   | Run the demo gauntlet and read the HTML report                  |
| 🟡 **Intermediate** | ~45 min   | Ingest your own trades, tune the gauntlet, generate reports     |
| 🔴 **Advanced**  | ~2 hrs+   | Build a strategy module, wire the Bridge SDK, expose MCP tools  |

> **Safety first.** Everything here runs in **simulation only**. Nothing in this repository routes live orders, and we strongly recommend you treat every output as a research artifact, not a trading signal. See [`DISCLAIMER.md`](DISCLAIMER.md).

---

## 🟢 Beginner — Run the demo in 10 minutes

You don't need to know Python to do this. You don't even need to install Python locally.

### Option A — One click in GitHub Codespaces (easiest)

1. Click the green **Code** button on the GitHub repo page.
2. Choose **Codespaces → Create codespace on main**.
3. Wait ~2 minutes for the environment to build. The container auto-installs everything.
4. In the terminal that opens, run:

   ```bash
   make smoke
   ```

   You'll see something like:

   ```
   Decision: REJECT | Score: 90.0 | Passed: False
   PASS trade_count                  200 / >= 100
   FAIL walk_forward_validation      not_evaluated / fitted adapter required
   PASS profit_factor                1.34 / 1.20
   ...
   ```

5. Generate the HTML report:

   ```bash
   make report
   ```

   Open the path it prints (`/tmp/nexural-demo-report.html`) in your browser. That's your first research report.

### Option B — Local install (Mac/Linux)

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
make setup        # installs the Python research package
make smoke        # runs the gauntlet on the bundled demo CSV
make report       # generates an HTML report
```

Requires **Python 3.11+** and `make`. If `make` is missing on macOS, run `xcode-select --install`.

### Option C — Local install (Windows)

PowerShell:

```powershell
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
./scripts/setup.ps1
```

Then run gauntlet/report via the longer commands shown in the Intermediate track below — Windows doesn't ship `make` by default.

### What just happened?

`make smoke` ran the **gauntlet** — a panel of institutional checks (trade count, profit factor, Sharpe, max drawdown, cost stress, robustness, etc.) — against a bundled synthetic 200-trade NQ CSV at [`examples/demo_nq_trades.csv`](examples/demo_nq_trades.csv). The gauntlet returns a **pass/fail decision** plus a per-check breakdown. It's the same harness you'd run on your own exports.

---

## 🟡 Intermediate — Use your own trades

### 1. Export trades from NinjaTrader 8

In NT8: **Control Center → Trade Performance → Trades** tab → right-click → **Export → CSV (comma)**. Save it anywhere; we'll pass the path in.

If your CSV uses a different export format (Executions / Optimization), that's fine — the ingest layer auto-detects them. See [`docs/installation.md`](docs/installation.md) for column-mapping details.

### 2. Run the gauntlet on your CSV

```bash
make gauntlet CSV=/full/path/to/your_trades.csv
```

or the long form:

```bash
cd platforms/python/research/nexural-research
python -m nexural_research.cli gauntlet \
  --input /full/path/to/your_trades.csv \
  --strategy-name MyStrategy \
  --symbol NQ \
  --min-trades 100 \
  --n-trials 200 \
  --cost-stress-profile elevated
```

Common flags:

| Flag                      | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `--min-trades`            | Reject runs with fewer than N trades (default 100)                    |
| `--n-trials`              | Bootstrap trials for robustness check (more = slower, more reliable)  |
| `--cost-stress-profile`   | `normal` / `elevated` / `crisis` — re-prices trades under stressed costs |
| `--fail-on-reject`        | Exit non-zero on `REJECT`; use this in CI and smoke tests              |
| `--symbol`                | NQ / ES / RTY / YM / CL / GC … drives the futures cost model          |

### 3. Generate an HTML report

```bash
cd platforms/python/research/nexural-research
python -m nexural_research.cli report --input /full/path/to/your_trades.csv --out-dir ./reports
```

The HTML includes equity curve, drawdown, win-rate breakdown, time-of-day heatmap, MAE/MFE distribution, and cost stress overlay.

### 4. Estimate execution costs

```bash
python -m nexural_research.cli costs --symbol NQ --trades 200 --quantity 1 --stress-profile elevated
```

Returns commissions, slippage, exchange fees, and total cost-per-RT under your chosen stress profile.

### 5. Tasks reference

| `make` target    | What it runs                                              |
| ---------------- | --------------------------------------------------------- |
| `make help`      | Print this menu                                           |
| `make setup`     | Install Python package + dev tooling                      |
| `make smoke`     | Gauntlet on bundled demo CSV                              |
| `make report`    | HTML report on bundled demo CSV                           |
| `make gauntlet CSV=…` | Gauntlet on your CSV                                 |
| `make test`      | Fast test suite                                           |
| `make lint`      | Ruff lint                                                 |
| `make fmt`       | Ruff autoformat                                           |
| `make quality-gate` | Full quality gate (same as CI)                          |
| `make mcp-smoke` | Smoke-test the MCP server                                 |
| `make mcp-serve` | Run the MCP server over stdio                             |
| `make clean`     | Remove caches and build artifacts                         |

---

## 🔴 Advanced — Build your own modules

### A. Scaffold a strategy

```bash
cd platforms/python/research/nexural-research
python -m nexural_research.cli new-strategy MyEdgeStrategy
```

This creates a Strategy SDK skeleton with config schema, signal stubs, and a tests folder. Fill in your logic, then validate:

```bash
python -m nexural_research.cli validate-strategy ./strategies/my_edge_strategy/metadata.yaml
```

### B. Add a NinjaTrader 8 strategy module

1. Copy the template:

   ```bash
   cp -r templates/strategy-template platforms/ninjatrader/Strategies/MyStrategy
   ```

2. Fill in **before** writing code:
   - `README.md` — what it does, when it works, when it doesn't
   - `metadata.yaml` — symbol, timeframe, session, classification
   - `parameters.md` — every input with default + sensible range
   - `notes.md` — research log, assumptions, known limitations

3. Add NinjaScript under `src/MyStrategy.cs`.

4. Drop screenshots into `screenshots/` and exported test results into `test-results/`.

5. Update `MODULES.md` to register your strategy in the catalog.

### C. Add a TradingView indicator

Same shape as the NT8 layout, under `platforms/tradingview/indicators/<Name>/`. Pine Script source lives at `src/<Name>.pine`.

### D. Bridge SDK — connect external data

```bash
python -m nexural_research.cli new-bridge MyBroker
python -m nexural_research.cli validate-bridge ./bridges/my_broker/bridge_contract.json
```

The Bridge SDK normalizes external execution flows into a safety-first contract. Implement `health`, `send_signal`, `flatten`, `kill_switch`, and `reconcile_fills`.

### E. Expose tools over MCP

The MCP server (`make mcp-serve`) exposes the gauntlet, cost model, ingest, and reporting as **Model Context Protocol tools** for any compatible client (Claude Desktop, Cursor, etc.).

To register the server in Claude Desktop:

```bash
python -m nexural_research.cli mcp-install --host claude-desktop --yes
```

This writes the appropriate `mcp.json` entry. Restart your client and the tools appear.

### F. CI gates your contributions

Every PR runs:

- **`ci.yml`** — lint + fast tests
- **`python-research-ci.yml`** — package tests on Python 3.11
- **`module-catalog.yml`** — validates every module's metadata + structure
- **`docs-and-metadata.yml`** — link check + docs build
- **`codeql.yml`** — SAST for Python + JS/TS
- **`docs-pages.yml`** — deploys GitHub Pages on merge

A green checks-board is required for merge.

---

## Reading order (recommended)

1. [`DISCLAIMER.md`](DISCLAIMER.md) — what this repo is and isn't
2. [`docs/installation.md`](docs/installation.md) — deeper install notes
3. [`docs/architecture.md`](docs/architecture.md) — how the pieces fit
4. [`docs/backtesting-policy.md`](docs/backtesting-policy.md) — why we won't show profit claims
5. [`docs/strategy-framework.md`](docs/strategy-framework.md) — strategy module conventions
6. [`docs/risk-management.md`](docs/risk-management.md) — sizing, stops, kill-switches
7. [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to send a PR

---

## Getting unstuck

- **Discussions:** [github.com/JasonTeixeira/Nexural_Automation/discussions](https://github.com/JasonTeixeira/Nexural_Automation/discussions) — questions, ideas, show-and-tell.
- **Issues:** [github.com/JasonTeixeira/Nexural_Automation/issues](https://github.com/JasonTeixeira/Nexural_Automation/issues) — bugs and feature requests.
- **Security:** see [`SECURITY.md`](SECURITY.md). Do **not** report vulnerabilities in public issues.

You're set. Run `make smoke` and let's go. 🚀
