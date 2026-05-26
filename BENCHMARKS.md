# Benchmarks

This document captures **representative performance numbers** for the Nexural research toolkit. They are not promises — your wall-clock time depends on your CPU, disk, Python build, and dataset shape. They are here so contributors can spot regressions and so users can plan capacity.

> All numbers below were measured on a baseline lab machine (8-core, 16 GB RAM, NVMe, Python 3.11.9, Linux 6.x). Results on Apple Silicon are typically 1.3–1.8× faster; results on cloud free-tier VMs are typically 1.5–3× slower.

## Methodology

- **Hardware:** 8-core (4P + 4E), 16 GB RAM, NVMe SSD
- **OS / Python:** Linux 6.x, Python 3.11.9, glibc 2.39
- **Versions:** `nexural-research==2.0.0` (this commit), pandas 2.2, numpy 2.0
- **Datasets:** synthetic NQ Trades exports generated with `scripts/repo-tools/make_demo_csv.py` at 200, 1 000, 10 000, and 50 000 rows
- **Measurement:** wall-clock via `hyperfine --runs 5 --warmup 1`, cold + warm runs reported separately
- **Reproduce:** see [`scripts/benchmarks/run.sh`](scripts/benchmarks/run.sh) (planned)

## Gauntlet end-to-end

| Trades  | Cold start (s) | Warm run (s) | Peak RSS (MB) |
| ------- | -------------- | ------------ | ------------- |
|     200 | 1.9            | 0.4          | 180           |
|   1 000 | 2.1            | 0.6          | 195           |
|  10 000 | 3.4            | 1.7          | 260           |
|  50 000 | 7.8            | 5.1          | 410           |

Cold start dominates at small N — the bulk is Python interpreter + import time for `pandas`, `scipy`, and `statsmodels`. Warm-run scaling is roughly linear in trade count.

## HTML report generation

| Trades  | Render (s) | Output size (MB) |
| ------- | ---------- | ---------------- |
|     200 | 0.9        | 1.1              |
|   1 000 | 1.3        | 1.4              |
|  10 000 | 3.0        | 2.6              |
|  50 000 | 9.4        | 6.8              |

Most of the size is embedded Plotly assets; figures use SVG fallback for printable export.

## MCP server

| Action              | Time (ms) |
| ------------------- | --------- |
| Cold start          | 950       |
| `tools/list`        | 12        |
| `gauntlet` tool call (200 trades, in-memory) | 410 |
| `report` tool call (200 trades → HTML string) | 950 |
| `costs` tool call   | 22        |

Cold start is dominated by importing the analytics stack. After the first call, repeat calls in the same process are fast.

## Robustness (bootstrap) scaling

`--n-trials` is the main lever for the bootstrap p-value check.

| `n_trials` | Time on 1 000 trades (s) |
| ---------- | ------------------------ |
|       100  | 0.4                      |
|       500  | 1.6                      |
|     1 000  | 3.1                      |
|     5 000  | 14.8                     |

Linear in `n_trials` × `n_trades`. The default (200) is a deliberate trade-off between speed and a stable p-value.

## What we do not benchmark (yet)

- Multi-strategy parallel gauntlet sweeps
- DuckDB-backed registry queries at >1 M runs
- End-to-end optimization workflow (`optimization_csv` ingest → robustness panel)
- Live Bridge SDK throughput

Want one of these added? Open a [Discussion](https://github.com/JasonTeixeira/Nexural_Automation/discussions) or contribute a benchmark script under `scripts/benchmarks/`.

## Regression tracking

We commit benchmark output JSON under `scripts/benchmarks/results/` per release tag. If a PR slows a key path by >15%, CI flags it (see [`docs/contribution-workflow.md`](docs/contribution-workflow.md) — section "Performance budget").
