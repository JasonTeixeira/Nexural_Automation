"""Educational opening-range failure scaffold.

Signals are shifted one bar so the example never consumes current-bar outcome
as an executable signal.
"""

from __future__ import annotations

import pandas as pd


def generate_signals(
    bars: pd.DataFrame,
    *,
    opening_minutes: int = 30,
    failure_bars: int = 3,
) -> pd.Series:
    if "close" not in bars.columns or "high" not in bars.columns or "low" not in bars.columns:
        raise ValueError("bars must include high, low, and close columns")
    window = max(2, int(opening_minutes))
    opening_high = bars["high"].rolling(window).max()
    opening_low = bars["low"].rolling(window).min()
    broke_high = bars["high"] > opening_high.shift(1)
    broke_low = bars["low"] < opening_low.shift(1)
    failed_high = broke_high.shift(1).rolling(failure_bars).max().fillna(0).astype(bool)
    failed_low = broke_low.shift(1).rolling(failure_bars).max().fillna(0).astype(bool)
    raw = pd.Series(0, index=bars.index)
    raw[(failed_high) & (bars["close"] < opening_high.shift(1))] = -1
    raw[(failed_low) & (bars["close"] > opening_low.shift(1))] = 1
    return raw.shift(1).fillna(0).astype(int)
