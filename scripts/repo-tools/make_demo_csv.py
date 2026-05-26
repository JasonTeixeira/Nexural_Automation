"""Generate a synthetic NinjaTrader-style 200-trade NQ Trades export.

Designed to:
- Pass column-detection in nexural_research.ingest.nt_csv (uses canonical aliases)
- Look like a believable NQ scalp strategy (not too good, not too bad)
- Be deterministic (fixed seed) so docs & screenshots stay reproducible
"""
from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(20260525)

OUT = Path("examples/demo_nq_trades.csv")
OUT.parent.mkdir(parents=True, exist_ok=True)

N = 200
START = datetime(2026, 1, 6, 9, 35)  # NQ session open Tuesday
SYMBOL = "NQ 06-26"
STRATEGY = "DemoNQScalp"
ACCOUNT = "Sim101"

# Realistic-ish edge: ~52% win rate, avg win $145, avg loss $-115, modest variance.
rows = []
ts = START
trade_no = 0
for _ in range(N):
    trade_no += 1
    # Skip weekends
    while ts.weekday() >= 5:
        ts += timedelta(days=1)
        ts = ts.replace(hour=9, minute=35)
    # Trade direction
    side = random.choice(["Long", "Short"])
    qty = random.choice([1, 1, 1, 2])  # mostly 1-lot
    # Entry price near recent NQ levels
    entry_price = round(17500 + random.gauss(0, 60), 2)
    win = random.random() < 0.52
    if win:
        ticks = max(1, int(abs(random.gauss(8, 4))))
    else:
        ticks = -max(1, int(abs(random.gauss(6, 3))))
    # NQ: $5/tick per contract, 0.25 point increments
    pnl_per_contract = ticks * 5.0
    gross = pnl_per_contract * qty
    # Commission ~ $2.04/RT/contract
    commission = round(2.04 * qty, 2)
    net = round(gross - commission, 2)
    # Exit price (4 ticks = 1 point)
    exit_price = round(entry_price + (ticks * 0.25 if side == "Long" else -ticks * 0.25), 2)
    # Hold time: 30s..15min
    hold_sec = random.randint(30, 900)
    exit_ts = ts + timedelta(seconds=hold_sec)
    # Format money like NT: "$94.24" or "($65.76)"
    if net >= 0:
        net_str = f"${net:,.2f}"
    else:
        net_str = f"(${abs(net):,.2f})"
    rows.append({
        "Trade number": trade_no,
        "Instrument": SYMBOL,
        "Account": ACCOUNT,
        "Strategy": STRATEGY,
        "Market pos.": side,
        "Quantity": qty,
        "Entry price": f"{entry_price:.2f}",
        "Exit price": f"{exit_price:.2f}",
        "Entry time": ts.strftime("%m/%d/%Y %I:%M:%S %p"),
        "Exit time": exit_ts.strftime("%m/%d/%Y %I:%M:%S %p"),
        "Entry name": "Entry",
        "Exit name": "Exit",
        "Profit": net_str,
        "Cum. net profit": "",  # filled below
        "Commission": f"${commission:.2f}",
        "MAE": f"${random.randint(5, 80):.2f}",
        "MFE": f"${random.randint(5, 150):.2f}",
        "ETD": f"${random.randint(0, 60):.2f}",
        "Bars": random.randint(1, 30),
    })
    # Advance time
    ts = exit_ts + timedelta(minutes=random.randint(2, 25))
    if ts.hour >= 15:  # roll to next session
        ts = (ts + timedelta(days=1)).replace(hour=9, minute=35)

# Cumulative net
running = 0.0
for r in rows:
    p = r["Profit"]
    val = float(p.replace("$", "").replace(",", "").replace("(", "-").replace(")", ""))
    running += val
    if running >= 0:
        r["Cum. net profit"] = f"${running:,.2f}"
    else:
        r["Cum. net profit"] = f"(${abs(running):,.2f})"

fieldnames = list(rows[0].keys())
with OUT.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for r in rows:
        w.writerow(r)

print(f"Wrote {N} trades to {OUT}")
print(f"Final cum net: {rows[-1]['Cum. net profit']}")
