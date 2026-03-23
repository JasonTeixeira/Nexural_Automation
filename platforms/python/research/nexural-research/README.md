# Nexural Research (NinjaTrader Strategy Analysis)

A local, Python-based research environment to **import, analyze, compare, and iterate** on NinjaTrader strategy results.

## CLI

You can ingest **either** NinjaTrader export type (Trades or Executions). The CLI auto-detects which one you provided.

```bash
python -m pip install -e ".[dev]"

# Trades export
nexural-research ingest --input data/exports/sample_trades.csv --output data/processed/trades.parquet

# Executions export
nexural-research ingest --input data/exports/sample_executions.csv --output data/processed/executions.parquet
```

If `--input` is omitted, it defaults to `data/exports/sample_trades.csv`.
