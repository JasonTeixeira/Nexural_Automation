import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getDistribution, getPnlDistribution, type DistributionData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import { MetricCard } from "./MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

interface Props { sessionId: string; }
const TOOLTIP_STYLE = { backgroundColor: "#0c1222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: 12, color: "#e5e7eb" };

export function DistributionPanel({ sessionId }: Props) {
  const stats = useAsync<Record<string, unknown>>();
  const hist = useAsync<DistributionData>();
  useEffect(() => {
    stats.run(() => getDistribution(sessionId));
    hist.run(() => getPnlDistribution(sessionId));
  }, [sessionId]);

  if (stats.status === "loading") return <LoadingSpinner text="Analyzing distribution..." />;
  const d = stats.data;
  const h = hist.data;
  const histData = h ? h.centers.map((c, i) => ({ center: c, count: h.counts[i] })) : [];

  return (
    <div className="space-y-6 animate-slide-up">
      {d && (
        <>
          <div className="panel">
            <h3 className="section-title">Return Distribution Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard label="Mean" value={`$${(d.mean as number).toFixed(2)}`} color={(d.mean as number) > 0 ? "green" : "red"} />
              <MetricCard label="Median" value={`$${(d.median as number).toFixed(2)}`} />
              <MetricCard label="Std Dev" value={`$${(d.std as number).toFixed(2)}`} subtitle="Volatility of returns" />
              <MetricCard label="Skewness" value={(d.skewness as number).toFixed(4)}
                subtitle={(d.skewness as number) > 0 ? "Right-skewed (favorable)" : "Left-skewed (tail risk)"}
                color={(d.skewness as number) > 0 ? "green" : "red"}
                badge={(d.skewness as number) > 0 ? "GOOD" : "RISK"} />
              <MetricCard label="Kurtosis" value={(d.kurtosis as number).toFixed(4)}
                subtitle={(d.kurtosis as number) > 3 ? "Fat tails present" : "Normal-like tails"}
                color={(d.kurtosis as number) > 3 ? "amber" : "green"} />
              <MetricCard label="Normal Distribution?" value={d.is_normal ? "Yes" : "No"}
                subtitle={`JB p=${(d.jarque_bera_p as number).toFixed(4)}`}
                color={d.is_normal ? "green" : "amber"}
                badge={d.is_normal ? "PASS" : "NON-NORMAL"} />
            </div>
          </div>

          <div className="panel">
            <h3 className="section-title">Value at Risk</h3>
            <p className="text-xs text-gray-500 -mt-3 mb-5">Maximum expected loss at 95% confidence level</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="VaR 95%" value={`$${(d.var_95 as number).toFixed(2)}`} color="red"
                subtitle="Max loss per trade (95% confidence)" badge="CRITICAL" />
              <MetricCard label="CVaR / Expected Shortfall" value={`$${(d.cvar_95 as number).toFixed(2)}`} color="red"
                subtitle="Average loss when VaR is breached" />
              <MetricCard label="Worst 1% of Trades" value={`$${(d.percentile_01 as number).toFixed(2)}`} color="red" />
              <MetricCard label="Best 1% of Trades" value={`$${(d.percentile_99 as number).toFixed(2)}`} color="green" />
            </div>
          </div>

          <div className="panel">
            <h3 className="section-title">Percentile Breakdown</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {([["1%", d.percentile_01], ["5%", d.percentile_05], ["10%", d.percentile_10], ["25%", d.percentile_25],
                ["75%", d.percentile_75], ["90%", d.percentile_90], ["95%", d.percentile_95], ["99%", d.percentile_99],
              ] as [string, unknown][]).map(([label, val]) => (
                <div key={label} className="text-center glass-card p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
                  <div className={`font-mono text-sm mt-1 ${(val as number) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${(val as number).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {histData.length > 0 && (
        <div className="panel">
          <h3 className="section-title">PnL Distribution Histogram</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={histData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="center" stroke="rgba(255,255,255,0.08)" tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <YAxis stroke="rgba(255,255,255,0.08)" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [v, "Trades"]} labelFormatter={(v) => `PnL: $${Number(v).toFixed(2)}`} />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histData.map((entry, i) => (
                  <Cell key={i} fill={entry.center >= 0 ? "#10b981" : "#ef4444"} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
