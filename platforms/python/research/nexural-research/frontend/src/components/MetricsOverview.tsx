import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getMetrics, getRiskReturn, getExpectancy } from "../lib/api";
import { MetricCard } from "./MetricCard";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  sessionId: string;
}

function fmtMoney(v: unknown): string {
  if (typeof v !== "number") return "N/A";
  const sign = v >= 0 ? "$" : "-$";
  return `${sign}${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: unknown): string {
  if (typeof v !== "number") return "N/A";
  if (!isFinite(v)) return "Inf";
  return v.toFixed(2);
}

function fmtPct(v: unknown): string {
  if (typeof v !== "number") return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}

function valColor(v: unknown, threshold = 0): "green" | "red" | "default" {
  if (typeof v !== "number") return "default";
  return v > threshold ? "green" : v < threshold ? "red" : "default";
}

export function MetricsOverview({ sessionId }: Props) {
  const core = useAsync<Record<string, unknown>>();
  const risk = useAsync<Record<string, unknown>>();
  const exp = useAsync<Record<string, unknown>>();

  useEffect(() => {
    core.run(() => getMetrics(sessionId));
    risk.run(() => getRiskReturn(sessionId));
    exp.run(() => getExpectancy(sessionId));
  }, [sessionId]);

  if (core.status === "loading") return <LoadingSpinner text="Computing metrics..." />;
  if (!core.data) return null;

  const c = core.data;
  const r = risk.data || {};
  const e = exp.data || {};

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Hero metrics */}
      <div>
        <h2 className="section-title">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Net Profit"
            value={fmtMoney(c.net_profit)}
            color={valColor(c.net_profit)}
            badge={(c.net_profit as number) > 0 ? "PROFIT" : "LOSS"}
          />
          <MetricCard label="Total Trades" value={String(c.n_trades)} color="blue" />
          <MetricCard
            label="Win Rate"
            value={fmtPct(c.win_rate)}
            color={(c.win_rate as number) >= 0.5 ? "green" : (c.win_rate as number) >= 0.4 ? "amber" : "red"}
          />
          <MetricCard
            label="Profit Factor"
            value={fmtNum(c.profit_factor)}
            color={(c.profit_factor as number) >= 1.5 ? "green" : (c.profit_factor as number) >= 1 ? "amber" : "red"}
            subtitle={`Gross P: ${fmtMoney(c.gross_profit)}`}
          />
          <MetricCard
            label="Max Drawdown"
            value={fmtMoney(c.max_drawdown)}
            color="red"
            subtitle="Peak to trough"
          />
          <MetricCard
            label="Avg Trade"
            value={fmtMoney(c.avg_trade)}
            color={valColor(c.avg_trade)}
            subtitle={`Win: ${fmtMoney(c.avg_win)} / Loss: ${fmtMoney(c.avg_loss)}`}
          />
        </div>
      </div>

      {/* Risk-adjusted returns */}
      {risk.data && (
        <div>
          <h2 className="section-title">Risk-Adjusted Returns</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Sharpe Ratio"
              value={fmtNum(r.sharpe_ratio)}
              color={(r.sharpe_ratio as number) >= 1.5 ? "green" : (r.sharpe_ratio as number) >= 0.5 ? "amber" : "red"}
              subtitle="Annualized risk-adjusted return"
            />
            <MetricCard
              label="Sortino Ratio"
              value={fmtNum(r.sortino_ratio)}
              color={(r.sortino_ratio as number) >= 2 ? "green" : (r.sortino_ratio as number) >= 1 ? "amber" : "red"}
              subtitle="Downside deviation only"
            />
            <MetricCard
              label="Calmar Ratio"
              value={fmtNum(r.calmar_ratio)}
              color={(r.calmar_ratio as number) >= 1 ? "green" : "amber"}
              subtitle="Return / Max Drawdown"
            />
            <MetricCard
              label="Omega Ratio"
              value={fmtNum(r.omega_ratio)}
              color={(r.omega_ratio as number) >= 1.5 ? "green" : "amber"}
              subtitle="Gain/Loss probability weighted"
            />
            <MetricCard
              label="Risk of Ruin"
              value={`${((r.risk_of_ruin as number) * 100).toFixed(1)}%`}
              color={(r.risk_of_ruin as number) <= 0.05 ? "green" : (r.risk_of_ruin as number) <= 0.2 ? "amber" : "red"}
              subtitle="Probability of account blow-up"
            />
          </div>
        </div>
      )}

      {/* Position sizing */}
      {exp.data && (
        <div>
          <h2 className="section-title">Expectancy & Position Sizing</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Expectancy"
              value={fmtMoney(e.expectancy)}
              color={valColor(e.expectancy)}
              subtitle="Expected $ per trade"
            />
            <MetricCard
              label="Payoff Ratio"
              value={fmtNum(e.payoff_ratio)}
              subtitle="Avg Win / Avg Loss"
              color={(e.payoff_ratio as number) >= 2 ? "green" : "amber"}
            />
            <MetricCard
              label="Kelly Criterion"
              value={`${fmtNum(e.kelly_pct)}%`}
              color="blue"
              subtitle="Optimal capital allocation"
            />
            <MetricCard
              label="Half Kelly"
              value={`${fmtNum(e.half_kelly_pct)}%`}
              color="blue"
              subtitle="Conservative sizing"
            />
            <MetricCard
              label="Optimal f"
              value={fmtNum(e.optimal_f)}
              subtitle="Ralph Vince TWR"
            />
          </div>
        </div>
      )}
    </div>
  );
}
