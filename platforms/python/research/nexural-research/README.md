# Nexural Research

**Institutional-grade strategy analysis engine for NinjaTrader automation developers.**

Nexural Research fills the gap between NinjaTrader's built-in Strategy Analyzer and the rigorous validation tools used by professional quant teams. Import your trade logs, get 50+ institutional metrics, Monte Carlo simulations, overfitting detection, and AI-powered recommendations — all from a professional application running on your local machine.

---

## Features

### Analysis Engine (50+ Metrics)
- **Core Metrics** — Net profit, win rate, profit factor, max drawdown, Ulcer Index
- **Risk-Adjusted Returns** — Sharpe, Sortino, Calmar, Omega, MAR, Tail ratio, Gain-to-Pain, Risk of Ruin
- **Expectancy & Sizing** — Kelly Criterion (full/half), Optimal f (Ralph Vince), payoff ratio, edge ratio
- **Trade Dependency** — Z-score runs test, serial correlation, streak analysis
- **Return Distribution** — Skewness, kurtosis, Jarque-Bera normality test, VaR 95%, CVaR/Expected Shortfall
- **Time Decay** — Rolling window regression to detect edge degradation

### Robustness Testing
- **Shuffle Monte Carlo** — 1,000+ trade-sequence permutations
- **Parametric Monte Carlo** — Empirical bootstrap, normal, or Student's t-distribution (5,000 sims)
- **Block Bootstrap** — Preserves autocorrelation (Politis & Romano)
- **Rolling Walk-Forward** — Multi-window IS/OOS analysis with efficiency tracking
- **Deflated Sharpe Ratio** — Bailey & Lopez de Prado (2014) overfitting detection
- **Regime Analysis** — Volatility regime detection with per-regime performance

### Strategy Improvement Engine
- **Letter grade** (A through F) with explanations
- **Actionable recommendations** — current value, suggested value, expected impact
- **Time filter recommendations** — remove losing hours/days with before/after comparison
- **Drawdown recovery analysis** — periods, depth, recovery time
- **Loss cluster detection** — consecutive losing streaks
- **MAE/MFE efficiency** — entry/exit quality, data-driven stop-loss
- **Commission impact** quantification
- **Export filtered CSV** — download trades with losing time slots already removed

### AI Strategy Analyst
- **Claude** (Anthropic), **GPT-4o** (OpenAI), or **Perplexity** (Sonar Pro with web access)
- AI receives full context of 50+ metrics for institutional-grade analysis
- 8 pre-built quick prompts for common questions
- Bring your own API key — stored in browser memory only

### Strategy Comparison
- Upload two CSVs side-by-side
- Delta table with % change for every metric
- Grade comparison

### Exports
- **JSON** — All metrics in one file
- **CSV** — Raw or filtered trades
- **HTML Report** — Full report with embedded charts

---

## Quick Start

### Windows

```bat
git clone <your-repo-url>
cd Nexural_Automation_NinjaTrader/platforms/python/research/nexural-research
install.bat
```

Then double-click **"Nexural Research"** on your Desktop.

### macOS / Linux

```bash
git clone <your-repo-url>
cd Nexural_Automation_NinjaTrader/platforms/python/research/nexural-research
chmod +x install.sh && ./install.sh
./nexural-research
```

### Docker

```bash
docker compose up --build
# Open http://localhost:8000
```

### Manual

```bash
pip install -e ".[dev]"
nexural-research serve          # Web dashboard on http://localhost:8000
nexural-research analyze -i trades.csv   # CLI full analysis
```

---

## Requirements

- **Python 3.11+** — [python.org/downloads](https://python.org/downloads)
- **Node.js 18+** — [nodejs.org](https://nodejs.org) (only for frontend build)

---

## How It Works

1. Export trades from NinjaTrader Strategy Analyzer (File > Save as CSV)
2. Launch Nexural Research
3. Drag & drop your CSV — format is auto-detected
4. Explore: Overview, Improvements, Advanced, Robustness, Distribution, Heatmap, Trades
5. Export filtered trades or full JSON metrics
6. Ask the AI for specific strategy improvement suggestions

### Supported CSV Formats

Auto-detects 50+ column name variations:

| Your Column | Mapped To |
|------------|-----------|
| `net_pnl`, `pnl`, `realized_pnl` | `profit` |
| `symbol`, `ticker`, `contract` | `instrument` |
| `side`, `direction` | `market_pos` |
| `trade_id`, `trade_num` | `trade_number` |
| `qty`, `size`, `contracts` | `quantity` |

---

## Architecture

```
nexural-research/
├── src/nexural_research/
│   ├── analyze/           # Analysis engine (50+ metrics)
│   ├── api/               # FastAPI backend (26+ endpoints)
│   ├── ingest/            # CSV parsing + column alias mapping
│   └── registry/          # DuckDB run history
├── frontend/              # React + TypeScript + Tailwind dashboard
├── desktop/               # Electron desktop wrapper
├── install.bat / .sh      # One-click installers
├── launch.bat             # Windows launcher
├── Dockerfile             # Docker deployment
└── docker-compose.yml
```

---

## API

Interactive docs at **http://localhost:8000/api/docs** when running.

| Endpoint | Description |
|----------|-------------|
| `POST /api/upload` | Upload CSV (auto-detects format) |
| `GET /api/analysis/comprehensive` | All metrics in one call |
| `GET /api/analysis/improvements` | Strategy improvement report |
| `GET /api/robustness/parametric-monte-carlo` | Monte Carlo simulation |
| `GET /api/robustness/deflated-sharpe` | Overfitting detection |
| `GET /api/export/json` | Download all metrics |
| `GET /api/export/csv?filtered=true` | Download filtered trades |
| `POST /api/ai/analyze` | AI analysis (bring your own key) |

---

## CLI

```bash
# Full institutional analysis
nexural-research analyze -i trades.csv

# Web dashboard
nexural-research serve --port 8000

# Quick ingest + report
nexural-research report -i trades.csv
nexural-research robust -i trades.csv --mc-n 5000
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `pytest`
4. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](../../LICENSE)
