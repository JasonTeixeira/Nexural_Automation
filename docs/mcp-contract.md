# MCP Contract

This document is the public contract for agent clients that call Nexural Automation.

## Server

Default stdio command:

```powershell
py -3.11 -m nexural_research.mcp_server
```

HTTP mode:

```powershell
nexural-mcp --transport streamable-http --host 127.0.0.1 --port 8765
```

Endpoint:

```text
http://127.0.0.1:8765/mcp
```

## Tools

| Tool | Stable Purpose |
|------|----------------|
| `list_capabilities` | Return supported workflows, imports, symbols, and guardrails. |
| `analyze_strategy_csv` | Run strategy due diligence on a CSV export. |
| `compare_strategy_csvs` | Rank 2-10 CSV exports by institutional metrics. |
| `generate_report` | Write a local HTML report for a CSV export. |
| `run_strategy_gauntlet` | Run the 10-check promotion gate. |
| `estimate_strategy_costs` | Estimate futures commission and slippage by symbol and stress profile. |
| `scaffold_strategy` | Create a Python, NinjaTrader, or TradingView strategy starter. |
| `scaffold_bridge` | Create a connector starter with bridge proof requirements. |

## Resource

```text
nexural://capabilities
```

Returns the machine-readable capability catalog.

## Prompt

```text
Strategy Due Diligence
```

Use this prompt when an agent needs to lead with reject, tune, watchlist, or promote-to-paper and cite the evidence.

## Stability Rules

- Tool names are stable across the public MVP.
- Required strategy and bridge contract fields are versioned with `schema_version`.
- New fields may be added as optional fields.
- Breaking changes require a tagged release note.
- Agent clients should call `list_capabilities` before assuming a workflow exists.

## Security Requirements

- Use `NEXURAL_ALLOWED_DATA_DIRS` for file scope.
- Use `Authorization: Bearer <key>` when API auth is enabled.
- Do not send secrets inside strategy metadata, bridge contracts, or report names.

