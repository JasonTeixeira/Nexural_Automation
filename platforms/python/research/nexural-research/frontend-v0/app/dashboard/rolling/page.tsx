"use client"

import { useState } from "react"
import { useSession } from "@/lib/session-context"
import { useRolling } from "@/lib/api"
import { Panel } from "@/components/panel"
import { MetricCard } from "@/components/metric-card"
import { Spinner } from "@/components/ui/spinner"
import { formatPercent, formatRatio } from "@/lib/format"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

type WindowSize = 30 | 60 | 90 | 180 | 252

export default function RollingPage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useRolling(sessionId)
  const [windowSize, setWindowSize] = useState<WindowSize>(60)

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
        <p className="text-destructive">Failed to load rolling metrics data.</p>
      </div>
    )
  }

  const windowData = data.windows[windowSize] || {
    dates: [],
    sharpe: [],
    sortino: [],
    volatility: [],
    returns: [],
    max_dd: [],
    win_rate: [],
  }

  const currentSharpe = windowData.sharpe[windowData.sharpe.length - 1] || 0
  const currentSortino = windowData.sortino[windowData.sortino.length - 1] || 0
  const currentVol = windowData.volatility[windowData.volatility.length - 1] || 0
  const currentDD = windowData.max_dd[windowData.max_dd.length - 1] || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Rolling Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Time-varying performance analysis with configurable windows
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([30, 60, 90, 180, 252] as WindowSize[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindowSize(w)}
              className={`px-3 py-1.5 text-sm transition-colors border-r border-border last:border-r-0 ${
                windowSize === w 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {/* Current Values */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label={`${windowSize}d Rolling Sharpe`}
          value={formatRatio(currentSharpe)}
          tooltip={`Current ${windowSize}-day rolling Sharpe ratio`}
          status={currentSharpe >= 1 ? "positive" : currentSharpe >= 0.5 ? "neutral" : "negative"}
        />
        <MetricCard
          label={`${windowSize}d Rolling Sortino`}
          value={formatRatio(currentSortino)}
          tooltip={`Current ${windowSize}-day rolling Sortino ratio`}
          status={currentSortino >= 1.5 ? "positive" : currentSortino >= 0.5 ? "neutral" : "negative"}
        />
        <MetricCard
          label={`${windowSize}d Rolling Vol`}
          value={formatPercent(currentVol)}
          tooltip={`Current ${windowSize}-day annualized volatility`}
        />
        <MetricCard
          label={`${windowSize}d Max Drawdown`}
          value={formatPercent(currentDD)}
          tooltip={`Maximum drawdown in the last ${windowSize} days`}
          status={Math.abs(currentDD) < 0.1 ? "positive" : Math.abs(currentDD) < 0.2 ? "neutral" : "negative"}
        />
      </div>

      {/* Rolling Sharpe Chart */}
      <Panel title={`${windowSize}-Day Rolling Sharpe Ratio`}>
        <div className="h-72">
          <Plot
            data={[
              {
                x: windowData.dates,
                y: windowData.sharpe,
                type: "scatter",
                mode: "lines",
                name: "Rolling Sharpe",
                line: { color: "#3b82f6", width: 2 },
                fill: "tozeroy",
                fillcolor: "rgba(59, 130, 246, 0.1)",
              },
              {
                x: windowData.dates,
                y: Array(windowData.dates.length).fill(1),
                type: "scatter",
                mode: "lines",
                name: "Target (1.0)",
                line: { color: "rgba(16, 185, 129, 0.5)", width: 1, dash: "dash" },
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
              legend: {
                orientation: "h",
                y: 1.1,
                x: 0.5,
                xanchor: "center",
              },
              showlegend: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Panel>

      {/* Rolling Returns & Volatility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title={`${windowSize}-Day Rolling Returns`}>
          <div className="h-64">
            <Plot
              data={[
                {
                  x: windowData.dates,
                  y: windowData.returns.map((r: number) => r * 100),
                  type: "scatter",
                  mode: "lines",
                  name: "Rolling Return",
                  line: { color: "#10b981", width: 2 },
                  fill: "tozeroy",
                  fillcolor: "rgba(16, 185, 129, 0.1)",
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

        <Panel title={`${windowSize}-Day Rolling Volatility`}>
          <div className="h-64">
            <Plot
              data={[
                {
                  x: windowData.dates,
                  y: windowData.volatility.map((v: number) => v * 100),
                  type: "scatter",
                  mode: "lines",
                  name: "Rolling Volatility",
                  line: { color: "#f59e0b", width: 2 },
                  fill: "tozeroy",
                  fillcolor: "rgba(245, 158, 11, 0.1)",
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
                  title: "Volatility (%)",
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                },
                showlegend: false,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </Panel>
      </div>

      {/* Rolling Max Drawdown */}
      <Panel title={`${windowSize}-Day Rolling Maximum Drawdown`}>
        <div className="h-64">
          <Plot
            data={[
              {
                x: windowData.dates,
                y: windowData.max_dd.map((d: number) => d * 100),
                type: "scatter",
                mode: "lines",
                name: "Rolling Max DD",
                line: { color: "#ef4444", width: 2 },
                fill: "tozeroy",
                fillcolor: "rgba(239, 68, 68, 0.1)",
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
                title: "Drawdown (%)",
                gridcolor: "rgba(63, 63, 70, 0.5)",
                tickfont: { size: 11 },
              },
              showlegend: false,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Panel>

      {/* Rolling Win Rate */}
      <Panel title={`${windowSize}-Day Rolling Win Rate`}>
        <div className="h-64">
          <Plot
            data={[
              {
                x: windowData.dates,
                y: windowData.win_rate.map((w: number) => w * 100),
                type: "scatter",
                mode: "lines",
                name: "Rolling Win Rate",
                line: { color: "#8b5cf6", width: 2 },
                fill: "tozeroy",
                fillcolor: "rgba(139, 92, 246, 0.1)",
              },
              {
                x: windowData.dates,
                y: Array(windowData.dates.length).fill(50),
                type: "scatter",
                mode: "lines",
                name: "50% Line",
                line: { color: "rgba(161, 161, 170, 0.5)", width: 1, dash: "dash" },
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
                title: "Win Rate (%)",
                gridcolor: "rgba(63, 63, 70, 0.5)",
                tickfont: { size: 11 },
                range: [0, 100],
              },
              legend: {
                orientation: "h",
                y: 1.1,
                x: 0.5,
                xanchor: "center",
              },
              showlegend: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Panel>

      {/* Statistics Summary */}
      <Panel title="Rolling Statistics Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Metric</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Current</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Min</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Max</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Mean</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Sharpe Ratio", data: windowData.sharpe, format: formatRatio },
                { name: "Sortino Ratio", data: windowData.sortino, format: formatRatio },
                { name: "Volatility", data: windowData.volatility, format: formatPercent },
                { name: "Returns", data: windowData.returns, format: formatPercent },
                { name: "Max Drawdown", data: windowData.max_dd, format: formatPercent },
                { name: "Win Rate", data: windowData.win_rate, format: formatPercent },
              ].map((metric) => {
                const vals = metric.data.filter((v: number | null) => v !== null) as number[]
                const current = vals[vals.length - 1] || 0
                const min = Math.min(...vals)
                const max = Math.max(...vals)
                const mean = vals.reduce((s, v) => s + v, 0) / vals.length
                const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length)
                
                return (
                  <tr key={metric.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{metric.name}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">{metric.format(current)}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{metric.format(min)}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{metric.format(max)}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{metric.format(mean)}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{metric.format(std)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
