from __future__ import annotations

from pathlib import Path

import pandas as pd

from nexural_research.ingest.multi_format import detect_and_load
from nexural_research.ingest.nt_executions_csv import is_likely_executions_export


def test_autodetect_executions_sample() -> None:
    here = Path(__file__).resolve().parent
    root = here.parent
    sample = root / "data" / "exports" / "sample_executions.csv"
    df = pd.read_csv(sample, nrows=5)
    assert is_likely_executions_export(df) is True


def test_autodetect_trades_sample() -> None:
    here = Path(__file__).resolve().parent
    root = here.parent
    sample = root / "data" / "exports" / "sample_trades.csv"
    df = pd.read_csv(sample, nrows=5)
    assert is_likely_executions_export(df) is False


def test_demo_export_is_ninjatrader_and_preserves_currency_profit() -> None:
    repo_root = Path(__file__).resolve().parents[5]
    demo = repo_root / "examples" / "demo_nq_trades.csv"

    df, platform = detect_and_load(demo)

    assert platform == "ninjatrader"
    assert df["profit"].iloc[0] == 137.96
    assert df["profit"].iloc[4] == -82.04
    assert df["profit"].abs().sum() > 0
