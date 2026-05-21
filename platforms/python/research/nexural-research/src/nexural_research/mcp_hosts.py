"""MCP host installation and smoke-test helpers."""

from __future__ import annotations

import asyncio
import json
import platform
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def python_command() -> str:
    """Return the best Python command for this checkout."""
    windows_venv = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"
    posix_venv = PROJECT_ROOT / ".venv" / "bin" / "python"
    if windows_venv.exists():
        return str(windows_venv)
    if posix_venv.exists():
        return str(posix_venv)
    return sys.executable


def config_payload(*, server_name: str = "nexural-automation") -> dict[str, Any]:
    """Build an MCP config payload for stdio hosts."""
    return {
        "mcpServers": {
            server_name: {
                "type": "stdio",
                "command": python_command(),
                "args": ["-m", "nexural_research.mcp_server"],
                "cwd": str(PROJECT_ROOT),
                "env": {
                    "PYTHONPATH": str(PROJECT_ROOT / "src"),
                    "SETUPTOOLS_USE_DISTUTILS": "stdlib",
                },
            }
        }
    }


def host_paths() -> dict[str, Path]:
    """Return supported local MCP host config paths."""
    system = platform.system()
    home = Path.home()
    if system == "Windows":
        appdata = home / "AppData" / "Roaming"
        return {
            "claude-desktop": appdata / "Claude" / "claude_desktop_config.json",
            "cursor": home / ".cursor" / "mcp.json",
            "claude-code": PROJECT_ROOT / ".mcp.json",
            "codex": PROJECT_ROOT / ".mcp.json",
        }
    if system == "Darwin":
        return {
            "claude-desktop": home
            / "Library"
            / "Application Support"
            / "Claude"
            / "claude_desktop_config.json",
            "cursor": home / ".cursor" / "mcp.json",
            "claude-code": PROJECT_ROOT / ".mcp.json",
            "codex": PROJECT_ROOT / ".mcp.json",
        }
    return {
        "claude-desktop": home / ".config" / "Claude" / "claude_desktop_config.json",
        "cursor": home / ".cursor" / "mcp.json",
        "claude-code": PROJECT_ROOT / ".mcp.json",
        "codex": PROJECT_ROOT / ".mcp.json",
    }


def merge_config(path: Path, payload: dict[str, Any]) -> None:
    """Merge an MCP server payload into an existing host config."""
    existing: dict[str, Any] = {}
    if path.exists():
        existing = json.loads(path.read_text(encoding="utf-8"))
    existing.setdefault("mcpServers", {})
    existing["mcpServers"].update(payload["mcpServers"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")


def install_mcp_config(*, host: str, yes: bool = False) -> list[tuple[str, Path]]:
    """Install the MCP server into one or all supported hosts."""
    paths = host_paths()
    if host != "all" and host not in paths:
        raise ValueError(f"Unsupported host '{host}'. Available: {sorted(paths)}")
    if not yes:
        raise PermissionError("Refusing non-interactive install without yes=True")
    selected = paths if host == "all" else {host: paths[host]}
    payload = config_payload()
    installed = []
    for name, path in selected.items():
        merge_config(path, payload)
        installed.append((name, path))
    return installed


async def run_mcp_smoke() -> list[str]:
    """Start the stdio MCP server and exercise core tools."""
    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
    except ImportError as exc:
        raise RuntimeError(
            "MCP SDK is not installed. Install with: pip install -e '.[mcp]'"
        ) from exc

    params = StdioServerParameters(
        command=python_command(),
        args=["-m", "nexural_research.mcp_server"],
        cwd=str(PROJECT_ROOT),
        env={
            "PYTHONPATH": str(PROJECT_ROOT / "src"),
            "SETUPTOOLS_USE_DISTUTILS": "stdlib",
        },
    )
    lines: list[str] = []
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
        names = sorted(tool.name for tool in tools.tools)
        expected = {
            "list_capabilities",
            "analyze_strategy_csv",
            "compare_strategy_csvs",
            "generate_report",
            "run_strategy_gauntlet",
            "estimate_strategy_costs",
            "scaffold_strategy",
            "scaffold_bridge",
        }
        missing = expected.difference(names)
        if missing:
            raise AssertionError(f"missing MCP tools: {sorted(missing)}")
        lines.append(f"TOOLS_OK {len(names)}")

        result = await session.call_tool("list_capabilities", {})
        text = str(result.content[0].text if result.content else "")
        if "Nexural Automation" not in text:
            raise AssertionError("list_capabilities returned unexpected output")
        lines.append("CAPABILITIES_OK")
    return lines


def mcp_smoke() -> list[str]:
    """Synchronous wrapper for the stdio MCP smoke test."""
    return asyncio.run(run_mcp_smoke())
