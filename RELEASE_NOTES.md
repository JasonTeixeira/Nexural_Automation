# Release Notes

## v0.1.0-public-mvp

This is the first public MVP release of Nexural Automation as a strategy and automation lab.

### Included

- MCP automation server with stable public tools for capabilities, strategy analysis, gauntlet runs, cost estimates, reports, and scaffolds.
- Strategy SDK with Python, NinjaTrader, TradingView, and multi-symbol examples.
- Bridge SDK with health, paper signal, flatten, kill-switch, and fill reconciliation lifecycle methods.
- SageQuant-style gauntlet outputs for reject, tune, watchlist, and promote-to-paper decisions.
- Locked Python CI audit file for Python 3.11.
- Secret scan, schema validation, frontend audit, Docker/Trivy, and cross-platform quality gates.
- Public docs for installation, strategy building, bridge building, gauntlet failures, cost assumptions, MCP/API contracts, and Strategy Lab wiring.

### Safety Position

Nexural Automation is research, education, simulation, and paper-first infrastructure. It does not place trades, make financial recommendations, or guarantee future performance.

### Tagging Checklist

- GitHub Actions green on `main`.
- Local quality gate passes at `0.95`.
- `pip-audit -r requirements/py311-ci-lock.txt` passes.
- `npm audit --audit-level=moderate` passes.
- Local MCP/API keys rotated if they were ever copied into local config files.
