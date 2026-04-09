"use client"

import { useSession } from "@/lib/session-context"
import { useWalkForward } from "@/lib/api"
import { Panel } from "@/components/panel"
import { MetricCard } from "@/components/metric-card"
import { GradeBadge } from "@/components/grade-badge"
import { Spinner } from "@/components/ui/spinner"
import { formatPercent, formatNumber, formatRatio } from "@/lib/format"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export default function WalkForwardPage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useWalkForward(sessionId)

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
        <p className="text-destructive">Failed to load walk-forward analysis data.</p>
      </div>
    )
  }

  const wfe = data.walk_forward_efficiency
  const folds = data.folds

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Walk-Forward Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Out-of-sample validation across rolling time windows
          </p>
        </div>
        <GradeBadge 
          grade={wfe >= 0.5 ? "A" : wfe >= 0.3 ? "B" : wfe >= 0.1 ? "C" : "D"} 
          size="lg" 
        />
      </div>

      {/* WFE Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Walk-Forward Efficiency"
          value={formatPercent(wfe)}
          tooltip="Ratio of out-of-sample to in-sample performance. >50% indicates robust strategy"
          status={wfe >= 0.5 ? "positive" : wfe >= 0.3 ? "neutral" : "negative"}
        />
        <MetricCard
          label="Total Folds"
          value={folds.length.toString()}
          tooltip="Number of walk-forward optimization windows"
        />
        <MetricCard
          label="Avg IS Sharpe"
          value={formatRatio(folds.reduce((s, f) => s + f.is_sharpe, 0) / folds.length)}
          tooltip="Average in-sample Sharpe ratio across all folds"
        />
        <MetricCard
          label="Avg OOS Sharpe"
          value={formatRatio(folds.reduce((s, f) => s + f.oos_sharpe, 0) / folds.length)}
          tooltip="Average out-of-sample Sharpe ratio across all folds"
          status={
            folds.reduce((s, f) => s + f.oos_sharpe, 0) / folds.length >= 0.5
              ? "positive"
              : "neutral"
          }
        />
      </div>

      {/* WFE Interpretation */}
      <Panel title="Walk-Forward Efficiency Interpretation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl font-bold text-foreground font-mono">
                {formatPercent(wfe)}
              </div>
              <div className={`text-sm ${wfe >= 0.5 ? "text-positive" : wfe >= 0.3 ? "text-warning" : "text-negative"}`}>
                {wfe >= 0.5 ? "Excellent" : wfe >= 0.3 ? "Acceptable" : "Concerning"}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {wfe >= 0.5
                ? "Strategy demonstrates strong out-of-sample performance retention. The optimization parameters generalize well to unseen data."
                : wfe >= 0.3
                ? "Moderate performance degradation in out-of-sample periods. Consider simplifying the model or using more robust parameters."
                : "Significant performance degradation suggests potential overfitting. Strategy parameters may not generalize to live trading."}
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Excellent (WFE {">"} 50%)</span>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-positive" style={{ width: wfe >= 0.5 ? "100%" : "0%" }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Acceptable (30-50%)</span>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-warning" style={{ width: wfe >= 0.3 && wfe < 0.5 ? "100%" : "0%" }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Concerning ({"<"} 30%)</span>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-negative" style={{ width: wfe < 0.3 ? "100%" : "0%" }} />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Fold Performance Chart */}
      <Panel title="Fold Performance Comparison">
        <div className="h-80">
          <Plot
            data={[
              {
                x: folds.map((_, i) => `Fold ${i + 1}`),
                y: folds.map((f) => f.is_sharpe),
                type: "bar",
                name: "In-Sample Sharpe",
                marker: { color: "rgba(16, 185, 129, 0.7)" },
              },
              {
                x: folds.map((_, i) => `Fold ${i + 1}`),
                y: folds.map((f) => f.oos_sharpe),
                type: "bar",
                name: "Out-of-Sample Sharpe",
                marker: { color: "rgba(59, 130, 246, 0.7)" },
              },
            ]}
            layout={{
              barmode: "group",
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

      {/* Fold Details Table */}
      <Panel title="Fold Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Fold</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">IS Period</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">OOS Period</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">IS Sharpe</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">OOS Sharpe</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">IS Return</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">OOS Return</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {folds.map((fold, idx) => {
                const efficiency = fold.is_sharpe > 0 ? fold.oos_sharpe / fold.is_sharpe : 0
                return (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 text-muted-foreground">{fold.is_start} → {fold.is_end}</td>
                    <td className="py-3 px-4 text-muted-foreground">{fold.oos_start} → {fold.oos_end}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatRatio(fold.is_sharpe)}</td>
                    <td className={`py-3 px-4 text-right font-mono ${fold.oos_sharpe >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatRatio(fold.oos_sharpe)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatPercent(fold.is_return)}</td>
                    <td className={`py-3 px-4 text-right font-mono ${fold.oos_return >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatPercent(fold.oos_return)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono ${efficiency >= 0.5 ? "text-positive" : efficiency >= 0.3 ? "text-warning" : "text-negative"}`}>
                      {formatPercent(efficiency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Cumulative OOS Performance */}
      <Panel title="Cumulative Out-of-Sample Equity">
        <div className="h-72">
          <Plot
            data={[
              {
                x: folds.map((_, i) => i + 1),
                y: folds.reduce((acc: number[], fold) => {
                  const lastVal = acc.length > 0 ? acc[acc.length - 1] : 1
                  acc.push(lastVal * (1 + fold.oos_return))
                  return acc
                }, []),
                type: "scatter",
                mode: "lines+markers",
                name: "Cumulative OOS Equity",
                line: { color: "#3b82f6", width: 2 },
                marker: { size: 8 },
                fill: "tozeroy",
                fillcolor: "rgba(59, 130, 246, 0.1)",
              },
            ]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#a1a1aa", family: "Inter, sans-serif" },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              xaxis: {
                title: "Fold",
                gridcolor: "rgba(63, 63, 70, 0.5)",
                tickfont: { size: 11 },
              },
              yaxis: {
                title: "Equity Multiple",
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
  )
}
