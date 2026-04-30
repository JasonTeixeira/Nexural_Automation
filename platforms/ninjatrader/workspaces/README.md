# Nexural Workspaces for NinjaTrader 8

**11 Professional Trading Workspaces | 60 Charts | 8 Instruments**

Pre-built workspace layouts for every trading scenario. Download, drop into your NinjaTrader folder, and you're live in under 2 minutes. No configuration required.

> **Not financial advice.** These are chart layouts only — no trading signals, no automated execution. See root [DISCLAIMER.md](../../../DISCLAIMER.md).

---

## Quick Install (2 Minutes)

### Step 1: Download the workspace files

**Option A — Download just the workspaces (easiest):**

Click each `.xml` file above, then click the download button (or "Raw" > right-click > "Save As").

**Option B — Clone the whole repo:**

```bash
git clone https://github.com/JasonTeixeira/Nexural_Automation.git
```

The workspace files are in:
```
Nexural_Automation/platforms/ninjatrader/workspaces/
```

### Step 2: Copy files to your NinjaTrader folder

Copy all 11 `.xml` files to:

```
C:\Users\YOUR_USERNAME\Documents\NinjaTrader 8\workspaces\
```

**How to find this folder:**

```
Windows Explorer > Documents > NinjaTrader 8 > workspaces
```

```
+-- Documents/
    +-- NinjaTrader 8/
        +-- workspaces/           <-- PUT THE FILES HERE
        |   +-- _Workspaces.xml        (already exists, don't touch)
        |   +-- Nexural 8 Market Overview.xml    <-- copy here
        |   +-- Nexural Command Center.xml       <-- copy here
        |   +-- Nexural Commodities.xml          <-- copy here
        |   +-- ... (all 11 files)
        +-- templates/
        +-- bin/
```

### Step 3: Load in NinjaTrader

1. Open NinjaTrader 8
2. Go to: **File > Workspaces**
3. You'll see all 11 Nexural workspaces in the list
4. Click any one to load it

```
  File  Edit  View  Tools  Help
  +---------------------------+
  | Workspaces            >   |
  |   +---------------------+ |
  |   | Nexural 8 Market... | |  <-- Click any workspace
  |   | Nexural Command...  | |
  |   | Nexural Commodit... | |
  |   | Nexural Crypto      | |
  |   | ...                 | |
  |   +---------------------+ |
  +---------------------------+
```

**That's it. You're done.**

---

## Update Contracts (Important!)

The workspaces ship with **SEP26** contracts for indices/crypto and **AUG26** for commodities.
You need to update these to the **current front-month contract** for your broker.

**For each chart:**
1. Right-click the chart
2. Click **Data Series**
3. Change the instrument to the current contract (e.g., `ES DEC26`)
4. Click **OK**
5. After updating all charts: **File > Workspaces > Save**

```
  Current contracts in these files:
  +------------------+-------------+
  | Instrument       | Contract    |
  +------------------+-------------+
  | ES (S&P 500)     | ES SEP26    |
  | NQ (Nasdaq 100)  | NQ SEP26    |
  | RTY (Russell)    | RTY SEP26   |
  | YM (Dow Jones)   | YM SEP26    |
  | CL (Crude Oil)   | CL AUG26    |
  | GC (Gold)        | GC AUG26    |
  | BTC (Bitcoin)    | BTC SEP26   |
  | ETH (Ethereum)   | ETH SEP26   |
  +------------------+-------------+
```

---

## The 11 Workspaces — What Each One Does

### 1. Nexural 8 Market Overview (8 charts)

See every market you trade at a glance. All 8 instruments on 15-minute charts.

**Use when:** Market open scan, end-of-day review, portfolio check.

```
  +--------+--------+--------+--------+
  |        |        |        |        |
  | ES 15m | NQ 15m | RTY 15m| YM 15m |
  |        |        |        |        |
  +--------+--------+--------+--------+
  |        |        |        |        |
  | CL 15m | GC 15m | BTC 15m| ETH 15m|
  |        |        |        |        |
  +--------+--------+--------+--------+
    Equity Indices (top)    Commodities + Crypto (bottom)
```

---

### 2. Nexural Command Center (4 charts)

Your primary trading cockpit. Large ES chart dominates the left side, with NQ, CL, and GC stacked on the right for context.

**Use when:** Active trading. This is your daily driver.

```
  +----------------------+----------+
  |                      |  NQ 5m   |
  |                      +----------+
  |      ES 5m           |  CL 5m   |
  |      (HERO)          +----------+
  |                      |  GC 5m   |
  +----------------------+----------+
    Primary focus (60%)    Context (40%)
```

---

### 3. Nexural Commodities (4 charts)

Energy and metals with dual timeframes. Top row for execution timing (5m), bottom row for structure and levels (15m).

**Use when:** Trading CL or GC specifically.

```
  +-------------+-------------+
  |   CL 5m     |   GC 5m     |
  |  (execute)  |  (execute)  |
  +-------------+-------------+
  |   CL 15m    |   GC 15m    |
  | (structure) | (structure) |
  +-------------+-------------+
```

---

### 4. Nexural Crypto (4 charts)

Bitcoin and Ethereum futures with dual timeframes. Same execution/structure split as Commodities.

**Use when:** Trading BTC or ETH futures.

```
  +-------------+-------------+
  |  BTC 5m     |  ETH 5m     |
  |  (execute)  |  (execute)  |
  +-------------+-------------+
  |  BTC 15m    |  ETH 15m    |
  | (structure) | (structure) |
  +-------------+-------------+
```

---

### 5. Nexural DOM Trading (4 charts)

Depth-of-market focused. Large ES chart for DOM/tape reading with all 4 equity indices visible for breadth confirmation.

**Use when:** Active tape reading and DOM order entry on ES.

```
  +----------------------+----------+
  |                      |  NQ 1m   |
  |                      +----------+
  |      ES 1m           | RTY 1m   |
  |      (HERO/DOM)      +----------+
  |                      |  YM 1m   |
  +----------------------+----------+
    Tape reading (60%)     Breadth (40%)
```

**Tip:** Open the ChartTrader panel on the ES hero chart for order entry:
Right-click ES chart > **Chart Trader** > **Show Chart Trader**

---

### 6. Nexural Indices (4 charts)

All 4 equity index futures side by side. See rotation in real time — is tech (NQ) leading? Are small caps (RTY) diverging?

**Use when:** Analyzing equity market breadth and sector rotation.

```
  +-------------+-------------+
  |   ES 5m     |   NQ 5m     |
  |  (S&P 500)  | (Nasdaq)    |
  +-------------+-------------+
  |  RTY 5m     |   YM 5m     |
  | (Russell)   |  (Dow)      |
  +-------------+-------------+
```

---

### 7. Nexural Intermarket (8 charts)

All 8 instruments on 60-minute charts with 180-day lookback. The big-picture correlation view.

**Use when:** Spotting intermarket divergences. Risk-on vs risk-off across asset classes.

```
  +--------+--------+--------+--------+
  |        |        |        |        |
  | ES 60m | NQ 60m | RTY 60m| YM 60m |
  |        |        |        |        |
  +--------+--------+--------+--------+
  |        |        |        |        |
  | CL 60m | GC 60m | BTC 60m| ETH 60m|
  |        |        |        |        |
  +--------+--------+--------+--------+
    180-day lookback across all asset classes
```

---

### 8. Nexural Multi-Timeframe (8 charts)

ES and NQ across 4 timeframes simultaneously. Read structure from macro (60m) down to micro (1m).

**Use when:** Pre-trade analysis. Top-down structure before entries.

```
  +--------+--------+--------+--------+
  |        |        |        |        |
  | ES 1m  | ES 5m  | ES 15m | ES 60m |
  | (micro)|(intra) |(session)|(daily) |
  +--------+--------+--------+--------+
  |        |        |        |        |
  | NQ 1m  | NQ 5m  | NQ 15m | NQ 60m |
  | (micro)|(intra) |(session)|(daily) |
  +--------+--------+--------+--------+
    Read left-to-right: micro --> macro
```

---

### 9. Nexural Orderflow (4 charts)

Four tall 1-minute charts for reading order flow, delta, and volume at price.

**Use when:** Analyzing aggressive vs passive flow across your main markets.

```
  +------+------+------+------+
  |      |      |      |      |
  |      |      |      |      |
  |ES 1m |NQ 1m |CL 1m |GC 1m |
  |      |      |      |      |
  |      |      |      |      |
  |      |      |      |      |
  +------+------+------+------+
    Tall charts for volume profile depth
```

**Tip:** Add Volume Profile and VWAP indicators to these charts for maximum value.

---

### 10. Nexural Scalping (6 charts)

Six 3-minute charts across your most liquid markets. Fast enough for scalps, slow enough to filter noise.

**Use when:** Active scalping across multiple markets.

```
  +---------+---------+---------+
  |         |         |         |
  |  ES 3m  |  NQ 3m  | RTY 3m  |
  |         |         |         |
  +---------+---------+---------+
  |         |         |         |
  |  CL 3m  |  GC 3m  | BTC 3m  |
  |         |         |         |
  +---------+---------+---------+
```

---

### 11. Nexural Strategy Monitor (6 charts)

Monitor strategy execution with an ES hero chart and 5 portfolio context charts.

**Use when:** Reviewing automated strategy performance across your portfolio.

```
  +------------------+---------+
  |                  |  NQ 5m  |
  |    ES 5m         +---------+
  |    (HERO)        | RTY 5m  |
  +------+-----+----+---------+
  |CL 5m |GC 5m| BTC 5m      |
  +------+-----+-------------+
    90-day lookback for execution tracking
```

---

## Adding Indicators (Recommended)

The workspaces come with bare candlestick charts. You should add your own indicators after loading.

**For each chart:**
1. Right-click the chart
2. Click **Indicators**
3. Search and add what you want
4. Click **OK**
5. After configuring: **File > Workspaces > Save**

### Recommended Indicators by Workspace

```
  +----------------------+----------------------------------------+
  | Workspace            | Recommended Indicators                 |
  +----------------------+----------------------------------------+
  | 8 Market Overview    | EMA(9), EMA(21), Volume                |
  | Command Center       | VWAP, EMA(9), EMA(21), Volume          |
  | Commodities          | EMA(9), EMA(21), ATR(14), Volume       |
  | Crypto               | EMA(9), EMA(21), Volume                |
  | DOM Trading          | Volume Profile, VWAP, CurrentDayOHL    |
  | Indices              | EMA(9), EMA(21), Volume                |
  | Intermarket          | EMA(20), EMA(50), Volume               |
  | Multi-Timeframe      | EMA(9), EMA(21), VWAP (on 1m/5m only) |
  | Orderflow            | Volume Profile, VWAP, CurrentDayOHL    |
  | Scalping             | EMA(9), VWAP, Volume                   |
  | Strategy Monitor     | EMA(20), EMA(50), ATR(14), Volume      |
  +----------------------+----------------------------------------+
```

### Save a Chart Template (Do This Once)

After adding indicators to one chart, save it as a template so you can apply the same setup to other charts with one click:

1. Right-click chart > **Templates** > **Save As**
2. Name it (e.g., `Nexural_5min_Standard`)
3. To apply to another chart: Right-click > **Templates** > select your template

---

## Setting a Default Startup Workspace

Make NinjaTrader automatically load your favorite workspace on launch:

```
Tools > Options > General > Startup workspace > "Nexural Command Center"
```

---

## Screen Resolution

These workspaces are designed for **2560x1440** monitors.

If your screen is a different resolution, the charts will still load but may overlap or leave gaps. Just drag the chart borders to fit your screen once, then **File > Workspaces > Save** to keep your layout.

| Your Resolution | What to Expect |
|-----------------|----------------|
| 2560x1440 | Perfect fit, no changes needed |
| 1920x1080 | Charts will overlap slightly, resize each one |
| 3840x2160 (4K) | Charts will be small, resize to fill |
| Dual monitor | Drag charts across both screens, save |

---

## Troubleshooting

**"I don't see the workspaces in the menu"**
- Make sure you copied the `.xml` files to the correct folder
- The folder must be: `Documents\NinjaTrader 8\workspaces\`
- NOT `Program Files` and NOT `NinjaTrader 8 (64-bit)`
- Restart NinjaTrader after copying

**"Charts show 'instrument not found'"**
- You need a data subscription for the instruments (ES, NQ, etc.)
- Update the contracts to current front-month for your broker
- Right-click chart > Data Series > change instrument

**"Charts are blank / no data"**
- Make sure your data connection is active (green light in Control Center)
- Check that your data subscription includes the instrument
- If using Rithmic/CQG: confirm futures data is enabled

**"Layout looks wrong on my screen"**
- Designed for 2560x1440. Drag chart borders to fit your resolution
- Save after rearranging: File > Workspaces > Save

---

## File List

```
Nexural 8 Market Overview.xml    8 charts  All 8 instruments, 15m
Nexural Command Center.xml       4 charts  ES hero + NQ/CL/GC context, 5m
Nexural Commodities.xml          4 charts  CL + GC, 5m + 15m
Nexural Crypto.xml               4 charts  BTC + ETH, 5m + 15m
Nexural DOM Trading.xml          4 charts  ES hero + NQ/RTY/YM, 1m
Nexural Indices.xml              4 charts  ES/NQ/RTY/YM, 5m
Nexural Intermarket.xml          8 charts  All 8 instruments, 60m
Nexural Multi-Timeframe.xml      8 charts  ES + NQ, 1m/5m/15m/60m
Nexural Orderflow.xml            4 charts  ES/NQ/CL/GC, 1m tall columns
Nexural Scalping.xml             6 charts  ES/NQ/RTY/CL/GC/BTC, 3m
Nexural Strategy Monitor.xml     6 charts  ES hero + 5 portfolio, 5m
                                --------
                          Total: 60 charts across 11 workspaces
```

---

## License

Same as the parent repo. See [LICENSE](../../../LICENSE).
