import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getEquityCurve, type EquityData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from "recharts";

interface Props { sessionId: string; }

const CHART_GRID = { strokeDasharray: "3 3", stroke: "var(--chart-grid)" };
const CHART_AXIS = { stroke: "var(--line-strong)", tick: { fontSize: 10, fill: "var(--chart-axis)" } };
const TOOLTIP_STYLE = { backgroundColor: "var(--ink-900)", border: "1px solid var(--line-strong)", borderRadius: "8px", fontSize: 12, color: "var(--ivory)" };

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
                <stop offset="0%" stopColor="var(--chart-equity)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-equity)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" {...CHART_AXIS} tickFormatter={(v) => v.slice(5)} />
            <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]} />
            <ReferenceLine y={0} stroke="var(--line-strong)" />
            <Area type="monotone" dataKey="equity" stroke="var(--chart-equity)" fill="url(#eqGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="section-title">Drawdown</h3>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-fail)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-fail)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="time" {...CHART_AXIS} tickFormatter={(v) => v.slice(5)} />
            <YAxis {...CHART_AXIS} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, "Drawdown"]} />
            <Area type="monotone" dataKey="drawdown" stroke="var(--chart-fail)" fill="url(#ddGrad)" strokeWidth={2} />
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
            <ReferenceLine y={0} stroke="var(--line-strong)" />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]} fill="var(--chart-equity)"
              // @ts-ignore - recharts supports function fill via cells
              shape={(props: any) => {
                const fill = props.pnl >= 0 ? "var(--chart-pass)" : "var(--chart-fail)";
                return <rect {...props} fill={fill} stroke="var(--ink-950)" strokeWidth={0.5} />;
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
