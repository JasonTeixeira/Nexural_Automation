# Backward Compatibility

## Public MVP Contract

The public MCP tool contract is versioned by `CAPABILITIES.version`.

Current version:

```text
2.0.0
```

Stable tools:

- `list_capabilities`
- `analyze_strategy_csv`
- `compare_strategy_csvs`
- `generate_report`
- `run_strategy_gauntlet`
- `estimate_strategy_costs`
- `scaffold_strategy`
- `scaffold_bridge`

## Allowed Non-Breaking Changes

- Adding optional response fields.
- Adding optional input arguments with defaults.
- Adding new example strategies or bridges.
- Adding docs, fixtures, and proof artifacts.

## Breaking Changes

Breaking changes require release notes and a new tag:

- Removing or renaming a tool.
- Removing a required response field.
- Changing a decision enum.
- Changing `schema_version` semantics.
- Making local-only workflows require network services.

## Golden Fixtures

MCP capabilities are pinned in:

```text
platforms/python/research/nexural-research/tests/fixtures/mcp/capabilities.golden.json
```

Update the fixture only when the public contract intentionally changes.
