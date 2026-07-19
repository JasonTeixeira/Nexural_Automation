"""Strategy SDK scaffolding for Nexural Automation contributors."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

Platform = Literal["python", "ninjatrader", "tradingview"]


def _slug(value: str) -> str:
    out = re.sub(r"[^a-zA-Z0-9_ -]+", "", value).strip().lower()
    out = re.sub(r"[\s-]+", "_", out)
    return out or "new_strategy"


def _class_name(slug: str) -> str:
    return "".join(part.capitalize() for part in slug.split("_") if part) or "NewStrategy"


def scaffold_strategy(
    *,
    name: str,
    platform: Platform = "python",
    output_dir: str | Path = "strategies",
    overwrite: bool = False,
) -> dict[str, object]:
    """Create a strategy scaffold with metadata, docs, and starter source."""
    slug = _slug(name)
    root = Path(output_dir).expanduser().resolve() / slug
    if root.exists() and not overwrite:
        raise FileExistsError(f"Strategy scaffold already exists: {root}")
    root.mkdir(parents=True, exist_ok=True)
    (root / "src").mkdir(exist_ok=True)

    files = {
        "README.md": _readme(name, platform),
        "metadata.yaml": _metadata(slug, name, platform),
        "parameters.md": _parameters(),
        "validation.md": _validation(),
        "notes.md": _notes(),
    }
    if platform == "python":
        files[f"src/{slug}.py"] = _python_source(slug)
    elif platform == "ninjatrader":
        files[f"src/{_class_name(slug)}.cs"] = _ninjatrader_source(slug)
    elif platform == "tradingview":
        files[f"src/{slug}.pine"] = _pine_source(name)
    else:
        raise ValueError(f"Unsupported platform: {platform}")

    written: dict[str, str] = {}
    for rel, text in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and not overwrite:
            raise FileExistsError(f"File already exists: {path}")
        path.write_text(text, encoding="utf-8")
        written[rel] = str(path)
    return {
        "strategy": slug,
        "root": str(root),
        "platform": platform,
        "files": sorted(written),
    }


def _readme(name: str, platform: str) -> str:
    return f"""# {name}

Platform: `{platform}`

## Thesis

Describe the market behavior this strategy is trying to exploit.

## What It Does Not Do

- Does not guarantee profit.
- Does not bypass paper validation.
- Does not use future bars or same-bar execution assumptions.

## Required Validation

Run:

```powershell
nexural-research gauntlet --input path\\to\\trades.csv --symbol ES --strategy-name "{name}"
```
"""


def _metadata(slug: str, name: str, platform: str) -> str:
    return f"""schema_version: 1
slug: {slug}
name: "{name}"
platform: {platform}
status: research
asset_class: futures
symbols: [ES, NQ]
lookahead_policy: next_bar_execution
promotion_gate: REJECT
"""


def _parameters() -> str:
    return """# Parameters

| Name | Default | Range | Notes |
|---|---:|---:|---|
| lookback | 20 | 5-250 | Trailing bars only |
| max_contracts | 1 | 1-10 | Hard risk cap |
"""


def _validation() -> str:
    return """# Validation Checklist

- [ ] Sample size is large enough.
- [ ] Deflated Sharpe passes after multiple-testing adjustment.
- [ ] Walk-forward OOS is positive.
- [ ] Cost stress remains positive.
- [ ] No same-bar or lookahead execution.
- [ ] Paper validation completed before any live use.
"""


def _notes() -> str:
    return """# Research Notes

Record hypothesis changes, failed parameter regions, rejected variants, and
paper-trading observations.
"""


def _python_source(slug: str) -> str:
    cls = _class_name(slug)
    return f'''"""Starter Nexural strategy.

Signals are computed on completed bars. Execution must occur no earlier than the
next bar.
"""

from __future__ import annotations

import pandas as pd


class {cls}:
    def __init__(self, lookback: int = 20, max_contracts: int = 1) -> None:
        self.lookback = lookback
        self.max_contracts = max_contracts

    def generate_signals(self, bars: pd.DataFrame) -> pd.Series:
        if "close" not in bars.columns:
            raise ValueError("bars must include a close column")
        momentum = bars["close"].pct_change(self.lookback)
        raw = momentum.apply(lambda value: 1 if value > 0 else -1 if value < 0 else 0)
        return raw.shift(1).fillna(0).astype(int)
'''


def _ninjatrader_source(slug: str) -> str:
    cls = _class_name(slug)
    return f"""// Nexural Automation strategy scaffold.
// Validate parity and paper evidence before live use.

using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Strategies;

namespace NinjaTrader.NinjaScript.Strategies
{{
    public class {cls} : Strategy
    {{
        protected override void OnStateChange()
        {{
            if (State == State.SetDefaults)
            {{
                Name = "{cls}";
                Calculate = Calculate.OnBarClose;
                EntriesPerDirection = 1;
                IsExitOnSessionCloseStrategy = true;
            }}
        }}

        protected override void OnBarUpdate()
        {{
            if (CurrentBar < 20)
                return;

            // TODO: Replace with validated signal logic.
        }}
    }}
}}
"""


def _pine_source(name: str) -> str:
    return f"""//@version=5
strategy("{name}", overlay=true, process_orders_on_close=false)

lookback = input.int(20, "Lookback", minval=5)
momentum = close - close[lookback]

if momentum[1] > 0
    strategy.entry("Long", strategy.long)
if momentum[1] < 0
    strategy.entry("Short", strategy.short)
"""
