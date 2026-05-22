# Nexural Automation - MCP Strategy Lab, Gauntlet, and Bridge SDK

[![CI](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/ci.yml/badge.svg)](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/ci.yml)
[![python-research-ci](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/python-research-ci.yml/badge.svg)](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/python-research-ci.yml)
[![docs-and-metadata](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/docs-and-metadata.yml/badge.svg)](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/docs-and-metadata.yml)
[![module-catalog](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/module-catalog.yml/badge.svg)](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/module-catalog.yml)
[![docs-pages](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/docs-pages.yml/badge.svg)](https://github.com/JasonTeixeira/Nexural_Automation/actions/workflows/docs-pages.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![MCP Smoke](https://img.shields.io/badge/MCP-smoke%20tested-111827.svg)](docs/mcp-contract.md)

Nexural Automation is a public, local-first automation lab for strategy builders. It combines a Python research engine, MCP server, Strategy SDK, Bridge SDK, cost model, validation gauntlet, contributor examples, and education docs so people can build strategies, validate them, export reports, wire bridges, and learn the automation workflow end to end.

> Not financial advice. This project is for research, education, simulation, and paper-first development. See [DISCLAIMER.md](DISCLAIMER.md).

## Public MVP

Current public release: [v0.1.0-public-mvp](RELEASE_NOTES.md)

Live docs: https://jasonteixeira.github.io/Nexural_Automation/

Release status:

- GitHub Pages is enabled with GitHub Actions deployment.
- Public release workflow is tagged and green.
- Repo secret scan is clean for tracked files.
- Local MCP/API keys are not stored in this repo; rotate any real keys that were ever pasted into local configs.

What is included:

- MCP automation server with 8 stable tools.
- Strategy SDK for Python, NinjaTrader, TradingView, and multi-symbol examples.
- Bridge SDK with health, paper signal, flatten, kill-switch, and fill reconciliation lifecycle.
- SageQuant-style gauntlet with reject, tune, rewrite, and promote-to-paper decisions.
- Futures cost model and cost stress docs.
- Golden MCP contract fixture and contract tests.
- Public examples that validate in CI.
- One-command local stack scripts.
- Secret scanning, schema validation, locked Python audit, npm audit, Docker build, Trivy, and cross-platform quality gates.

## Install And Run

### One-Command Local Stack

Windows:

```powershell
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
.\scripts\start-local-stack.ps1
```

macOS/Linux:

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation
./scripts/start-local-stack.sh
```

Local URLs:

- API: `http://127.0.0.1:8000`
- MCP HTTP: `http://127.0.0.1:8765/mcp`
- UI: `http://127.0.0.1:3010`

### Dashboard Installer

Windows:

```bat
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation\platforms\python\research\nexural-research
install.bat
```

macOS/Linux:

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
cd Nexural_Automation/platforms/python/research/nexural-research
chmod +x install.sh && ./install.sh
./nexural-research
```

Docker:

```bash
cd platforms/python/research/nexural-research
docker compose up --build
```

Open `http://127.0.0.1:8000`.

Requirements:

- Python 3.11
- Node.js 22 only if developing the frontend
- Docker only if using the container path

## Core Workflows

### Strategy Validation

```powershell
cd platforms\python\research\nexural-research
nexural-research gauntlet --input C:\Exports\nq_strategy.csv --symbol NQ --strategy-name "NQ Research"
nexural-research costs --symbol NQ --trades 250 --stress-profile elevated
nexural-research report --input C:\Exports\nq_strategy.csv
```

### Strategy SDK

```powershell
nexural-research new-strategy "Opening Range Failure" --platform python
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
```

Included examples:

- [Opening Range Failure](platforms/python/research/examples/strategies/opening_range_failure)
- [NinjaTrader Opening Range Retest](platforms/python/research/examples/strategies/ninjatrader_opening_range_retest)
- [TradingView VWAP Reversion](platforms/python/research/examples/strategies/tradingview_vwap_reversion)
- [Multi-Symbol Regime Filter](platforms/python/research/examples/strategies/multi_symbol_regime_filter)

### Bridge SDK

```powershell
nexural-research new-bridge "NinjaTrader CSV"
nexural-research validate-bridge ..\examples\bridges\ninjatrader_csv\bridge_contract.json
```

Bridge lifecycle requirements:

- `health()`
- `send_signal(signal)`
- `flatten(symbol, reason)`
- `kill_switch(reason)`
- `reconcile_fills(fills)`

Example bridge: [NinjaTrader CSV Bridge](platforms/python/research/examples/bridges/ninjatrader_csv)

## MCP Automation Server

Run stdio mode for desktop MCP clients:

```powershell
cd platforms\python\research\nexural-research
py -3.11 -m pip install -e ".[mcp]"
nexural-mcp
```

Run HTTP mode:

```powershell
nexural-research mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

Smoke test:

```powershell
nexural-research mcp-smoke
```

Stable MCP tools:

| Tool | Purpose |
|------|---------|
| `list_capabilities` | Return supported workflows, imports, and guardrails |
| `analyze_strategy_csv` | Full strategy due diligence with metrics, DSR, Monte Carlo, walk-forward, grade, and decision gate |
| `compare_strategy_csvs` | Rank 2-10 strategy exports by composite institutional metrics |
| `generate_report` | Write a local HTML research report for an export |
| `run_strategy_gauntlet` | Run the 10-check promotion gate |
| `estimate_strategy_costs` | Estimate futures commission and slippage |
| `scaffold_strategy` | Create Python, NinjaTrader, or TradingView strategy starters |
| `scaffold_bridge` | Create bridge connector starters with required proof contracts |

See [MCP Contract](docs/mcp-contract.md), [MCP/API Examples](docs/mcp-api-examples.md), and [Backward Compatibility](docs/backward-compatibility.md).

## Public Docs

Start here:

- [Docs Home](docs/index.md)
- [Automation Academy](docs/automation-academy.md)
- [Build Your First Strategy](docs/build-your-first-strategy.md)
- [Build Your First Bridge](docs/build-your-first-bridge.md)
- [Why Strategies Fail The Gauntlet](docs/why-strategies-fail-the-gauntlet.md)
- [Automation Glossary](docs/automation-glossary.md)
- [Example Catalog](docs/example-catalog.md)
- [Install Matrix](docs/install-matrix.md)
- [Security Hardening](docs/security-hardening.md)
- [Secret Rotation](docs/secret-rotation.md)
- [Strategy Lab Wiring](docs/strategy-lab-wiring.md)
- [Public Launch Checklist](docs/public-launch-checklist.md)

Open `docs/index.html` locally or use the live GitHub Pages site.

## Quality Gates

Local release checks:

```powershell
python scripts\repo-tools\secret_scan.py
python scripts\repo-tools\validate_contract_schemas.py
cd platforms\python\research\nexural-research
py -3.11 -m nexural_research.cli quality-gate --threshold 0.95 --json --fast
py -3.11 -m pytest tests --ignore=tests/e2e -q
py -3.11 -m pip_audit -r requirements\py311-ci-lock.txt
cd frontend
npm audit --audit-level=moderate
npm run build
```

CI gates:

- Python 3.11 release gate.
- Cross-platform public MVP quality gate on Windows, macOS, and Linux.
- MCP smoke.
- Strategy and bridge schema validation.
- Secret scanning.
- Locked Python dependency audit.
- Frontend typecheck, build, and npm audit.
- Docker build and Trivy scan for fixable high/critical findings.
- Module catalog freshness.
- Docs metadata validation.
- GitHub Pages deployment when Pages is enabled.

## Security Defaults

- API and MCP HTTP bind to `127.0.0.1` by default.
- Docker compose binds public services to localhost.
- `.mcp.json`, `.env`, local databases, raw exports, and reports are ignored.
- Query-string API keys are not accepted.
- Use `NEXURAL_ALLOWED_DATA_DIRS` to restrict agent-readable CSV/report paths.
- Rotate any local provider keys that were ever pasted into local configs before public launch.

See [Security Hardening](docs/security-hardening.md) and [Secret Rotation](docs/secret-rotation.md).

## Repo Layout

```text
Nexural_Automation/
├── platforms/
│   ├── ninjatrader/              # NinjaScript strategies and indicators
│   ├── tradingview/              # Pine Script modules
│   └── python/research/
│       ├── examples/             # Public strategy and bridge examples
│       └── nexural-research/     # Python engine, API, MCP server, dashboard
├── templates/                    # Strategy and indicator templates
├── docs/                         # Education, contracts, architecture, launch docs
├── schemas/                      # Strategy and bridge JSON schemas
├── scripts/                      # Setup, local stack, validation, security tooling
└── .github/workflows/            # CI, docs, catalog, and release workflows
```

## Contributing

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Use the templates or SDK scaffolds.
3. Document parameters, assumptions, failure modes, and no-lookahead policy.
4. Run validation before opening a PR.
5. Keep examples paper-first and free of performance claims.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
