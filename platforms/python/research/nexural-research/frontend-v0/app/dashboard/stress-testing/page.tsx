'use client'

import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { Panel, PanelSkeleton } from '@/components/panel'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'
import type { TailAmplificationResult, HistoricalStressResult, ParameterSensitivityResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertTriangle, Flame, TrendingDown, Activity } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

function TailAmplificationTable({ data }: { data: TailAmplificationResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Original Net:</span>{' '}
          <span className={cn('font-mono', data.original_net >= 0 ? 'text-profit' : 'text-loss')}>
            {formatCurrency(data.original_net)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Original MDD:</span>{' '}
          <span className="font-mono text-loss">{formatCurrency(data.original_mdd)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Scenario</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Net Profit</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Change</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Max DD</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Change</th>
              <th className="text-center py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Survives</th>
            </tr>
          </thead>
          <tbody>
            {data.scenarios.map((scenario, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                <td className="py-3 px-4">
                  <span className="font-medium text-foreground">{scenario.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({formatPercent(scenario.tail_pct)} × {scenario.multiplier}x)
                  </span>
                </td>
                <td className={cn('text-right py-3 px-4 font-mono', scenario.adjusted_net >= 0 ? 'text-profit' : 'text-loss')}>
                  {formatCurrency(scenario.adjusted_net)}
                </td>
                <td className={cn('text-right py-3 px-4 font-mono text-xs', scenario.net_change_pct <= 0 ? 'text-loss' : 'text-profit')}>
                  {scenario.net_change_pct >= 0 ? '+' : ''}{formatPercent(scenario.net_change_pct)}
                </td>
                <td className="text-right py-3 px-4 font-mono text-loss">
                  {formatCurrency(scenario.adjusted_mdd)}
                </td>
                <td className={cn('text-right py-3 px-4 font-mono text-xs', scenario.mdd_change_pct >= 0 ? 'text-loss' : 'text-profit')}>
                  {scenario.mdd_change_pct >= 0 ? '+' : ''}{formatPercent(scenario.mdd_change_pct)}
                </td>
                <td className="text-center py-3 px-4">
                  {scenario.still_profitable ? (
                    <CheckCircle2 className="h-5 w-5 text-profit mx-auto" />
                  ) : (
                    <XCircle className="h-5 w-5 text-loss mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{data.interpretation}</p>
    </div>
  )
}

function SensitivityHeatmap({ data }: { data: ParameterSensitivityResult }) {
  // Prepare data for Plotly heatmap
  const stopMults = [...new Set(data.grid.map((p) => p.stop_multiplier))].sort((a, b) => a - b)
  const sizeMults = [...new Set(data.grid.map((p) => p.size_multiplier))].sort((a, b) => a - b)

  const z: number[][] = sizeMults.map((size) =>
    stopMults.map((stop) => {
      const point = data.grid.find((p) => p.stop_multiplier === stop && p.size_multiplier === size)
      return point?.net_profit ?? 0
    })
  )

  const hovertext: string[][] = sizeMults.map((size) =>
    stopMults.map((stop) => {
      const point = data.grid.find((p) => p.stop_multiplier === stop && p.size_multiplier === size)
      if (!point) return ''
      return `Stop: ${stop}x<br>Size: ${size}x<br>Net: ${formatCurrency(point.net_profit)}<br>MDD: ${formatCurrency(point.max_drawdown)}<br>PF: ${point.profit_factor.toFixed(2)}<br>WR: ${formatPercent(point.win_rate)}`
    })
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
          <Activity className="h-4 w-4 text-info" />
          <span className="text-xs text-muted-foreground">Robustness Score:</span>
          <span className={cn(
            'font-mono font-semibold',
            data.robustness_score >= 70 ? 'text-profit' : data.robustness_score >= 50 ? 'text-warning' : 'text-loss'
          )}>
            {formatNumber(data.robustness_score, 0)}/100
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Optimal Size:</span>{' '}
          <span className="font-mono text-foreground">{data.optimal_size_mult}x current</span>
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-border overflow-hidden" style={{ height: 400 }}>
        <Plot
          data={[
            {
              type: 'heatmap',
              x: stopMults.map((s) => `${s}x`),
              y: sizeMults.map((s) => `${s}x`),
              z,
              text: hovertext,
              hoverinfo: 'text',
              colorscale: [
                [0, '#ef4444'],
                [0.5, '#1a1a25'],
                [1, '#10b981'],
              ],
              colorbar: {
                title: { text: 'Net Profit', font: { color: '#6b7280', size: 10 } },
                tickfont: { color: '#6b7280', size: 10 },
                tickformat: '$,.0f',
              },
            },
          ]}
          layout={{
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            margin: { t: 30, r: 80, b: 60, l: 60 },
            xaxis: {
              title: { text: 'Stop Multiplier', font: { color: '#6b7280', size: 11 } },
              tickfont: { color: '#6b7280', size: 10 },
              gridcolor: 'rgba(255,255,255,0.04)',
            },
            yaxis: {
              title: { text: 'Size Multiplier', font: { color: '#6b7280', size: 11 } },
              tickfont: { color: '#6b7280', size: 10 },
              gridcolor: 'rgba(255,255,255,0.04)',
            },
            font: { family: 'JetBrains Mono, monospace' },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{data.interpretation}</p>
    </div>
  )
}

function WorstWindowsTimeline({ data }: { data: HistoricalStressResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">Worst N-Trade Loss</span>
          <span className="text-xl font-mono font-semibold text-loss">{formatCurrency(data.worst_n_trade_loss)}</span>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">Worst Single Day</span>
          <span className="text-xl font-mono font-semibold text-loss">{formatCurrency(data.worst_single_day_loss)}</span>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">Worst Single Trade</span>
          <span className="text-xl font-mono font-semibold text-loss">{formatCurrency(data.worst_single_trade)}</span>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">Windows Analyzed</span>
          <span className="text-xl font-mono font-semibold text-foreground">{data.n_windows_analyzed}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Period</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Trades</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Total PnL</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Max DD</th>
              <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.worst_windows.map((window, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                <td className="py-3 px-4">
                  <div className="text-foreground">
                    {new Date(window.start_time).toLocaleDateString()} - {new Date(window.end_time).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trades {window.start_index} - {window.end_index}
                  </div>
                </td>
                <td className="text-right py-3 px-4 font-mono text-foreground">{window.n_trades}</td>
                <td className={cn('text-right py-3 px-4 font-mono', window.total_pnl >= 0 ? 'text-profit' : 'text-loss')}>
                  {formatCurrency(window.total_pnl)}
                </td>
                <td className="text-right py-3 px-4 font-mono text-loss">{formatCurrency(window.max_drawdown)}</td>
                <td className={cn(
                  'text-right py-3 px-4 font-mono',
                  window.win_rate >= 50 ? 'text-profit' : 'text-loss'
                )}>
                  {formatPercent(window.win_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{data.interpretation}</p>
    </div>
  )
}

export default function StressTestingPage() {
  const { sessionId } = useSession()

  const { data: tail, isLoading: tailLoading } = useSWR<TailAmplificationResult>(
    sessionId ? `/api/stress/tail-amplification?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: historical, isLoading: historicalLoading } = useSWR<HistoricalStressResult>(
    sessionId ? `/api/stress/historical?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: sensitivity, isLoading: sensitivityLoading } = useSWR<ParameterSensitivityResult>(
    sessionId ? `/api/stress/sensitivity?session_id=${sessionId}` : null,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Stress Testing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze strategy resilience under adverse market conditions
        </p>
      </div>

      {/* Tail Amplification */}
      <Panel
        title="Tail Amplification Stress Test"
        description="What happens when worst trades get worse?"
        headerAction={
          <div className="flex items-center gap-1.5 text-warning">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-medium">Extreme Scenarios</span>
          </div>
        }
      >
        {tailLoading ? (
          <div className="h-[300px] bg-muted/30 rounded-xl animate-pulse" />
        ) : tail ? (
          <TailAmplificationTable data={tail} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No tail amplification data available
          </div>
        )}
      </Panel>

      {/* Parameter Sensitivity */}
      <Panel
        title="Parameter Sensitivity Surface"
        description="How robust is performance to stop and position size changes?"
      >
        {sensitivityLoading ? (
          <div className="h-[500px] bg-muted/30 rounded-xl animate-pulse" />
        ) : sensitivity ? (
          <SensitivityHeatmap data={sensitivity} />
        ) : (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No sensitivity data available
          </div>
        )}
      </Panel>

      {/* Worst Historical Windows */}
      <Panel
        title="Worst Historical Windows"
        description="Identify the most challenging periods in your trading history"
        headerAction={
          <div className="flex items-center gap-1.5 text-loss">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs font-medium">Drawdown Analysis</span>
          </div>
        }
      >
        {historicalLoading ? (
          <div className="h-[300px] bg-muted/30 rounded-xl animate-pulse" />
        ) : historical ? (
          <WorstWindowsTimeline data={historical} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No historical stress data available
          </div>
        )}
      </Panel>
    </div>
  )
}
