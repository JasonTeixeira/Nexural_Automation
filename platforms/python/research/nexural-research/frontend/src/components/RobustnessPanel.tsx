import { useEffect, useState } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getMonteCarlo, getParametricMC, getBlockBootstrap, getRollingWF } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import { MetricCard } from "./MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props { sessionId: string; }

const TOOLTIP_STYLE = { backgroundColor: "#0c1222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: 12, color: "#e5e7eb" };
const CHART_GRID = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.04)" };
const CHART_AXIS = { stroke: "rgba(255,255,255,0.08)", tick: { fontSize: 10, fill: "#6b7280" } };

function fmt(v: unknown): string {
  if (typeof v !== "number") return String(v ?? "N/A");
  if (!isFinite(v)) return "Inf";
  return Math.abs(v) >= 1000 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : v.toFixed(2);
}

export function RobustnessPanel({ sessionId }: Props) {
  const mc = useAsync<Record<string, unknown>>();
  const pmc = useAsync<Record<string, unknown>>();
  const bb = useAsync<Record<string, unknown>>();
  const wf = useAsync<Record<string, unknown>>();
  const [mcDist, setMcDist] = useState("empirical");

  useEffect(() => {
    mc.run(() => getMonteCarlo(sessionId));
    pmc.run(() => getParametricMC(sessionId, 5000, mcDist));
    bb.run(() => getBlockBootstrap(sessionId));
    wf.run(() => getRollingWF(sessionId, 5));
  }, [sessionId, mcDist]);

  if (mc.status === "loading") return <LoadingSpinner text="Running Monte Carlo simulations..." />;

  const wfWindows = (wf.data?.windows as Record<string, unknown>[]) || [];
  const wfChart = wfWindows.map((w) => ({
    window: `W${(w.window_id as number) + 1}`,
    in_sample: w.in_sample_net as number,
    out_sample: w.out_sample_net as number,
  }));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Shuffle MC */}
      {mc.data && (
        <div className="panel">
          <h3 className="section-title">Monte Carlo — Shuffle Analysis</h3>
          <p className="text-xs text-gray-500 -mt-3 mb-5">Randomly reorders trade sequence to test drawdown sensitivity to ordering</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Simulations" value={String(mc.data.n)} color="blue" />
            <MetricCard label="MDD Best (p5)" value={fmt(mc.data.mdd_p05)} color="green" subtitle="Best-case drawdown" />
            <MetricCard label="MDD Median" value={fmt(mc.data.mdd_p50)} color="amber" subtitle="Expected drawdown" />
            <MetricCard label="MDD p75" value={fmt(mc.data.mdd_p75)} color="red" />
            <MetricCard label="MDD Worst (p95)" value={fmt(mc.data.mdd_p95)} color="red" subtitle="Worst-case drawdown" />
          </div>
        </div>
      )}

      {/* Parametric MC */}
      {pmc.data && (
        <div className="panel">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title mb-0">Parametric Monte Carlo</h3>
              <p className="text-xs text-gray-500 mt-1">Simulates future performance using fitted return distributions</p>
            </div>
            <div className="flex gap-1.5 bg-white/[0.03] rounded-lg p-1">
              {["empirical", "normal", "t"].map((d) => (
                <button key={d} onClick={() => setMcDist(d)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                    mcDist === d ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-gray-400 hover:text-gray-200"
                  }`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Simulations" value={String(pmc.data.n_simulations)} />
            <MetricCard label="Distribution" value={String(pmc.data.distribution)} color="blue" />
            <MetricCard label="Median Equity" value={fmt(pmc.data.final_equity_p50)} color="blue" />
            <MetricCard label="5th Percentile" value={fmt(pmc.data.final_equity_p05)} color="red" subtitle="Worst 5% outcome" />
            <MetricCard label="95th Percentile" value={fmt(pmc.data.final_equity_p95)} color="green" subtitle="Best 5% outcome" />
            <MetricCard label="Prob Profitable" value={`${pmc.data.prob_profitable}%`}
              color={(pmc.data.prob_profitable as number) >= 80 ? "green" : (pmc.data.prob_profitable as number) >= 50 ? "amber" : "red"}
              badge={(pmc.data.prob_profitable as number) >= 80 ? "STRONG" : (pmc.data.prob_profitable as number) >= 50 ? "MIXED" : "WEAK"} />
          </div>
        </div>
      )}

      {/* Block Bootstrap */}
      {bb.data && (
        <div className="panel">
          <h3 className="section-title">Block Bootstrap</h3>
          <p className="text-xs text-gray-500 -mt-3 mb-5">Preserves autocorrelation structure — critical for momentum/mean-reversion strategies</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Block Size" value={String(bb.data.block_size)} subtitle="Auto-optimized" />
            <MetricCard label="Sharpe Mean" value={String(bb.data.sharpe_mean)} color="blue" />
            <MetricCard label="Sharpe Std" value={String(bb.data.sharpe_std)} />
            <MetricCard label="95% CI Lower" value={String(bb.data.sharpe_ci_lower)} color={(bb.data.sharpe_ci_lower as number) > 0 ? "green" : "red"} />
            <MetricCard label="95% CI Upper" value={String(bb.data.sharpe_ci_upper)} color={(bb.data.sharpe_ci_upper as number) > 0 ? "green" : "amber"} />
            <MetricCard label="MDD p95" value={fmt(bb.data.mdd_p95)} color="red" />
          </div>
        </div>
      )}

      {/* Walk-Forward */}
      {wf.data && (
        <div className="panel">
          <h3 className="section-title">Rolling Walk-Forward Analysis</h3>
          <p className="text-xs text-gray-500 -mt-3 mb-5">Tests out-of-sample consistency across multiple time windows</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Windows" value={String(wf.data.n_windows)} color="blue" />
            <MetricCard label="OOS Net Profit" value={fmt(wf.data.aggregate_oos_net)}
              color={(wf.data.aggregate_oos_net as number) > 0 ? "green" : "red"}
              badge={(wf.data.aggregate_oos_net as number) > 0 ? "PROFITABLE" : "LOSS"} />
            <MetricCard label="Avg Efficiency" value={String(wf.data.avg_efficiency)}
              subtitle="OOS/IS Sharpe ratio"
              color={(wf.data.avg_efficiency as number) > 0.5 ? "green" : "amber"} />
            <MetricCard label="% Profitable OOS" value={`${wf.data.pct_profitable_oos}%`}
              color={(wf.data.pct_profitable_oos as number) >= 60 ? "green" : "amber"} />
          </div>
          {wfChart.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={wfChart} barGap={4}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="window" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                <Bar dataKey="in_sample" fill="#3b82f6" name="In-Sample" radius={[4, 4, 0, 0]} opacity={0.7} />
                <Bar dataKey="out_sample" fill="#10b981" name="Out-of-Sample" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
