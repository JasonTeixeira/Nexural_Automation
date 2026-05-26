# Examples

This folder contains **non-code** examples that support the repo:

- a bundled **demo dataset** so `make smoke` works on a fresh clone with zero config
- documented workflows (how we validate modules)
- screenshots used in documentation
- sample configurations and presets

## Demo dataset

[`demo_nq_trades.csv`](./demo_nq_trades.csv) — 200 synthetic NQ trades, deterministic
(seeded), shaped like a real NinjaTrader Trades export. Used by:

```bash
make smoke    # gauntlet on the demo CSV
make report   # HTML report on the demo CSV
```

It is **purely synthetic**: no real account, no real edge. Its only job is to
let new users see the full pipeline end-to-end without exporting anything
themselves.

The generator script lives at
[`scripts/repo-tools/make_demo_csv.py`](../scripts/repo-tools/make_demo_csv.py)
and is fully reproducible — change the seed or distribution there and the CSV
regenerates byte-for-byte.

## What belongs here

- demo / fixture data that is clearly labelled synthetic
- validation workflow docs
- sample configuration files (market/session/risk presets)
- screenshots illustrating indicator outputs or strategy behavior

## What does *not* belong here

- claims of profitability
- marketing material
- anything that encourages live deployment without independent validation

If you're contributing a new module, prefer keeping module-specific artifacts
under that module's `screenshots/` and `test-results/` folders.
