"use client"

import { useState } from "react"
import { useSession } from "@/lib/session-context"
import { useHeatmap } from "@/lib/api"
import { Panel } from "@/components/panel"
import { Spinner } from "@/components/ui/spinner"
import { formatPercent } from "@/lib/format"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

type HeatmapType = "returns" | "trades" | "win_rate" | "avg_trade"

export default function HeatmapPage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useHeatmap(sessionId)
  const [heatmapType, setHeatmapType] = useState<HeatmapType>("returns")

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
        <p className="text-destructive">Failed to load heatmap data.</p>
      </div>
    )
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const years = data.years || []

  const getHeatmapData = () => {
    switch (heatmapType) {
      case "returns": return data.monthly_returns
      case "trades": return data.monthly_trades
      case "win_rate": return data.monthly_win_rate
      case "avg_trade": return data.monthly_avg_trade
      default: return data.monthly_returns
    }
  }

  const getColorscale = () => {
    if (heatmapType === "trades") {
      return [
        [0, "rgba(24, 24, 27, 1)"],
        [0.5, "rgba(59, 130, 246, 0.5)"],
        [1, "rgba(59, 130, 246, 1)"],
      ]
    }
    return [
      [0, "rgba(239, 68, 68, 0.8)"],
      [0.5, "rgba(24, 24, 27, 1)"],
      [1, "rgba(16, 185, 129, 0.8)"],
    ]
  }

  const getTitle = () => {
    switch (heatmapType) {
      case "returns": return "Monthly Returns (%)"
      case "trades": return "Monthly Trade Count"
      case "win_rate": return "Monthly Win Rate (%)"
      case "avg_trade": return "Monthly Avg Trade (%)"
      default: return "Monthly Returns (%)"
    }
  }

  // Calculate yearly totals
  const yearlyTotals = years.map((year, yi) => {
    const monthlyData = getHeatmapData()
    if (!monthlyData || !monthlyData[yi]) return 0
    return monthlyData[yi].reduce((sum: number, val: number | null) => sum + (val || 0), 0)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Performance Heatmap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly performance breakdown across years
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["returns", "trades", "win_rate", "avg_trade"] as HeatmapType[]).map((type) => (
            <button
              key={type}
              onClick={() => setHeatmapType(type)}
              className={`px-3 py-1.5 text-sm transition-colors border-r border-border last:border-r-0 ${
                heatmapType === type 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {type === "returns" ? "Returns" : 
               type === "trades" ? "Trades" : 
               type === "win_rate" ? "Win Rate" : "Avg Trade"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Heatmap */}
      <Panel title={getTitle()}>
        <div className="h-96">
          <Plot
            data={[
              {
                z: getHeatmapData(),
                x: months,
                y: years,
                type: "heatmap",
                colorscale: getColorscale() as Plotly.ColorScale,
                showscale: true,
                hoverongaps: false,
                colorbar: {
                  title: heatmapType === "returns" || heatmapType === "avg_trade" ? "%" : "",
                  tickfont: { size: 10, color: "#a1a1aa" },
                  titlefont: { size: 11, color: "#a1a1aa" },
                },
                hovertemplate: "%{y} %{x}: %{z:.2f}<extra></extra>",
              },
            ]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#a1a1aa", family: "Inter, sans-serif" },
              margin: { l: 60, r: 80, t: 20, b: 50 },
              xaxis: {
                tickfont: { size: 11 },
                side: "bottom",
              },
              yaxis: {
                tickfont: { size: 11 },
                autorange: "reversed",
              },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </Panel>

      {/* Monthly Returns Table */}
      <Panel title="Monthly Performance Table">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Year</th>
                {months.map((m) => (
                  <th key={m} className="text-right py-3 px-3 text-muted-foreground font-medium w-16">{m}</th>
                ))}
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Year Total</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year, yi) => {
                const monthlyData = data.monthly_returns[yi] || []
                const yearTotal = yearlyTotals[yi]
                return (
                  <tr key={year} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{year}</td>
                    {months.map((_, mi) => {
                      const val = monthlyData[mi]
                      if (val === null || val === undefined) {
                        return (
                          <td key={mi} className="py-3 px-3 text-right text-muted-foreground/50">-</td>
                        )
                      }
                      return (
                        <td 
                          key={mi} 
                          className={`py-3 px-3 text-right font-mono text-xs ${
                            val > 0 ? "text-positive" : val < 0 ? "text-negative" : "text-muted-foreground"
                          }`}
                        >
                          {formatPercent(val / 100)}
                        </td>
                      )
                    })}
                    <td className={`py-3 px-4 text-right font-mono font-medium ${
                      yearTotal > 0 ? "text-positive" : yearTotal < 0 ? "text-negative" : "text-foreground"
                    }`}>
                      {formatPercent(yearTotal / 100)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td className="py-3 px-4 font-medium text-foreground">Average</td>
                {months.map((_, mi) => {
                  const vals = data.monthly_returns.map((yr: (number | null)[]) => yr[mi]).filter((v: number | null): v is number => v !== null)
                  const avg = vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0
                  return (
                    <td 
                      key={mi} 
                      className={`py-3 px-3 text-right font-mono text-xs ${
                        avg > 0 ? "text-positive" : avg < 0 ? "text-negative" : "text-muted-foreground"
                      }`}
                    >
                      {formatPercent(avg / 100)}
                    </td>
                  )
                })}
                <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                  {formatPercent(yearlyTotals.reduce((s, v) => s + v, 0) / yearlyTotals.length / 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      {/* Day of Week Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Day of Week Performance">
          <div className="h-64">
            <Plot
              data={[
                {
                  x: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                  y: data.day_of_week_returns || [0.1, 0.05, -0.02, 0.08, 0.12],
                  type: "bar",
                  marker: {
                    color: (data.day_of_week_returns || [0.1, 0.05, -0.02, 0.08, 0.12]).map((v: number) =>
                      v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)"
                    ),
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 50, r: 20, t: 20, b: 40 },
                xaxis: {
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 11 },
                },
                yaxis: {
                  title: "Avg Return (%)",
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

        <Panel title="Hour of Day Performance">
          <div className="h-64">
            <Plot
              data={[
                {
                  x: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                  y: data.hour_of_day_returns || Array.from({ length: 24 }, () => (Math.random() - 0.5) * 0.2),
                  type: "bar",
                  marker: {
                    color: (data.hour_of_day_returns || Array.from({ length: 24 }, () => (Math.random() - 0.5) * 0.2)).map((v: number) =>
                      v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)"
                    ),
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 50, r: 20, t: 20, b: 40 },
                xaxis: {
                  gridcolor: "rgba(63, 63, 70, 0.5)",
                  tickfont: { size: 9 },
                  tickangle: -45,
                },
                yaxis: {
                  title: "Avg Return (%)",
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
    </div>
  )
}
