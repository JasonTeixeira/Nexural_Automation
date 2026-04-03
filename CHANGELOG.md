# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog**, and this project intends to follow **Semantic Versioning**.

## [1.0.0] - 2026-03-28
### Added — Institutional-Grade Analysis Engine
- **Advanced Metrics Module** (`advanced_metrics.py`)
  - Sharpe, Sortino, Calmar, Omega, MAR, Tail ratio (annualized)
  - Gain-to-Pain ratio, Common Sense ratio, CPC ratio
  - Risk of Ruin estimation
  - Expectancy, payoff ratio, edge ratio
  - Kelly Criterion (full, half-Kelly, Optimal f / Ralph Vince)
  - Trade dependency analysis (Z-score runs test, serial correlation, streak analysis)
  - Return distribution statistics (skewness, kurtosis, Jarque-Bera normality test)
  - Value at Risk (VaR 95%) and Conditional VaR (Expected Shortfall)
  - Full percentile breakdown (1st through 99th)
  - Time-decay / edge stability analysis (rolling window regression)

- **Advanced Robustness Module** (`advanced_robustness.py`)
  - Parametric Monte Carlo (empirical bootstrap, normal, Student's t-distribution)
  - Block bootstrap Monte Carlo (preserves autocorrelation structure)
  - Rolling walk-forward analysis (multiple windows, anchored/rolling)
  - Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014) for overfitting detection
  - Volatility regime detection and per-regime performance analysis

- **Portfolio & Benchmark Module** (`portfolio.py`)
  - Multi-strategy portfolio analysis with correlation matrix
  - Diversification benefit quantification
  - Inverse-volatility optimal weights
  - Pearson & Spearman inter-strategy correlations
  - Benchmark comparison vs buy-and-hold and random entry (1000 random simulations)
  - Statistical significance of strategy alpha

- **FastAPI Backend** (`api/app.py`)
  - Full REST API wrapping the entire analysis engine
  - CSV upload with auto-detection (Trades/Executions/Optimization)
  - Session management for multiple concurrent analyses
  - Endpoints for every analysis module (25+ endpoints)
  - Chart data endpoints (equity, drawdown, heatmap, distribution histogram)
  - HTML report generation endpoint

- **React Frontend Dashboard** (`frontend/`)
  - Professional dark-theme UI (Tailwind CSS)
  - Drag-and-drop CSV upload with auto-detection
  - Interactive equity curve and drawdown charts (Recharts)
  - Metrics overview with color-coded cards
  - Robustness testing panel (Monte Carlo, walk-forward, block bootstrap)
  - Distribution analysis with histogram
  - PnL heatmap (day x hour)
  - Trade log table
  - Tabbed navigation across analysis sections

- **Docker Deployment** (`Dockerfile`, `docker-compose.yml`)
  - Multi-stage build (Node frontend + Python backend)
  - One-command deployment: `docker compose up`
  - Development mode with hot-reload: `docker compose --profile dev up`
  - Health checks

- **CLI Enhancement**
  - `nexural-research analyze` — full institutional analysis suite from command line
  - `nexural-research serve` — start web server with dashboard

### Changed
- Bumped version from 0.3.0 to 1.0.0
- Added scipy, statsmodels, scikit-learn, fastapi, uvicorn, python-multipart dependencies

## [0.1.0] - 2026-03-15
### Added
- Initial monorepo scaffold (docs, templates, examples, community health files).
