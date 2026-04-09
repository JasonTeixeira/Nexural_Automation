"""Tab-by-tab comprehensive audit — tests every dashboard page's API dependencies."""

import sys
from fastapi.testclient import TestClient
from nexural_research.api.app import app

c = TestClient(app)

# Create a dedicated audit session
import io
csv_data = "trade_id,symbol,entry_time,exit_time,net_pnl,strategy\n" + "\n".join(
    f"T{i},NQ,2025-01-{1+i//10:02d} {9+i%8}:30,2025-01-{1+i//10:02d} {9+i%8}:45,{(-1)**i*(50+i*3)},AuditStrat"
    for i in range(100)
)
r = c.post("/api/upload?session_id=audit_session", files={"file": ("audit.csv", io.BytesIO(csv_data.encode()), "text/csv")})
assert r.status_code == 200, f"Audit session upload failed: {r.status_code}"
sid = "audit_session"

tabs = {
    "Overview": [
        ("/api/analysis/metrics", ["total_trades", "winning_trades", "losing_trades", "win_rate", "net_profit", "profit_factor", "max_drawdown", "avg_winner", "avg_loser"]),
        ("/api/analysis/risk-return", ["sharpe_ratio", "sortino_ratio", "calmar_ratio", "omega_ratio"]),
        ("/api/analysis/expectancy", ["expectancy", "kelly_pct", "half_kelly_pct", "optimal_f"]),
        ("/api/analysis/institutional", ["recovery_factor", "time_under_water_pct", "max_consecutive_wins", "profit_per_day"]),
        ("/api/charts/equity", ["timestamps", "equity", "drawdown", "trade_pnl"]),
        ("/api/analysis/improvements", ["grade", "improvements", "summary"]),
    ],
    "Advanced Metrics": [
        ("/api/analysis/comprehensive", ["risk_return", "expectancy", "dependency", "distribution", "time_decay", "institutional"]),
    ],
    "Distribution": [
        ("/api/analysis/distribution", ["mean", "median", "std", "skewness", "kurtosis", "var_95", "cvar_95"]),
        ("/api/charts/distribution", ["bins", "counts", "var_95", "cvar_95"]),
    ],
    "Desk Analytics": [
        ("/api/analysis/hurst", ["hurst_exponent", "regime", "confidence", "interpretation"]),
        ("/api/analysis/acf", ["lags", "autocorrelations", "confidence_bound", "significant_lags"]),
        ("/api/analysis/rolling-correlation", ["rolling_autocorr", "rolling_mean_pnl", "rolling_win_rate"]),
        ("/api/analysis/information-ratio", ["information_ratio", "is_outperforming", "interpretation"]),
    ],
    "Factor Attribution": [
        ("/api/analysis/factor-attribution", ["status", "message"]),
    ],
    "Improvements": [
        ("/api/analysis/improvements", ["grade", "improvements", "recommendations", "time_filter", "drawdown_recovery"]),
    ],
    "Monte Carlo": [
        ("/api/robustness/parametric-monte-carlo?n_simulations=50", ["n_simulations", "percentiles", "probability_of_profit"]),
        ("/api/robustness/block-bootstrap?n_simulations=50", ["n_simulations", "sharpe_mean"]),
    ],
    "Walk-Forward": [
        ("/api/robustness/walk-forward", ["split", "in_sample_n", "walk_forward_efficiency", "folds"]),
        ("/api/robustness/rolling-walk-forward", ["n_windows", "folds", "walk_forward_efficiency"]),
    ],
    "Overfitting": [
        ("/api/robustness/deflated-sharpe", ["observed_sharpe", "deflated_sharpe", "survives_deflation", "interpretation"]),
    ],
    "Regime": [
        ("/api/robustness/regime", ["regimes", "current_regime", "interpretation"]),
    ],
    "Stress Testing": [
        ("/api/stress/tail-amplification", ["original_net", "scenarios", "interpretation"]),
        ("/api/stress/historical", ["worst_windows", "worst_single_trade", "interpretation"]),
        ("/api/stress/sensitivity?size_steps=3&stop_steps=3", ["n_points", "grid", "robustness_score", "interpretation"]),
    ],
    "Trade Log": [
        ("/api/charts/trades?limit=5", ["trades"]),
    ],
    "Heatmap": [
        ("/api/charts/heatmap", ["days", "hours", "values", "counts"]),
    ],
    "Equity Curve": [
        ("/api/charts/equity", ["timestamps", "equity", "drawdown", "trade_pnl"]),
    ],
    "Rolling Metrics": [
        ("/api/charts/rolling-metrics?window=10", ["timestamps", "rolling_sharpe", "rolling_win_rate", "rolling_avg_pnl"]),
    ],
    "Compare": [
        ("/api/export/comparison?session_a=demo&session_b=demo", ["session_a", "session_b", "net_profit", "sharpe"]),
    ],
    "AI Analyst": [
        ("POST /api/ai/context-preview", ["context", "approx_tokens"]),
    ],
    "Export": [
        ("/api/export/json", ["core_metrics", "risk_return", "improvements"]),
        ("/api/export/excel", []),
        ("/api/export/pdf-report", []),
        ("/api/report/html", []),
    ],
    "Parameter Sweep": [
        ("/api/analysis/parameter-sweep?stop_steps=3&target_steps=3&size_steps=2", ["n_combinations", "grid", "optimal", "overfitting_risk"]),
    ],
    "Compare Matrix": [
        ("/api/compare/matrix?session_ids=demo,demo", ["n_strategies", "rankings", "best_overall"]),
    ],
    "Health": [
        ("/api/health", ["status", "version", "active_sessions"]),
        ("/api/health/ready", ["status", "cache"]),
        ("/api/health/deep", ["status", "checks"]),
        ("/api/sessions", ["sessions"]),
        ("/api/v1/health", ["status"]),
        ("/metrics", []),
    ],
}

total_pass = 0
total_fail = 0
failures = []

for tab, endpoints in tabs.items():
    tab_ok = True
    for ep_raw, required in endpoints:
        is_post = ep_raw.startswith("POST ")
        ep = ep_raw.replace("POST ", "")

        # Build URL with session_id
        if "session_id" not in ep and "session_a" not in ep and "session_ids" not in ep and "/health" not in ep and "/sessions" not in ep and ep != "/metrics":
            sep = "&" if "?" in ep else "?"
            ep = f"{ep}{sep}session_id={sid}"

        if is_post:
            r = c.post(ep)
        else:
            r = c.get(ep)

        if r.status_code != 200:
            tab_ok = False
            total_fail += 1
            failures.append(f"  {tab}: {ep_raw} -> {r.status_code}")
            continue

        ct = r.headers.get("content-type", "")
        if "json" in ct and required:
            data = r.json()
            missing = [f for f in required if f not in data]
            if missing:
                tab_ok = False
                total_fail += 1
                failures.append(f"  {tab}: {ep_raw} missing: {missing}")
            else:
                total_pass += 1
        else:
            total_pass += 1

    print(f"{'PASS' if tab_ok else 'FAIL'}  {tab}")

print()
print(f"RESULT: {total_pass} passed, {total_fail} failed out of {total_pass + total_fail} checks")
if failures:
    print()
    print("FAILURES:")
    for f in failures:
        print(f)

sys.exit(0 if total_fail == 0 else 1)
