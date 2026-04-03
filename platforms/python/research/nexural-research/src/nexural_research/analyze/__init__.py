"""Analytics engine: institutional-grade metrics, robustness testing, portfolio analysis."""

from __future__ import annotations

__all__ = [
    # Core
    "metrics_from_trades",
    "equity_curve_from_trades",
    "drawdown_from_equity",
    "time_heatmap",
    "execution_quality_from_executions",
    "monte_carlo_max_drawdown",
    "walk_forward_split",
    # Advanced metrics
    "comprehensive_analysis",
    "risk_return_metrics",
    "expectancy_metrics",
    "trade_dependency_analysis",
    "distribution_metrics",
    "time_decay_analysis",
    # Advanced robustness
    "parametric_monte_carlo",
    "block_bootstrap_monte_carlo",
    "rolling_walk_forward",
    "deflated_sharpe_ratio",
    "regime_analysis",
    # Portfolio & benchmark
    "portfolio_analysis",
    "benchmark_comparison",
]

from .equity import equity_curve_from_trades as equity_curve_from_trades
from .equity import drawdown_from_equity as drawdown_from_equity
from .heatmap import time_heatmap as time_heatmap
from .metrics import metrics_from_trades as metrics_from_trades
from .execution_quality import execution_quality_from_executions as execution_quality_from_executions
from .robustness import monte_carlo_max_drawdown as monte_carlo_max_drawdown
from .robustness import walk_forward_split as walk_forward_split
from .advanced_metrics import comprehensive_analysis as comprehensive_analysis
from .advanced_metrics import risk_return_metrics as risk_return_metrics
from .advanced_metrics import expectancy_metrics as expectancy_metrics
from .advanced_metrics import trade_dependency_analysis as trade_dependency_analysis
from .advanced_metrics import distribution_metrics as distribution_metrics
from .advanced_metrics import time_decay_analysis as time_decay_analysis
from .advanced_robustness import parametric_monte_carlo as parametric_monte_carlo
from .advanced_robustness import block_bootstrap_monte_carlo as block_bootstrap_monte_carlo
from .advanced_robustness import rolling_walk_forward as rolling_walk_forward
from .advanced_robustness import deflated_sharpe_ratio as deflated_sharpe_ratio
from .advanced_robustness import regime_analysis as regime_analysis
from .portfolio import portfolio_analysis as portfolio_analysis
from .portfolio import benchmark_comparison as benchmark_comparison
