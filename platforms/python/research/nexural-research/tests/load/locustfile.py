"""Locust load test for Nexural Research API.

Usage:
  pip install locust
  locust -f tests/load/locustfile.py --headless -u 50 -r 10 --run-time 60s --host http://localhost:8000

Targets:
  10 users:  p95 < 500ms for metrics, < 2s for MC
  50 users:  p95 < 2s for metrics, < 10s for MC
  100 users: identify breaking point
"""

import io
from locust import HttpUser, task, between, events


SAMPLE_CSV = (
    "trade_id,symbol,entry_time,exit_time,net_pnl,strategy\n"
    + "\n".join(
        f"T{i},NQ,2025-01-{1+i//10:02d} {9+i%8}:30,"
        f"2025-01-{1+i//10:02d} {9+i%8}:45,"
        f"{(-1)**i * (50 + i * 3)},TestStrat"
        for i in range(50)
    )
)


class AnalystUser(HttpUser):
    """Simulates a quant analyst using the dashboard."""
    wait_time = between(1, 3)
    session_id = None

    def on_start(self):
        """Upload a CSV to create a session."""
        resp = self.client.post(
            "/api/upload?session_id=loadtest",
            files={"file": ("test.csv", io.BytesIO(SAMPLE_CSV.encode()), "text/csv")},
        )
        if resp.status_code == 200:
            self.session_id = resp.json().get("session_id", "loadtest")
        else:
            self.session_id = "demo"

    @task(10)
    def view_metrics(self):
        self.client.get(f"/api/analysis/metrics?session_id={self.session_id}")

    @task(8)
    def view_risk_return(self):
        self.client.get(f"/api/analysis/risk-return?session_id={self.session_id}")

    @task(5)
    def view_equity(self):
        self.client.get(f"/api/charts/equity?session_id={self.session_id}")

    @task(5)
    def view_improvements(self):
        self.client.get(f"/api/analysis/improvements?session_id={self.session_id}")

    @task(3)
    def view_comprehensive(self):
        self.client.get(f"/api/analysis/comprehensive?session_id={self.session_id}")

    @task(3)
    def view_hurst(self):
        self.client.get(f"/api/analysis/hurst?session_id={self.session_id}")

    @task(2)
    def view_stress(self):
        self.client.get(f"/api/stress/tail-amplification?session_id={self.session_id}")

    @task(1)
    def view_monte_carlo(self):
        self.client.get(f"/api/robustness/parametric-monte-carlo?session_id={self.session_id}&n_simulations=100")

    @task(1)
    def view_sensitivity(self):
        self.client.get(f"/api/stress/sensitivity?session_id={self.session_id}&size_steps=3&stop_steps=3")

    @task(1)
    def check_health(self):
        self.client.get("/api/health")
