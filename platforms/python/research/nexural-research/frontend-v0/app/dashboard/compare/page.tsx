"use client"

import { useState, useCallback } from "react"
import { useSession } from "@/lib/session-context"
import { useCompare } from "@/lib/api"
import { Panel } from "@/components/panel"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { formatPercent, formatRatio, formatCurrency, formatNumber } from "@/lib/format"
import { Upload, X, Plus } from "lucide-react"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface CompareStrategy {
  id: string
  name: string
  file?: File
}

export default function ComparePage() {
  const { sessionId } = useSession()
  const [strategies, setStrategies] = useState<CompareStrategy[]>([
    { id: sessionId || "current", name: "Current Strategy" }
  ])
  const [compareIds, setCompareIds] = useState<string[]>([sessionId || ""])
  
  const { data, isLoading, error } = useCompare(compareIds.filter(Boolean))

  const handleAddStrategy = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv,.json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const newId = `compare_${Date.now()}`
        setStrategies(prev => [...prev, { id: newId, name: file.name, file }])
        setCompareIds(prev => [...prev, newId])
      }
    }
    input.click()
  }, [])

  const handleRemoveStrategy = useCallback((id: string) => {
    if (id === sessionId) return // Can't remove current strategy
    setStrategies(prev => prev.filter(s => s.id !== id))
    setCompareIds(prev => prev.filter(cid => cid !== id))
  }, [sessionId])

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No strategy loaded. Please upload a strategy first.</p>
      </div>
    )
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategy Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Side-by-side analysis of multiple strategies
          </p>
        </div>
        <Button onClick={handleAddStrategy} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Strategy
        </Button>
      </div>

      {/* Strategy Selection */}
      <Panel title="Strategies">
        <div className="flex flex-wrap gap-3">
          {strategies.map((strategy, idx) => (
            <div
              key={strategy.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30"
              style={{ borderLeftWidth: 3, borderLeftColor: colors[idx % colors.length] }}
            >
              <span className="text-sm font-medium text-foreground">{strategy.name}</span>
              {strategy.id !== sessionId && (
                <button
                  onClick={() => handleRemoveStrategy(strategy.id)}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
          {strategies.length < 6 && (
            <button
              onClick={handleAddStrategy}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">Upload CSV/JSON</span>
            </button>
          )}
        </div>
      </Panel>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error || !data ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">
            {strategies.length === 1 
              ? "Add another strategy to compare" 
              : "Failed to load comparison data"}
          </p>
        </div>
      ) : (
        <>
          {/* Equity Curves Comparison */}
          <Panel title="Equity Curves">
            <div className="h-80">
              <Plot
                data={data.strategies.map((s, idx) => ({
                  x: s.equity.dates,
                  y: s.equity.values,
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: s.name,
                  line: { color: colors[idx % colors.length], width: 2 },
                }))}
                layout={{
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                  margin: { l: 60, r: 20, t: 20, b: 50 },
                  xaxis: {
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
                  },
                  yaxis: {
                    title: "Equity",
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
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

          {/* Metrics Comparison Table */}
          <Panel title="Key Metrics Comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Metric</th>
                    {data.strategies.map((s, idx) => (
                      <th key={s.id} className="text-right py-3 px-4 font-medium" style={{ color: colors[idx % colors.length] }}>
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "total_return", label: "Total Return", format: formatPercent },
                    { key: "cagr", label: "CAGR", format: formatPercent },
                    { key: "sharpe", label: "Sharpe Ratio", format: formatRatio },
                    { key: "sortino", label: "Sortino Ratio", format: formatRatio },
                    { key: "calmar", label: "Calmar Ratio", format: formatRatio },
                    { key: "max_drawdown", label: "Max Drawdown", format: formatPercent },
                    { key: "volatility", label: "Volatility", format: formatPercent },
                    { key: "win_rate", label: "Win Rate", format: formatPercent },
                    { key: "profit_factor", label: "Profit Factor", format: formatRatio },
                    { key: "total_trades", label: "Total Trades", format: formatNumber },
                  ].map((metric) => {
                    const values = data.strategies.map(s => s.metrics[metric.key] || 0)
                    const best = metric.key === "max_drawdown" 
                      ? Math.max(...values.map(v => v)) // Less negative is better
                      : Math.max(...values)
                    
                    return (
                      <tr key={metric.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-foreground">{metric.label}</td>
                        {values.map((val, idx) => (
                          <td 
                            key={idx} 
                            className={`py-3 px-4 text-right font-mono ${
                              val === best ? "text-positive font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {metric.format(val)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Drawdown Comparison */}
          <Panel title="Drawdown Comparison">
            <div className="h-64">
              <Plot
                data={data.strategies.map((s, idx) => ({
                  x: s.drawdown.dates,
                  y: s.drawdown.values.map((v: number) => v * 100),
                  type: "scatter" as const,
                  mode: "lines" as const,
                  name: s.name,
                  fill: "tozeroy" as const,
                  line: { color: colors[idx % colors.length], width: 1 },
                  fillcolor: `${colors[idx % colors.length]}20`,
                }))}
                layout={{
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                  margin: { l: 60, r: 20, t: 20, b: 50 },
                  xaxis: {
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
                  },
                  yaxis: {
                    title: "Drawdown (%)",
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
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

          {/* Monthly Returns Comparison */}
          <Panel title="Monthly Returns Distribution">
            <div className="h-64">
              <Plot
                data={data.strategies.map((s, idx) => ({
                  y: s.monthly_returns,
                  type: "box" as const,
                  name: s.name,
                  marker: { color: colors[idx % colors.length] },
                  boxpoints: "outliers" as const,
                }))}
                layout={{
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                  margin: { l: 60, r: 20, t: 20, b: 50 },
                  yaxis: {
                    title: "Monthly Return (%)",
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

          {/* Risk-Return Scatter */}
          <Panel title="Risk-Return Profile">
            <div className="h-72">
              <Plot
                data={[
                  {
                    x: data.strategies.map(s => s.metrics.volatility * 100),
                    y: data.strategies.map(s => s.metrics.cagr * 100),
                    type: "scatter",
                    mode: "markers+text",
                    text: data.strategies.map(s => s.name),
                    textposition: "top center",
                    textfont: { size: 11, color: "#a1a1aa" },
                    marker: {
                      size: 20,
                      color: data.strategies.map((_, idx) => colors[idx % colors.length]),
                    },
                  },
                ]}
                layout={{
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                  margin: { l: 60, r: 20, t: 40, b: 50 },
                  xaxis: {
                    title: "Volatility (%)",
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
                  },
                  yaxis: {
                    title: "CAGR (%)",
                    gridcolor: "rgba(63, 63, 70, 0.5)",
                    tickfont: { size: 11 },
                  },
                  showlegend: false,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Strategies in the upper-left quadrant (high return, low volatility) are most efficient.
            </p>
          </Panel>
        </>
      )}
    </div>
  )
}
