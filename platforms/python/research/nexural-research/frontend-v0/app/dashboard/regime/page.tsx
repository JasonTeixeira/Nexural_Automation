"use client"

import { useSession } from "@/lib/session-context"
import { useRegime } from "@/lib/api"
import { Panel } from "@/components/panel"
import { MetricCard } from "@/components/metric-card"
import { Spinner } from "@/components/ui/spinner"
import { formatPercent, formatRatio } from "@/lib/format"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export default function RegimePage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useRegime(sessionId)

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No strategy loaded. Please upload a strategy first.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Failed to load regime analysis data.</p>
      </div>
    )
  }

  const regimes = data.regimes
  const regimeColors: Record<string, string> = {
    "Bull": "#10b981",
    "Bear": "#ef4444",
    "Sideways": "#f59e0b",
    "High Vol": "#8b5cf6",
    "Low Vol": "#3b82f6",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Regime Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Strategy performance breakdown by market regime
        </p>
      </div>

      {/* Regime Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {regimes.map((regime) => (
          <div
            key={regime.name}
            className="p-4 rounded-lg border border-border bg-card"
            style={{ borderLeftWidth: 4, borderLeftColor: regimeColors[regime.name] || "#71717a" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">{regime.name}</span>
              <span className="text-xs text-muted-foreground">{formatPercent(regime.time_pct)} time</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return</span>
                <span className={`font-mono ${regime.return >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatPercent(regime.return)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sharpe</span>
                <span className={`font-mono ${regime.sharpe >= 0.5 ? "text-positive" : regime.sharpe >= 0 ? "text-foreground" : "text-negative"}`}>
                  {formatRatio(regime.sharpe)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-mono text-foreground">{formatPercent(regime.win_rate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Regime Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Return by Regime">
          <div className="h-72">
            <Plot
              data={[
                {
                  x: regimes.map((r) => r.name),
                  y: regimes.map((r) => r.return * 100),
                  type: "bar",
                  marker: {
                    color: regimes.map((r) => regimeColors[r.name] || "#71717a"),
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 50, r: 20, t: 20, b: 50 },
                xaxis: {
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                },
                yaxis: {
                  title: "Return (%)",
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                  zeroline: true,
                  zerolinecolor: "rgba(63, 63, 70, 0.8)",
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </Panel>

        <Panel title="Sharpe by Regime">
          <div className="h-72">
            <Plot
              data={[
                {
                  x: regimes.map((r) => r.name),
                  y: regimes.map((r) => r.sharpe),
                  type: "bar",
                  marker: {
                    color: regimes.map((r) =>
                      r.sharpe >= 0.5 ? "rgba(16, 185, 129, 0.7)" :
                      r.sharpe >= 0 ? "rgba(245, 158, 11, 0.7)" :
                      "rgba(239, 68, 68, 0.7)"
                    ),
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 50, r: 20, t: 20, b: 50 },
                xaxis: {
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                },
                yaxis: {
                  title: "Sharpe Ratio",
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                  zeroline: true,
                  zerolinecolor: "rgba(63, 63, 70, 0.8)",
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </Panel>
      </div>

      {/* Time in Regime */}
      <Panel title="Time Spent in Each Regime">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <Plot
              data={[
                {
                  values: regimes.map((r) => r.time_pct * 100),
                  labels: regimes.map((r) => r.name),
                  type: "pie",
                  hole: 0.5,
                  marker: {
                    colors: regimes.map((r) => regimeColors[r.name] || "#71717a"),
                  },
                  textinfo: "label+percent",
                  textposition: "outside",
                  textfont: { size: 12, color: "#a1a1aa" },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 20, r: 20, t: 20, b: 20 },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div className="space-y-4">
            {regimes.map((regime) => (
              <div key={regime.name} className="flex items-center gap-4">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: regimeColors[regime.name] || "#71717a" }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground">{regime.name}</span>
                    <span className="text-sm text-muted-foreground">{formatPercent(regime.time_pct)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${regime.time_pct * 100}%`,
                        backgroundColor: regimeColors[regime.name] || "#71717a",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Regime Details Table */}
      <Panel title="Detailed Regime Statistics">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Regime</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Time %</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Return</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Volatility</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Sharpe</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Max DD</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Win Rate</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Avg Trade</th>
              </tr>
            </thead>
            <tbody>
              {regimes.map((regime) => (
                <tr key={regime.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: regimeColors[regime.name] || "#71717a" }}
                      />
                      <span className="font-medium text-foreground">{regime.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatPercent(regime.time_pct)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${regime.return >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatPercent(regime.return)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatPercent(regime.volatility)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${regime.sharpe >= 0.5 ? "text-positive" : regime.sharpe >= 0 ? "text-foreground" : "text-negative"}`}>
                    {formatRatio(regime.sharpe)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-negative">
                    {formatPercent(regime.max_drawdown)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${regime.win_rate >= 0.5 ? "text-positive" : "text-foreground"}`}>
                    {formatPercent(regime.win_rate)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${regime.avg_trade >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatPercent(regime.avg_trade)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Regime Transition Matrix */}
      {data.transition_matrix && (
        <Panel title="Regime Transition Probabilities">
          <div className="h-72">
            <Plot
              data={[
                {
                  z: data.transition_matrix.values,
                  x: data.transition_matrix.labels,
                  y: data.transition_matrix.labels,
                  type: "heatmap",
                  colorscale: [
                    [0, "rgba(24, 24, 27, 1)"],
                    [0.5, "rgba(59, 130, 246, 0.5)"],
                    [1, "rgba(59, 130, 246, 1)"],
                  ],
                  showscale: true,
                  colorbar: {
                    title: "Probability",
                    tickfont: { size: 10, color: "#a1a1aa" },
                    titlefont: { size: 11, color: "#a1a1aa" },
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 80, r: 80, t: 20, b: 60 },
                xaxis: {
                  title: "To Regime",
                  tickfont: { size: 11 },
                },
                yaxis: {
                  title: "From Regime",
                  tickfont: { size: 11 },
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            This matrix shows the probability of transitioning from one regime to another.
            Higher values on the diagonal indicate regime persistence.
          </p>
        </Panel>
      )}
    </div>
  )
}
