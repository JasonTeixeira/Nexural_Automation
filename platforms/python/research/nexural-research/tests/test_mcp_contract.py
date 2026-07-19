from __future__ import annotations

import ast
import json
from pathlib import Path

from nexural_research.automation import CAPABILITIES

PROJECT_ROOT = Path(__file__).resolve().parents[1]

EXPECTED_MCP_TOOLS = {
    "list_capabilities",
    "analyze_strategy_csv",
    "compare_strategy_csvs",
    "generate_report",
    "run_strategy_gauntlet",
    "estimate_strategy_costs",
    "scaffold_strategy",
    "scaffold_bridge",
}


def _registered_mcp_tools() -> set[str]:
    source = PROJECT_ROOT / "src" / "nexural_research" / "mcp_server.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    tools: set[str] = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.FunctionDef):
            continue
        for decorator in node.decorator_list:
            if (
                isinstance(decorator, ast.Call)
                and isinstance(decorator.func, ast.Attribute)
                and decorator.func.attr == "tool"
            ):
                tools.add(node.name)
    return tools


def test_mcp_contract_versioned_and_complete():
    assert CAPABILITIES["name"] == "Nexural Automation"
    from nexural_research import __version__

    assert CAPABILITIES["version"] == __version__
    assert "institutional_gauntlet" in CAPABILITIES["automation_workflows"]
    assert "bridge_scaffolding" in CAPABILITIES["automation_workflows"]


def test_documented_mcp_tools_match_public_contract():
    assert _registered_mcp_tools() == EXPECTED_MCP_TOOLS


def test_capabilities_match_golden_fixture():
    fixture = PROJECT_ROOT / "tests" / "fixtures" / "mcp" / "capabilities.golden.json"
    expected = json.loads(fixture.read_text(encoding="utf-8"))
    assert CAPABILITIES == expected
