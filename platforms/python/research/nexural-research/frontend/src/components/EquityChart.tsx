import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getEquityCurve, type EquityData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from "recharts";

interface Props { sessionId: string; }

const CHART_GRID = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.04)" };
const CHART_AXIS = { stroke: "rgba(255,255,255,0.08)", tick: { fontSize: 10, fill: "#6b7280" } };
const TOOLTIP_STYLE = { backgroundColor: "#0c1222", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: 12, color: "#e5e7eb" };

export function EquityChart({ sessionId }: Props) {
  const eq = useAsync<EquityData>();
  useEffect(() => { eq.run(() => getEquityCurve(sessionId)); }, [sessionId]);
  if (eq.status === "loading") return <LoadingSpinner text="Loading equity curve..." />;
  if (!eq.data) return null;

  const data = eq.data.timestamps.map((ts, i) => ({
    time: ts.split("T")[0],
    equity: eq.data!.equity[i],
    drawdown: eq.data!.drawdown[i],
    pnl: eq.data!.pnl[i],
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slide-up">
      <div className="panel">
        <h3 className="section-title">Equity Curve</h3>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" {...CHART_AXIS} tickFormatter={(v) => v.slice(5)} />
            <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
            <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="url(#eqGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="section-title">Drawdown</h3>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" {...CHART_AXIS} tickFormatter={(v) => v.slice(5)} />
            <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
            <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PnL per trade */}
      <div className="panel xl:col-span-2">
        <h3 className="section-title">Per-Trade PnL</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" {...CHART_AXIS} tickFormatter={(v) => v.slice(5)} />
            <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "PnL"]} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]} fill="#3b82f6"
              // @ts-ignore - recharts supports function fill via cells
              shape={(props: any) => {
                const fill = props.pnl >= 0 ? "#10b981" : "#ef4444";
                return <rect {...props} fill={fill} />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
