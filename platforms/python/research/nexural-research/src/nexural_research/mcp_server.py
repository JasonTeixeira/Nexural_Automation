"""Model Context Protocol server for Nexural Automation."""

from __future__ import annotations

import argparse
import json
from typing import Any

from nexural_research.automation import (
    CAPABILITIES,
    analyze_strategy_export,
    compare_strategy_exports,
    create_bridge_scaffold,
    create_strategy_scaffold,
    generate_strategy_report,
    run_strategy_gauntlet_export,
)
from nexural_research.automation import (
    estimate_strategy_costs as estimate_strategy_costs_workflow,
)

INSTRUCTIONS = """
Nexural Automation is an agent-ready research server for strategy due diligence.
Use it to analyze historical trade exports, rank strategies, generate reports,
and surface overfitting/risk blockers before a human considers paper trading.
It never places trades and never treats historical results as financial advice.
"""


def _load_fastmcp():
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError as exc:
        raise SystemExit(
            "The MCP SDK is not installed. Install with: pip install -e \".[mcp]\""
        ) from exc
    return FastMCP


def create_mcp_server(*, host: str = "127.0.0.1", port: int = 8765):
    """Create the FastMCP server instance.

    Kept as a factory so tests can instantiate the server without opening a
    transport.
    """
    FastMCP = _load_fastmcp()
    mcp = FastMCP(
        "Nexural Automation",
        instructions=INSTRUCTIONS.strip(),
        website_url="https://github.com/JasonTeixeira/Nexural_Automation",
        host=host,
        port=port,
        streamable_http_path="/mcp",
        json_response=True,
    )

    @mcp.resource("nexural://capabilities")
    def capabilities_resource() -> str:
        """Machine-readable server capability catalog."""
        return json.dumps(CAPABILITIES, indent=2)

    @mcp.prompt(title="Strategy Due Diligence")
    def strategy_due_diligence_prompt(csv_path: str) -> str:
        """Prompt template for rigorous strategy review."""
        return (
            "Run analyze_strategy_csv on this export, then judge it like a quant risk committee. "
            "Lead with reject/promote/watchlist, cite overfitting and walk-forward evidence, "
            f"and list the highest-impact fixes. CSV path: {csv_path}"
        )

    @mcp.tool(title="List Nexural Capabilities")
    def list_capabilities() -> dict[str, Any]:
        """List supported imports, workflows, and safety guardrails."""
        return CAPABILITIES

    @mcp.tool(title="Analyze Strategy CSV")
    def analyze_strategy_csv(
        csv_path: str,
        risk_free_rate: float = 0.0,
        n_trials: int = 100,
        monte_carlo_sims: int = 2000,
        monte_carlo_distribution: str = "empirical",
        walk_forward_windows: int = 5,
    ) -> dict[str, Any]:
        """Run full strategy due diligence on a supported trade-export CSV.

        Returns a decision gate, summary metrics, overfitting checks,
        Monte Carlo risk envelope, walk-forward validation, and a prioritized
        improvement plan.
        """
        return analyze_strategy_export(
            csv_path,
            risk_free_rate=risk_free_rate,
            n_trials=n_trials,
            monte_carlo_sims=monte_carlo_sims,
            monte_carlo_distribution=monte_carlo_distribution,
            walk_forward_windows=walk_forward_windows,
        )

    @mcp.tool(title="Compare Strategy CSVs")
    def compare_strategy_csvs(csv_paths: list[str]) -> dict[str, Any]:
        """Rank 2-10 strategy exports by composite institutional metrics."""
        return compare_strategy_exports(csv_paths)

    @mcp.tool(title="Generate Strategy Report")
    def generate_report(
        csv_path: str,
        output_dir: str | None = None,
        title: str | None = None,
    ) -> dict[str, Any]:
        """Generate a local HTML research report for a supported strategy CSV."""
        return generate_strategy_report(csv_path, output_dir=output_dir, title=title)

    @mcp.tool(title="Run Strategy Gauntlet")
    def run_strategy_gauntlet(
        csv_path: str,
        strategy_name: str = "strategy",
        symbol: str = "ES",
        min_trades: int = 100,
        n_trials: int = 100,
        cost_stress_profile: str = "elevated",
    ) -> dict[str, Any]:
        """Run the institutional 10-check validation gauntlet on a trade CSV."""
        return run_strategy_gauntlet_export(
            csv_path,
            strategy_name=strategy_name,
            symbol=symbol,
            min_trades=min_trades,
            n_trials=n_trials,
            cost_stress_profile=cost_stress_profile,
        )

    @mcp.tool(title="Estimate Strategy Costs")
    def estimate_strategy_costs(
        symbol: str,
        trades: int,
        quantity: float = 1.0,
        slippage_multiplier: float = 1.0,
        stress_profile: str = "normal",
    ) -> dict[str, Any]:
        """Estimate futures round-turn commission and slippage for a strategy."""
        return estimate_strategy_costs_workflow(
            symbol=symbol,
            trades=trades,
            quantity=quantity,
            slippage_multiplier=slippage_multiplier,
            stress_profile=stress_profile,
        )

    @mcp.tool(title="Scaffold Strategy")
    def scaffold_strategy(
        name: str,
        platform: str = "python",
        output_dir: str = "strategies",
        overwrite: bool = False,
    ) -> dict[str, Any]:
        """Create a strategy SDK scaffold with docs, metadata, and starter source."""
        return create_strategy_scaffold(
            name=name,
            platform=platform,
            output_dir=output_dir,
            overwrite=overwrite,
        )

    @mcp.tool(title="Scaffold Bridge")
    def scaffold_bridge(
        name: str,
        output_dir: str = "bridges",
        overwrite: bool = False,
    ) -> dict[str, Any]:
        """Create a bridge SDK scaffold with contract and starter connector."""
        return create_bridge_scaffold(name=name, output_dir=output_dir, overwrite=overwrite)

    return mcp


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nexural-mcp",
        description="Run the Nexural Automation MCP server.",
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http", "sse"],
        default="stdio",
        help="MCP transport. Use stdio for Claude/Codex desktop clients.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host for HTTP/SSE transports")
    parser.add_argument("--port", type=int, default=8765, help="Port for HTTP/SSE transports")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    mcp = create_mcp_server(host=args.host, port=args.port)
    mcp.run(transport=args.transport)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
