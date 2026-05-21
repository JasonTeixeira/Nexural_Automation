# Nexural Automation MCP Server

Nexural Automation now exposes the research engine as a Model Context Protocol server. This turns the repo from a static strategy encyclopedia into an agent-callable automation layer for CSV ingestion, quant due diligence, strategy ranking, and report generation.

## What the MCP Server Does

Tools:

- `list_capabilities` - returns supported import formats, workflows, and guardrails.
- `analyze_strategy_csv` - runs full strategy due diligence on a supported trade CSV.
- `compare_strategy_csvs` - ranks 2-10 strategy exports with institutional metrics.
- `generate_report` - writes a local HTML research report for a strategy export.
- `run_strategy_gauntlet` - runs the 10-check institutional promotion gate.
- `estimate_strategy_costs` - estimates futures commission/slippage by symbol and stress profile.
- `scaffold_strategy` - creates a Strategy SDK starter with docs, metadata, and source.
- `scaffold_bridge` - creates a Bridge SDK starter with connector contract and proofs.

Resource:

- `nexural://capabilities` - machine-readable server capability catalog.

Prompt:

- `Strategy Due Diligence` - a reusable prompt for quant risk review.

## Install

From the Python research project:

```powershell
cd C:\Users\Jason\Nexural_Automation\platforms\python\research\nexural-research
$env:SETUPTOOLS_USE_DISTUTILS = "stdlib"
py -3.11 -m pip install -e ".[mcp]"
```

## Run Locally

Stdio transport, for Claude Desktop, Codex, Cursor, and most local agent clients:

```powershell
nexural-mcp
```

Install a ready-to-run config into local MCP hosts:

```powershell
nexural-research mcp-install --host codex --yes
nexural-research mcp-install --host cursor --yes
nexural-research mcp-smoke
```

HTTP transport, for MCP Inspector or remote-compatible clients:

```powershell
nexural-mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

Then connect the client to:

```text
http://127.0.0.1:8765/mcp
```

## Client Config

Copy `.mcp.example.json` to your own client config location and adjust paths.

Do not commit `.mcp.json`. It is ignored because MCP configs often contain local paths and API keys.

Example:

```json
{
  "mcpServers": {
    "nexural-automation": {
      "command": "py",
      "args": ["-3.11", "-m", "nexural_research.mcp_server"],
      "cwd": "C:\\Users\\Jason\\Nexural_Automation\\platforms\\python\\research\\nexural-research",
      "env": {
        "PYTHONPATH": "C:\\Users\\Jason\\Nexural_Automation\\platforms\\python\\research\\nexural-research\\src",
        "SETUPTOOLS_USE_DISTUTILS": "stdlib",
        "NEXURAL_ALLOWED_DATA_DIRS": "C:\\Users\\Jason\\Documents;C:\\Users\\Jason\\Downloads"
      }
    }
  }
}
```

## Security Guardrails

The API server binds to `127.0.0.1` by default. Only bind to `0.0.0.0` when you are intentionally exposing it inside a controlled network or container boundary.

When API auth is enabled, clients must use a header:

```text
Authorization: Bearer <key>
```

Do not pass API keys in query strings. Query parameters are easier to leak through browser history, proxy logs, shell history, and screenshots.

Set `NEXURAL_ALLOWED_DATA_DIRS` to restrict which CSV files MCP tools can read. Use the platform path separator:

- Windows: semicolon, e.g. `C:\Exports;D:\Research`
- macOS/Linux: colon, e.g. `/Users/jason/exports:/mnt/research`

If `NEXURAL_ALLOWED_DATA_DIRS` is unset, local file access is unrestricted. That is convenient for solo research but not appropriate for shared workstations or remote MCP deployments.

Recommended shared-workstation defaults:

```powershell
$env:NEXURAL_AUTH_ENABLED = "true"
$env:NEXURAL_API_KEYS = "<long-random-local-key>"
$env:NEXURAL_ALLOWED_DATA_DIRS = "C:\Users\Jason\Documents\NexuralExports;C:\Users\Jason\Downloads"
$env:NEXURAL_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:8000"
```

## Example Agent Request

```text
Use Nexural Automation to analyze C:\Users\Jason\Downloads\NQ_strategy_export.csv.
Lead with reject/watchlist/promote, cite DSR, walk-forward efficiency, Monte Carlo drawdown, and top fixes.
```

## Strategy SDK

Create a strategy workspace that forces thesis, parameters, validation, and no-lookahead assumptions into the first commit:

```powershell
nexural-research new-strategy "Opening Range Failure" --platform python --output-dir strategies
nexural-research new-strategy "NQ Pullback" --platform ninjatrader --output-dir strategies
```

Each scaffold includes:

- `metadata.yaml` with asset class, symbols, lookahead policy, and promotion gate.
- `parameters.md`, `validation.md`, and `notes.md`.
- Starter source for Python, NinjaTrader, or TradingView.

## SageQuant Gauntlet + Cost Model

Run the public institutional gate on a CSV:

```powershell
nexural-research gauntlet --input C:\Exports\nq_strategy.csv --symbol NQ --strategy-name "NQ ORF"
```

Estimate realistic futures costs before building a strategy:

```powershell
nexural-research costs --symbol NQ --trades 250 --quantity 1 --stress-profile elevated
```

Supported symbols: `ES`, `NQ`, `RTY`, `CL`, `GC`, `SI`, `HG`, `ZB`.

## Bridge SDK

Create connector scaffolds for NinjaTrader, CSV drop folders, webhook bridges, or broker adapters:

```powershell
nexural-research new-bridge "NinjaTrader CSV" --output-dir bridges
```

Bridge scaffolds include a machine-readable contract and required proofs for health, paper signal roundtrip, flatten acknowledgement, kill-switch acknowledgement, and fill reconciliation.

## Quality Gate

Do not use `npx Codex-flow@alpha verify check` for this repo. That npm package name is invalid and not published. Use the repo-local gate instead:

```powershell
nexural-research quality-gate --threshold 0.95 --json
```

For a faster local loop:

```powershell
nexural-research quality-gate --threshold 0.95 --json --fast
```

The gate scores the public MVP surface: ruff on the new automation/MCP/SDK files, focused API and automation tests, MCP stdio smoke, Bandit on the new trading-facing server files, and the full non-e2e pytest suite unless `--fast` is set.

## Strategy Lab Wiring

Strategy Lab can call the Automation server through its server-side gateway:

```text
GET  /api/nexural/automation
POST /api/nexural/automation
```

Set these in Strategy Lab:

```env
NEXURAL_AUTOMATION_URL=http://127.0.0.1:8000
NEXURAL_AUTOMATION_API_KEY=
```

POST body shape:

```json
{
  "action": "gauntlet_csv",
  "payload": {
    "csv_path": "C:\\Exports\\nq_strategy.csv",
    "strategy_name": "NQ ORF",
    "symbol": "NQ",
    "min_trades": 100
  }
}
```

## What Makes This More Than Documentation

The server exposes durable automation primitives:

- The same workflow can be called by an AI agent, CLI, test, or future scheduler.
- Analysis results include decision gates, not just charts.
- Overfitting checks are built into the default path.
- Report generation is scriptable.
- Strategy and bridge scaffolds make the repo executable for contributors.
- File-access scope can be locked down for safer MCP use.
