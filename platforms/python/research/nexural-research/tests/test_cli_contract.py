from __future__ import annotations

from argparse import Namespace

from nexural_research import cli


def test_gauntlet_fail_on_reject_returns_nonzero(monkeypatch, capsys) -> None:
    monkeypatch.setattr(
        "nexural_research.automation.run_strategy_gauntlet_export",
        lambda *args, **kwargs: {
            "gauntlet": {"decision": "REJECT", "score": 10.0, "passed": False, "checks": []}
        },
    )
    args = Namespace(
        input="demo.csv",
        strategy_name="demo",
        symbol="NQ",
        min_trades=100,
        n_trials=100,
        cost_stress_profile="elevated",
        fail_on_reject=True,
    )

    assert cli._cmd_gauntlet(args) == 1
    assert "Decision: REJECT" in capsys.readouterr().out


def test_gauntlet_default_preserves_informational_exit_code(monkeypatch) -> None:
    monkeypatch.setattr(
        "nexural_research.automation.run_strategy_gauntlet_export",
        lambda *args, **kwargs: {
            "gauntlet": {"decision": "REJECT", "score": 10.0, "passed": False, "checks": []}
        },
    )
    args = Namespace(
        input="demo.csv",
        strategy_name="demo",
        symbol="NQ",
        min_trades=100,
        n_trials=100,
        cost_stress_profile="elevated",
        fail_on_reject=False,
    )

    assert cli._cmd_gauntlet(args) == 0
