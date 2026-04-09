"use client"

import { useSession } from "@/lib/session-context"
import { useOverfitting } from "@/lib/api"
import { Panel } from "@/components/panel"
import { MetricCard } from "@/components/metric-card"
import { GradeBadge } from "@/components/grade-badge"
import { Spinner } from "@/components/ui/spinner"
import { formatPercent, formatNumber, formatRatio } from "@/lib/format"
import dynamic from "next/dynamic"

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

export default function OverfittingPage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useOverfitting(sessionId)

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
        <p className="text-destructive">Failed to load overfitting analysis data.</p>
      </div>
    )
  }

  const pbo = data.probability_of_backtest_overfitting
  const deflatedSharpe = data.deflated_sharpe_ratio
  const minBTLength = data.minimum_backtest_length
  const expectedMaxSharpe = data.expected_max_sharpe_under_null

  // Determine overall grade
  const getOverallGrade = () => {
    if (pbo < 0.2 && deflatedSharpe > 0.5) return "A"
    if (pbo < 0.4 && deflatedSharpe > 0) return "B"
    if (pbo < 0.6) return "C"
    return "D"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Overfitting Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Probability of Backtest Overfitting (PBO) and Deflated Sharpe Ratio
          </p>
        </div>
        <GradeBadge grade={getOverallGrade()} size="lg" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="PBO"
          value={formatPercent(pbo)}
          tooltip="Probability that the backtest is overfitted. Lower is better. <20% is excellent"
          status={pbo < 0.2 ? "positive" : pbo < 0.4 ? "neutral" : "negative"}
        />
        <MetricCard
          label="Deflated Sharpe"
          value={formatRatio(deflatedSharpe)}
          tooltip="Sharpe ratio adjusted for multiple testing. Positive indicates genuine skill"
          status={deflatedSharpe > 0.5 ? "positive" : deflatedSharpe > 0 ? "neutral" : "negative"}
        />
        <MetricCard
          label="Min Backtest Length"
          value={`${formatNumber(minBTLength)} days`}
          tooltip="Minimum days needed for statistically significant backtest"
        />
        <MetricCard
          label="Expected Max Sharpe (Null)"
          value={formatRatio(expectedMaxSharpe)}
          tooltip="Expected maximum Sharpe if strategy has no edge (pure luck)"
        />
      </div>

      {/* PBO Interpretation */}
      <Panel title="Probability of Backtest Overfitting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${pbo * 251.2} 251.2`}
                    className={pbo < 0.2 ? "text-positive" : pbo < 0.4 ? "text-warning" : "text-negative"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold font-mono">{formatPercent(pbo)}</span>
                </div>
              </div>
              <div>
                <div className={`text-lg font-medium ${pbo < 0.2 ? "text-positive" : pbo < 0.4 ? "text-warning" : "text-negative"}`}>
                  {pbo < 0.2 ? "Low Risk" : pbo < 0.4 ? "Moderate Risk" : pbo < 0.6 ? "High Risk" : "Very High Risk"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {pbo < 0.2
                    ? "Strategy shows genuine predictive ability"
                    : pbo < 0.4
                    ? "Some risk of overfitting present"
                    : "High probability that backtest is overfitted"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Risk Thresholds</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Low Risk ({"<"}20%)</span>
                  <span className="text-positive">Institutional Grade</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-positive" style={{ width: "20%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Moderate (20-40%)</span>
                  <span className="text-warning">Exercise Caution</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: "20%", marginLeft: "20%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">High ({">"}40%)</span>
                  <span className="text-negative">Not Recommended</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-negative" style={{ width: "60%", marginLeft: "40%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Deflated Sharpe Analysis */}
      <Panel title="Deflated Sharpe Ratio Analysis">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64">
            <Plot
              data={[
                {
                  x: ["Reported Sharpe", "Deflated Sharpe", "Expected Max (Null)"],
                  y: [data.reported_sharpe || 1.5, deflatedSharpe, expectedMaxSharpe],
                  type: "bar",
                  marker: {
                    color: [
                      "rgba(59, 130, 246, 0.7)",
                      deflatedSharpe > 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)",
                      "rgba(161, 161, 170, 0.5)",
                    ],
                  },
                },
              ]}
              layout={{
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#a1a1aa", family: "Inter, sans-serif" },
                margin: { l: 50, r: 20, t: 20, b: 60 },
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
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">What is Deflated Sharpe?</h4>
              <p className="text-sm text-muted-foreground">
                The Deflated Sharpe Ratio adjusts for multiple testing bias. When many strategies are tested,
                some will appear profitable by chance. DSR accounts for the number of trials to give a more
                realistic assessment of genuine skill.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Interpretation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className={deflatedSharpe > 0.5 ? "text-positive" : "text-muted-foreground"}>•</span>
                  DSR {">"} 0.5: Strong evidence of genuine skill
                </li>
                <li className="flex items-center gap-2">
                  <span className={deflatedSharpe > 0 && deflatedSharpe <= 0.5 ? "text-warning" : "text-muted-foreground"}>•</span>
                  DSR {">"} 0: Some evidence of skill after adjustment
                </li>
                <li className="flex items-center gap-2">
                  <span className={deflatedSharpe <= 0 ? "text-negative" : "text-muted-foreground"}>•</span>
                  DSR {"<"} 0: Performance likely due to chance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Panel>

      {/* Minimum Backtest Length */}
      <Panel title="Backtest Length Analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-muted/20 border border-border text-center">
            <div className="text-3xl font-bold font-mono text-foreground">{formatNumber(minBTLength)}</div>
            <div className="text-sm text-muted-foreground mt-1">Minimum Days Required</div>
          </div>
          <div className="p-6 rounded-lg bg-muted/20 border border-border text-center">
            <div className="text-3xl font-bold font-mono text-foreground">{formatNumber(data.actual_backtest_length || 500)}</div>
            <div className="text-sm text-muted-foreground mt-1">Actual Backtest Length</div>
          </div>
          <div className="p-6 rounded-lg bg-muted/20 border border-border text-center">
            <div className={`text-3xl font-bold font-mono ${(data.actual_backtest_length || 500) >= minBTLength ? "text-positive" : "text-negative"}`}>
              {(data.actual_backtest_length || 500) >= minBTLength ? "PASS" : "FAIL"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Statistical Validity</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          The minimum backtest length is calculated based on the Sharpe ratio and desired confidence level.
          Backtests shorter than this threshold may not provide statistically significant results.
        </p>
      </Panel>

      {/* Multiple Testing Correction */}
      <Panel title="Multiple Testing Impact">
        <div className="h-64">
          <Plot
            data={[
              {
                x: [1, 5, 10, 20, 50, 100, 200, 500],
                y: [1, 5, 10, 20, 50, 100, 200, 500].map((n) => {
                  const baseSharpe = data.reported_sharpe || 1.5
                  const gamma = 0.5772156649
                  const correction = Math.sqrt(2 * Math.log(n)) - (Math.log(Math.PI * Math.log(n)) + gamma) / Math.sqrt(2 * Math.log(n))
                  return Math.max(0, baseSharpe - correction * 0.3)
                }),
                type: "scatter",
                mode: "lines+markers",
                name: "Deflated Sharpe",
                line: { color: "#3b82f6", width: 2 },
                marker: { size: 6 },
              },
              {
                x: [1, 5, 10, 20, 50, 100, 200, 500],
                y: Array(8).fill(data.reported_sharpe || 1.5),
                type: "scatter",
                mode: "lines",
                name: "Reported Sharpe",
                line: { color: "rgba(161, 161, 170, 0.5)", width: 2, dash: "dash" },
              },
            ]}
            layout={{
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#a1a1aa", family: "Inter, sans-serif" },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              xaxis: {
                title: "Number of Strategies Tested",
                type: "log",
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
        <p className="text-sm text-muted-foreground mt-4">
          This chart shows how the Deflated Sharpe decreases as more strategies are tested.
          The greater the number of backtests run, the more conservative the adjustment becomes.
        </p>
      </Panel>
    </div>
  )
}
