from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from nexural_research.utils.logging import info, warn

_PARENS_NEG = re.compile(r"^\((?P<num>[-+]?\d*\.?\d+)\)$")


def parse_money(x: Any) -> float:
    """Parse NinjaTrader currency fields.

    Examples:
    - "$94.24" -> 94.24
    - "($65.76)" -> -65.76
    - "" / NaN -> 0.0
    """

    if x is None or (isinstance(x, float) and pd.isna(x)):
        return 0.0

    s = str(x).strip()
    if not s:
        return 0.0

    s = s.replace("$", "").replace(",", "")
    m = _PARENS_NEG.match(s)
    if m:
        return -float(m.group("num"))

    try:
        return float(s)
    except ValueError:
        warn(f"Unable to parse money value: {x!r}; defaulting to 0")
        return 0.0


def _normalize_cols(cols: list[str]) -> list[str]:
    out: list[str] = []
    for c in cols:
        c2 = c.strip().lower()
        c2 = c2.replace(".", "")
        c2 = c2.replace(" ", "_")
        c2 = c2.replace("-", "_")
        out.append(c2)
    return out


def _apply_column_aliases(df: pd.DataFrame) -> pd.DataFrame:
    """Map common column name variations to canonical names.

    Handles NinjaTrader native exports, custom CSV formats, and
    third-party trade log formats.
    """

    # Canonical name -> list of known aliases (after normalization to lowercase + underscores)
    ALIASES: dict[str, list[str]] = {
        "profit": [
            "net_pnl", "net_profit", "pnl", "realized_pnl", "realized_pl",
            "net_pl", "trade_pnl", "trade_profit", "total_pnl", "p&l", "p_l",
            "profit_loss", "profit/loss", "profit_&_loss",
        ],
        "instrument": [
            "symbol", "ticker", "contract", "asset", "market", "security",
            "inst", "sym", "underlying",
        ],
        "strategy": [
            "strategy_name", "strat", "system", "algo", "signal_name",
            "system_name", "strategy_id",
        ],
        "trade_number": [
            "trade_id", "trade_num", "trade_no", "trade_#", "id", "#", "no",
            "tradeid", "tradenum",
        ],
        "entry_time": [
            "entry_date", "entry_datetime", "entry_timestamp", "open_time",
            "open_date", "entry",
        ],
        "exit_time": [
            "exit_date", "exit_datetime", "exit_timestamp", "close_time",
            "close_date", "exit",
        ],
        "entry_price": [
            "entry_px", "open_price", "avg_entry", "avg_entry_price",
            "fill_price_entry",
        ],
        "exit_price": [
            "exit_px", "close_price", "avg_exit", "avg_exit_price",
            "fill_price_exit",
        ],
        "commission": [
            "commissions", "comm", "fees", "total_commission", "trade_fees",
        ],
        "quantity": [
            "qty", "size", "volume", "contracts", "shares", "lots", "position_size",
        ],
        "market_pos": [
            "side", "direction", "position", "trade_type", "type", "long_short",
            "buy_sell", "action",
        ],
        "mae": ["max_adverse_excursion", "max_adverse", "adverse_excursion"],
        "mfe": ["max_favorable_excursion", "max_favorable", "favorable_excursion"],
        "cum_net_profit": [
            "cumulative_profit", "cumulative_pnl", "running_pnl", "cum_pnl",
            "equity",
        ],
        "gross_profit_trade": [
            "gross_pnl", "gross_profit", "gross_pl", "gross",
        ],
    }

    existing = set(df.columns)
    renames: dict[str, str] = {}

    for canonical, aliases in ALIASES.items():
        if canonical in existing:
            continue  # already has the canonical name
        for alias in aliases:
            if alias in existing and alias not in renames:
                renames[alias] = canonical
                break

    if renames:
        info(f"Column aliases applied: {renames}")
        df = df.rename(columns=renames)

    # If we got gross_profit_trade but no profit, compute profit from gross - commission
    if "profit" not in df.columns:
        if "gross_profit_trade" in df.columns and "commission" in df.columns:
            info("Computing 'profit' from gross_profit_trade - commission")
            df["profit"] = pd.to_numeric(df["gross_profit_trade"], errors="coerce").fillna(0.0) - \
                           pd.to_numeric(df["commission"], errors="coerce").fillna(0.0).abs()
        elif "gross_profit_trade" in df.columns:
            info("Using gross_profit_trade as 'profit'")
            df["profit"] = df["gross_profit_trade"]

    return df


def load_nt_trades_csv(path: str | Path) -> pd.DataFrame:
    """Load a NinjaTrader Strategy Analyzer *Trades* export CSV.

    Normalizes column names, applies column aliases for compatibility
    with various CSV formats, and coerces common numeric/time fields.
    """

    p = Path(path)
    info(f"Loading NinjaTrader CSV: {p}")

    try:
        df = pd.read_csv(p, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(p, encoding="latin-1")
    df.columns = _normalize_cols(list(df.columns))

    # NinjaTrader uses market pos. => normalized market_pos, but punctuation can become market_pos_
    if "market_pos" not in df.columns and "market_pos_" in df.columns:
        df = df.rename(columns={"market_pos_": "market_pos"})

    # Apply comprehensive column alias mapping
    df = _apply_column_aliases(df)

    for col in ("entry_time", "exit_time"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    for col in ("profit", "cum_net_profit", "commission", "mae", "mfe", "etd"):
        if col in df.columns:
            df[col] = df[col].map(parse_money)

    if "market_pos" in df.columns:
        df["market_pos"] = df["market_pos"].astype(str).str.strip().str.title()

    if "entry_time" in df.columns and "exit_time" in df.columns:
        df["duration_seconds"] = (df["exit_time"] - df["entry_time"]).dt.total_seconds()

    # Final validation: ensure we have a profit column
    if "profit" not in df.columns:
        # Last resort: look for any numeric column that looks like PnL
        candidates = [c for c in df.columns if any(kw in c for kw in ("pnl", "profit", "pl", "return"))]
        if candidates:
            info(f"Using '{candidates[0]}' as profit column (last-resort detection)")
            df["profit"] = pd.to_numeric(df[candidates[0]], errors="coerce").fillna(0.0)
        else:
            warn("No 'profit' column found — analysis will fail. Check your CSV column names.")

    return df


def save_processed(df: pd.DataFrame, out_path: str | Path) -> Path:
    """Save processed output as parquet or csv based on file extension."""

    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)

    if p.suffix.lower() == ".parquet":
        df.to_parquet(p, index=False)
    elif p.suffix.lower() == ".csv":
        df.to_csv(p, index=False)
    else:
        raise ValueError(f"Unsupported output format: {p.suffix}")

    info(f"Saved processed data: {p}")
    return p
