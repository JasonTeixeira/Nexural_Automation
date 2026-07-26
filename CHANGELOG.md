# Changelog

All notable changes to this project will be documented in this file.

The format is based on **Keep a Changelog**, and this project intends to follow **Semantic Versioning**.

## [Unreleased]

### Added
- Native NT8 safety spine with a portable C# risk/execution kernel, strict Sim101/Playback101 provider gates, durable recovery, deterministic fault suite, native compile harness, and validated import archive builder.
- Executable Automation Academy with five tracks, sixty labs, five capstones, trusted artifact-derived grading, bilingual concepts, and packaged-resource parity checks.
- External beta evidence schema, validator, contribution template, and quantitative promotion gates.
- SPDX SBOM, SHA-256 manifests, keyless Sigstore release signing, trusted PyPI publishing, and GHCR provenance.
- Policy-driven world-class qualification with schema-validated desktop, automated, release, external-security, maintainer, learner, and capstone evidence.
- NT8 adversarial harness with 50,000 property cases, 50,000 fuzz cases, explicit execution/risk mutation testing, and disconnect/restart RTO measurement.

### Security
- Hosted filesystem endpoints are opt-in, loopback-only, root-confined, and protected against traversal, symlink, UNC/device, alternate-data-stream, and output-escape attacks.
- Report titles are HTML escaped and report writes are atomic.
- Every third-party GitHub Action is pinned to an immutable commit SHA.
- Removed the unsupported Next.js prototype and its vulnerable dependency tree.
- API-key identifiers now use per-process keyed HMAC-SHA-256, and deep-health responses no longer expose exception details.
- Updated the optional Electron shell to patched Electron 39 and electron-builder 26 lines.
- Rebased the production runtime on a digest-pinned Alpine image and constrained DuckDB to a musllinux wheel; the complete image currently scans at zero high/critical findings.

### Changed
- Release automation now validates immutable tag/version alignment before publication.
- Stable releases now require exact-run promotion, reproducible Python and NT8 artifacts, post-signing bundle evidence with artifact/bundle digests, zero high/critical container findings, and a complete aggregate qualification report.
- Python source distributions are normalized to `SOURCE_DATE_EPOCH` before byte-for-byte release comparison.
- Standalone strategy additions are blocked for the qualification cycle.
- Academy scoring ignores learner-supplied result flags and derives all evidence by replaying the submitted declarative artifact.

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
