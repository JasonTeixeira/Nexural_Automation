# Nexural Research — Frontend Blueprint for v0

> **Purpose:** Complete specification for rebuilding the frontend as a world-class, institutional-grade strategy analysis dashboard. This document contains everything needed — API contracts, data shapes, UX requirements, and visual design direction.

---

## 1. PRODUCT VISION

**What this is:** A strategy analysis platform used by quant desks, prop traders, and systematic fund managers to evaluate NinjaTrader backtest results. Users upload CSV trade logs and get 71+ institutional-grade metrics, stress tests, robustness analysis, and AI-powered insights.

**Who uses it:** Professional futures traders, quant researchers, risk managers, portfolio managers. They are technically sophisticated and expect Bloomberg/FactSet-level data density.

**How it should feel:** Clean, dense, fast. Think Bloomberg Terminal meets Linear meets Vercel Dashboard. Dark theme mandatory. Data-first — no marketing fluff, no unnecessary whitespace. Every pixel earns its place.

**Scale:** Designed for thousands of concurrent users. The backend is production-grade with auth, rate limiting, caching, and session persistence.

---

## 2. TECH STACK (Frontend)

- **Framework:** Next.js 15+ (App Router) or React 19 with Vite
- **Styling:** Tailwind CSS 4 with custom design tokens
- **Charts:** Recharts (primary) + Plotly.js (for 3D sensitivity surface)
- **Icons:** Lucide React
- **State:** React Context + SWR or TanStack Query for API caching
- **Types:** Full TypeScript strict mode

---

## 3. API BASE URL

All endpoints are prefixed with `/api/`. The backend runs at `http://localhost:8000`.

**Headers on every response:**
- `X-Request-ID` — UUID for request correlation
- `X-RateLimit-Limit` — Requests per minute allowed
- `X-RateLimit-Remaining` — Requests remaining in window
- `X-Response-Time` — Server processing time

**Auth (when enabled):**
- Header: `Authorization: Bearer <api_key>`
- Or query: `?api_key=<key>`

---

## 4. NAVIGATION STRUCTURE

### Primary Navigation (Sidebar)

```
ANALYSIS
  ├── Overview          — Key metrics, equity curve, grade
  ├── Advanced Metrics  — Risk/return ratios, expectancy, dependency
  ├── Distribution      — PnL histogram, VaR/CVaR, normality test
  ├── Desk Analytics    — Hurst, ACF, rolling correlation, IR  [NEW]
  ├── Improvements      — Letter grade, recommendations, time filters

ROBUSTNESS
  ├── Monte Carlo       — Shuffle MC, parametric MC, block bootstrap
  ├── Walk-Forward      — Simple split + rolling multi-window
  ├── Overfitting       — Deflated Sharpe Ratio
  ├── Regime Analysis   — Volatility regime performance
  ├── Stress Testing    — Tail amplification, historical stress, sensitivity  [NEW]

DATA
  ├── Trade Log         — Paginated trade table with filters
  ├── Heatmap           — Day × Hour PnL heatmap
  ├── Equity Curve      — Full equity + drawdown chart
  ├── Rolling Metrics   — Rolling Sharpe, win rate, avg PnL over time  [NEW]

TOOLS
  ├── Compare           — Side-by-side A/B strategy comparison
  ├── AI Analyst        — Claude/GPT/Perplexity BYOK analysis
  ├── Export            — JSON, CSV, Excel, HTML report
  ├── Settings          — API keys, preferences
```

---

## 5. PAGE-BY-PAGE SPECIFICATION

### 5.1 Upload / Landing Page

**When no session is active.** Full-screen centered dropzone.

**API:** `POST /api/upload` (multipart form)
**Response:** `UploadResponse`
```typescript
interface UploadResponse {
  session_id: string;
  kind: "trades" | "executions" | "optimization";
  filename: string;
  n_rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
}
```

**UX Requirements:**
- Drag-and-drop zone with file type validation (.csv only)
- Show upload progress bar
- On success: animate to Overview with the data
- Show "Demo" button that loads pre-existing demo session
- Check `GET /api/sessions` on load — if sessions exist, show session picker

---

### 5.2 Overview Page

**The hero page.** Shows the most important metrics at a glance.

**APIs to call (parallel):**
1. `GET /api/analysis/metrics?session_id=X`
2. `GET /api/analysis/risk-return?session_id=X`
3. `GET /api/analysis/expectancy?session_id=X`
4. `GET /api/analysis/institutional?session_id=X`
5. `GET /api/charts/equity?session_id=X`
6. `GET /api/analysis/improvements?session_id=X` (for grade only)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  GRADE: A    Net Profit: $52,340    Sharpe: 2.14    │
│  Win Rate: 67.3%    Profit Factor: 3.2    MDD: -$4,200 │
├─────────────────────────────────────────────────────┤
│                                                      │
│              EQUITY CURVE (large, full width)         │
│              with drawdown overlay below              │
│                                                      │
├──────────────────┬──────────────────┬────────────────┤
│  Expectancy      │  Kelly %         │  Recovery      │
│  $238/trade      │  25.5%           │  Factor: 12.5  │
├──────────────────┼──────────────────┼────────────────┤
│  Sortino: 3.1    │  Calmar: 8.0     │  Omega: 2.5    │
├──────────────────┼──────────────────┼────────────────┤
│  Trades/Day: 4.2 │  Time UW: 15%   │  Max Con Loss:3│
└──────────────────┴──────────────────┴────────────────┘
```

**Metric Cards:** Each shows:
- Metric name (small, gray)
- Value (large, white, mono font)
- Color coding: green (good), red (bad), yellow (warning)
- Optional sparkline or trend arrow

**Equity Chart:**
- Line chart with area fill
- Drawdown shown as red area below zero line
- Hover tooltip: date, equity value, trade PnL, drawdown
- Per-trade PnL bars below the line

**Grade Badge:** A, B+, B, C, D, F with color coding
- A = emerald, B = blue, C = yellow, D = orange, F = red

---

### 5.3 Advanced Metrics Page

**API:** `GET /api/analysis/comprehensive?session_id=X`

**Response (nested):**
```typescript
interface ComprehensiveMetrics {
  risk_return: {
    sharpe_ratio: number;
    sortino_ratio: number;
    calmar_ratio: number;
    omega_ratio: number;
    mar_ratio: number;
    tail_ratio: number;
    gain_to_pain_ratio: number;
    common_sense_ratio: number;
    cpc_ratio: number;
    risk_of_ruin: number;
  };
  expectancy: {
    expectancy: number;
    expectancy_ratio: number;
    payoff_ratio: number;
    edge_ratio: number;
    kelly_pct: number;
    half_kelly_pct: number;
    optimal_f: number;
  };
  dependency: {
    z_score: number;
    z_interpretation: string;
    serial_correlation: number;
    serial_p_value: number;
    streak_max_wins: number;
    streak_max_losses: number;
    streak_avg_wins: number;
    streak_avg_losses: number;
  };
  distribution: {
    mean: number; median: number; std: number;
    skewness: number; kurtosis: number;
    jarque_bera_stat: number; jarque_bera_p: number; is_normal: boolean;
    percentile_01: number; percentile_05: number; percentile_10: number; percentile_25: number;
    percentile_75: number; percentile_90: number; percentile_95: number; percentile_99: number;
    var_95: number; cvar_95: number;
  };
  time_decay: {
    n_windows: number; window_size: number;
    sharpe_slope: number; sharpe_r_squared: number;
    pnl_slope: number; pnl_r_squared: number;
    is_decaying: boolean; decay_interpretation: string;
  };
  institutional: {
    recovery_factor: number;
    time_under_water_pct: number;
    max_consecutive_wins: number;
    max_consecutive_losses: number;
    max_consecutive_loss_amount: number;
    avg_trade_duration_seconds: number;
    median_trade_duration_seconds: number;
    profit_per_day: number;
    trade_frequency_per_day: number;
    max_drawdown_duration_trades: number;
  };
}
```

**Layout:** Grouped metric cards in sections:
- Risk-Adjusted Returns (Sharpe, Sortino, Calmar, Omega, Tail, G2P)
- Edge & Sizing (Expectancy, Kelly, Optimal f, Payoff Ratio)
- Trade Independence (Z-score with interpretation, Serial Corr, Streaks)
- Edge Stability (Time Decay slope with chart, interpretation)
- Institutional (Recovery Factor, Time Under Water, Profit/Day)

---

### 5.4 Desk Analytics Page [NEW]

**APIs (parallel):**
1. `GET /api/analysis/hurst?session_id=X`
2. `GET /api/analysis/acf?session_id=X`
3. `GET /api/analysis/rolling-correlation?session_id=X`
4. `GET /api/analysis/information-ratio?session_id=X`

**TypeScript interfaces:**
```typescript
interface HurstResult {
  hurst_exponent: number;
  r_squared: number;
  interpretation: string;
  regime: "mean_reverting" | "random_walk" | "trending";
  confidence: "high" | "medium" | "low";
}

interface ACFResult {
  lags: number[];
  autocorrelations: number[];
  confidence_bound: number;
  significant_lags: number[];
  has_significant_dependency: boolean;
  interpretation: string;
}

interface RollingCorrelationResult {
  window_size: number;
  n_windows: number;
  timestamps: string[];
  rolling_autocorr: number[];
  rolling_mean_pnl: number[];
  rolling_volatility: number[];
  rolling_win_rate: number[];
  regime_changes_detected: number;
  current_autocorr: number;
  interpretation: string;
}

interface InformationRatioResult {
  information_ratio: number;
  active_return: number;
  tracking_error: number;
  recent_window: number;
  baseline_mean: number;
  recent_mean: number;
  is_outperforming: boolean;
  interpretation: string;
}
```

**Layout:**
```
┌────────────────────────────┬────────────────────────────┐
│  HURST EXPONENT            │  INFORMATION RATIO         │
│  H = 0.58 (Trending)       │  IR = 1.25 (Improving)     │
│  [gauge visualization]     │  Baseline: $210  Recent: $256│
│  R² = 0.92 (high conf)     │  [bar chart: base vs recent]│
├────────────────────────────┴────────────────────────────┤
│  AUTOCORRELATION FUNCTION                                │
│  [bar chart: lags 1-20, with ±CI bands highlighted]     │
│  Significant lags: 1, 11, 12, 13                        │
├──────────────────────────────────────────────────────────┤
│  ROLLING CORRELATION (time series)                       │
│  [multi-line chart: autocorr, mean PnL, win rate]       │
│  Regime changes: 2 detected                              │
└──────────────────────────────────────────────────────────┘
```

**ACF Chart:** Vertical bar chart, lags on X-axis, autocorrelation on Y-axis. Horizontal dashed lines at ±confidence_bound. Bars exceeding bounds colored red.

**Rolling Correlation Chart:** Multi-panel time series:
- Top: Rolling autocorrelation (line)
- Middle: Rolling avg PnL (area)
- Bottom: Rolling win rate (line)
All sharing the same X-axis (timestamps)

---

### 5.5 Stress Testing Page [NEW]

**APIs (parallel):**
1. `GET /api/stress/tail-amplification?session_id=X`
2. `GET /api/stress/historical?session_id=X`
3. `GET /api/stress/sensitivity?session_id=X`

**TypeScript interfaces:**
```typescript
interface TailScenario {
  label: string;
  multiplier: number;
  tail_pct: number;
  adjusted_net: number;
  adjusted_mdd: number;
  net_change_pct: number;
  mdd_change_pct: number;
  still_profitable: boolean;
}

interface TailAmplificationResult {
  original_net: number;
  original_mdd: number;
  scenarios: TailScenario[];
  interpretation: string;
}

interface HistoricalStressWindow {
  start_index: number;
  end_index: number;
  start_time: string;
  end_time: string;
  n_trades: number;
  total_pnl: number;
  max_drawdown: number;
  win_rate: number;
}

interface HistoricalStressResult {
  n_windows_analyzed: number;
  worst_windows: HistoricalStressWindow[];
  worst_n_trade_loss: number;
  worst_single_day_loss: number;
  worst_single_trade: number;
  interpretation: string;
}

interface SensitivityPoint {
  stop_multiplier: number;
  size_multiplier: number;
  net_profit: number;
  max_drawdown: number;
  profit_factor: number;
  win_rate: number;
  sharpe_proxy: number;
}

interface ParameterSensitivityResult {
  n_points: number;
  grid: SensitivityPoint[];
  baseline_net: number;
  baseline_mdd: number;
  robustness_score: number;
  optimal_size_mult: number;
  interpretation: string;
}
```

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  TAIL AMPLIFICATION STRESS TEST                          │
│  Original: $10,000 net / $-1,250 MDD                    │
│  ┌──────────┬──────────┬───────────┬──────────┐          │
│  │ Scenario │ Net      │ MDD      │ Survives │          │
│  ├──────────┼──────────┼───────────┼──────────┤          │
│  │ 5% × 1.5│ $8,500   │ $-1,875  │ ✅       │          │
│  │ 5% × 2.0│ $7,000   │ $-2,500  │ ✅       │          │
│  │ 5% × 3.0│ $4,000   │ $-3,750  │ ✅       │          │
│  │ 10%× 2.0│ $3,500   │ $-3,200  │ ✅       │          │
│  │ 20%× 3.0│ $-2,000  │ $-8,400  │ ❌       │          │
│  └──────────┴──────────┴───────────┴──────────┘          │
├──────────────────────────────────────────────────────────┤
│  PARAMETER SENSITIVITY SURFACE                           │
│  Robustness Score: 78/100                                │
│  [Heatmap: X=stop_mult, Y=size_mult, color=net_profit]  │
│  Optimal size: 1.25x current                             │
├──────────────────────────────────────────────────────────┤
│  WORST HISTORICAL WINDOWS                                │
│  [Timeline visualization with colored drawdown periods]  │
│  Worst 5-trade: -$850 | Worst 10-trade: -$1,400        │
│  Worst single day: -$500 | Worst single trade: -$1,500  │
└──────────────────────────────────────────────────────────┘
```

**Sensitivity Heatmap:** Use Plotly.js for interactive heatmap. X-axis: stop multiplier (0.5-2.0). Y-axis: size multiplier (0.25-2.0). Color: net profit (green=positive, red=negative). Hover shows all metrics for that point.

---

### 5.6 Distribution Page

**APIs:**
1. `GET /api/analysis/distribution?session_id=X`
2. `GET /api/charts/distribution?session_id=X`

**Layout:**
- PnL histogram (bar chart from distribution data)
- VaR/CVaR markers on the histogram (vertical dashed lines)
- Stats panel: skewness, kurtosis, JB test result, is_normal badge
- Percentile table: p1 through p99

---

### 5.7 Robustness Pages

**Monte Carlo page:**
- APIs: `/api/robustness/parametric-monte-carlo`, `/api/robustness/block-bootstrap`
- Fan chart showing equity cone (p5, p25, p50, p75, p95)
- Distribution of final equities (histogram)
- Probability of profit: large percentage badge

**Walk-Forward page:**
- APIs: `/api/robustness/walk-forward`, `/api/robustness/rolling-walk-forward`
- Bar chart: IS vs OOS profit per window
- Efficiency metric per window (colored by quality)
- Aggregate walk-forward efficiency badge

**Overfitting page:**
- API: `/api/robustness/deflated-sharpe`
- Large badge: "Survives" (green) or "Overfit" (red)
- Observed vs expected Sharpe visualization
- n_trials context

**Regime page:**
- API: `/api/robustness/regime`
- Per-regime cards: avg PnL, Sharpe, win rate, drawdown
- Current regime indicator

---

### 5.8 Trade Log Page

**API:** `GET /api/charts/trades?session_id=X&limit=10000`

**Requirements:**
- Client-side pagination (50 per page)
- Column sorting (click header to sort)
- Profit column color-coded (green/red)
- Search/filter bar
- Duration formatted as "Xm" or "Xh Xm"
- Money formatted as $X,XXX.XX

---

### 5.9 Heatmap Page

**API:** `GET /api/charts/heatmap?session_id=X`

**Requirements:**
- Grid: days (rows) × hours (columns)
- Color scale: red (negative) → white (zero) → green (positive)
- Hover tooltip: day, hour, PnL value, trade count
- Toggle between sum, mean, count aggregations

---

### 5.10 Rolling Metrics Page [NEW]

**API:** `GET /api/charts/rolling-metrics?session_id=X&window=20`

**Layout:**
- Window size slider (10-100)
- Three stacked time series charts (shared X-axis):
  1. Rolling Sharpe (line, with 0 horizontal reference)
  2. Rolling Win Rate (area fill, 50% reference line)
  3. Rolling Avg PnL (bar chart, green/red)

---

### 5.11 Compare Page

**API:** `GET /api/export/comparison?session_a=X&session_b=Y`

**Requirements:**
- Side-by-side metric comparison with delta and % change
- Color coding: green if improved, red if degraded
- Overlaid equity curves on same chart
- Upload second CSV inline (drag-drop)

---

### 5.12 AI Analyst Page

**API:** `POST /api/ai/analyze`

**Requirements:**
- Chat interface (message input + response area)
- Provider selector: Claude / GPT-4o / Perplexity
- API key input (password field, stored in browser memory only)
- Context preview toggle (shows what data the AI sees)
- Markdown rendering for AI responses
- Loading state with token count estimate

---

### 5.13 Export Page

**APIs:**
- `GET /api/export/json?session_id=X` → Download JSON
- `GET /api/export/csv?session_id=X` → Download CSV
- `GET /api/export/csv?session_id=X&filtered=true` → Download filtered CSV
- `GET /api/export/excel?session_id=X` → Download XLSX
- `GET /api/report/html?session_id=X` → Open HTML report

**Requirements:**
- Button grid with download icons
- Show file sizes if possible
- "Filtered CSV" explains what filters are applied

---

## 6. DESIGN SYSTEM

### Colors (Dark Theme)
```
Background:     #0a0a0f (near black)
Surface:        #12121a (cards/panels)
Surface hover:  #1a1a25
Border:         rgba(255,255,255,0.04)

Text primary:   #f5f5f5
Text secondary: #9ca3af
Text muted:     #6b7280

Green (profit): #10b981
Red (loss):     #ef4444
Blue (accent):  #3b82f6
Yellow (warn):  #f59e0b
Purple (info):  #8b5cf6

Grade A:        #10b981
Grade B:        #3b82f6
Grade C:        #f59e0b
Grade D:        #f97316
Grade F:        #ef4444
```

### Typography
```
Font:           Inter (body), JetBrains Mono (numbers/data)
Headings:       font-semibold tracking-tight
Labels:         text-[10px] uppercase tracking-[0.15em] text-gray-500
Values:         font-mono text-lg/xl/2xl
```

### Component Patterns
- **Metric Card:** `bg-surface rounded-xl p-4 border border-white/[0.04]`
- **Panel:** `bg-surface rounded-2xl p-6 border border-white/[0.04]`
- **Badge:** `px-2 py-0.5 rounded-full text-[10px] font-semibold`
- **Button Primary:** `bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2`
- **Button Secondary:** `border border-white/10 hover:bg-white/[0.04] rounded-lg px-4 py-2`

### Chart Theme
```
Grid:           rgba(255,255,255,0.04)
Axis text:      #6b7280, 11px
Tooltip bg:     #1a1a25
Tooltip border: rgba(255,255,255,0.08)
Line colors:    #3b82f6 (primary), #10b981 (secondary), #ef4444 (danger)
Area fill:      Same as line with 10% opacity
```

---

## 7. RESPONSIVE BEHAVIOR

- **Desktop (1440px+):** Sidebar (260px) + main content
- **Laptop (1024-1439px):** Sidebar (220px) + condensed grid
- **Tablet (768-1023px):** Collapsible sidebar (hamburger)
- **Mobile (< 768px):** Bottom tab navigation, single column, condensed metric cards

---

## 8. KEY UX PATTERNS

1. **Loading:** Skeleton placeholders matching the exact layout shape (not spinners)
2. **Errors:** Inline error with retry button, not modal. Color: red-400 text
3. **Empty state:** Centered illustration + "Upload a CSV to get started"
4. **Tooltips:** On every metric name explaining what it means and why it matters
5. **Keyboard shortcuts:** `1-9` for tab navigation, `Esc` to go back, `Cmd+K` for command palette
6. **Session picker:** Dropdown in header showing all active sessions with switch capability
7. **Real-time headers:** Show request ID and response time in dev mode footer

---

## 9. API ERROR HANDLING

```typescript
const USER_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  404: "Session not found. Upload a CSV first.",
  413: "File too large. Maximum is 100MB.",
  422: "Invalid parameters.",
  429: "Rate limit exceeded. Try again shortly.",
  500: "Server error. Try again later.",
  502: "AI provider error. Check your API key.",
};
```

All requests should have a 30-second timeout. Use SWR/TanStack Query for automatic retry (max 2 retries, exponential backoff).

---

## 10. PERFORMANCE REQUIREMENTS

- **First meaningful paint:** < 1.5s
- **API response rendering:** < 200ms after data arrives
- **Chart interactions:** 60fps (no jank on hover/zoom)
- **Trade table:** Virtual scroll for 10k+ rows
- **Parallel API calls:** Fire all page-level APIs simultaneously
- **Cache:** Use SWR stale-while-revalidate — show cached data immediately, refresh in background
