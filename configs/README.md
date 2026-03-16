# Configs

This folder contains reusable configuration presets and examples.

## Intended use
- keep risk/session/market presets consistent
- make modules easier to reproduce in simulation

## Suggested structure
- `markets/` — instrument-specific notes (tick size, hours, roll rules)
- `sessions/` — session templates and notes (RTH/ETH handling)
- `risk/` — example risk presets (max daily loss, max trades, etc.)
- `strategy-presets/` — per-strategy parameter sets (for sim testing)

These are **examples** only. Always validate in your environment.
