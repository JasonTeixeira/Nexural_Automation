from __future__ import annotations

import pandas as pd


def shifted_volatility_regime(close: pd.Series, lookback_bars: int = 252) -> pd.Series:
    """Return a prior-bar volatility regime to avoid lookahead."""
    returns = close.pct_change()
    realized_vol = returns.rolling(lookback_bars).std()
    threshold = realized_vol.rolling(lookback_bars).quantile(0.75)
    return (realized_vol > threshold).shift(1).fillna(False)


def allowed_to_trade(close: pd.Series) -> pd.Series:
    """Example filter: stand down during prior-bar high-volatility regimes."""
    high_vol = shifted_volatility_regime(close)
    return ~high_vol

