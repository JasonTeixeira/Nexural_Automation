'use client'

import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { Panel, PanelSkeleton } from '@/components/panel'
import { MetricCard, MetricCardSkeleton } from '@/components/metric-card'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format'
import type { MonteCarloResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

function FanChart({ data }: { data: MonteCarloResult }) {
  // If we have equity paths, use them for fan chart
  if (!data.equity_paths || data.equity_paths.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No equity path data available for fan chart
      </div>
    )
  }

  // Calculate percentile bands from equity paths
  const numPoints = data.equity_paths[0]?.length || 0
  const chartData = Array.from({ length: numPoints }, (_, i) => {
    const values = data.equity_paths!.map((path) => path[i]).sort((a, b) => a - b)
    const len = values.length
    return {
      index: i,
      p5: values[Math.floor(len * 0.05)] || 0,
      p25: values[Math.floor(len * 0.25)] || 0,
      p50: values[Math.floor(len * 0.5)] || 0,
      p75: values[Math.floor(len * 0.75)] || 0,
      p95: values[Math.floor(len * 0.95)] || 0,
    }
  })

  return (
    <div style={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mcP5P95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="mcP25P75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="index"
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, 0)}
            width={70}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const item = payload[0].payload
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-2">Trade {label}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">P95</span>
                      <span className="font-mono text-profit">{formatCurrency(item.p95)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">P75</span>
                      <span className="font-mono">{formatCurrency(item.p75)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">P50 (Median)</span>
                      <span className="font-mono font-semibold">{formatCurrency(item.p50)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">P25</span>
                      <span className="font-mono">{formatCurrency(item.p25)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">P5</span>
                      <span className="font-mono text-loss">{formatCurrency(item.p5)}</span>
                    </div>
                  </div>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="p95" stroke="none" fill="url(#mcP5P95)" />
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#mcP25P75)" />
          <Area type="monotone" dataKey="p50" stroke="var(--chart-1)" fill="none" strokeWidth={2} />
          <Area type="monotone" dataKey="p25" stroke="none" fill="transparent" />
          <Area type="monotone" dataKey="p5" stroke="none" fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function FinalEquityHistogram({ data }: { data: MonteCarloResult }) {
  // Create histogram bins for final equities
  const finalEquities = data.final_equities
  const min = Math.min(...finalEquities)
  const max = Math.max(...finalEquities)
  const numBins = 30
  const binWidth = (max - min) / numBins

  const bins = Array.from({ length: numBins }, (_, i) => {
    const binStart = min + i * binWidth
    const binEnd = binStart + binWidth
    const count = finalEquities.filter((e) => e >= binStart && e < binEnd).length
    return {
      bin: binStart + binWidth / 2,
      count,
      isProfitable: binStart >= 0,
    }
  })

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="bin"
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value, 0)}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground">Final Equity</p>
                  <p className="text-sm font-mono text-foreground">
                    {formatCurrency(payload[0].payload.bin)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Count</p>
                  <p className="text-sm font-mono text-foreground">{payload[0].payload.count}</p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--chart-1)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function MonteCarloPage() {
  const { sessionId } = useSession()

  const { data: parametric, isLoading: parametricLoading } = useSWR<MonteCarloResult>(
    sessionId ? `/api/robustness/parametric-monte-carlo?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: bootstrap, isLoading: bootstrapLoading } = useSWR<MonteCarloResult>(
    sessionId ? `/api/robustness/block-bootstrap?session_id=${sessionId}` : null,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Monte Carlo Simulation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statistical simulation to assess strategy robustness and probability of outcomes
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {parametricLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Probability of Profit"
              value={formatPercent(parametric?.probability_of_profit ?? 0)}
              valueColor={(parametric?.probability_of_profit ?? 0) >= 80 ? 'profit' : (parametric?.probability_of_profit ?? 0) >= 60 ? 'default' : 'loss'}
              tooltip="Percentage of simulations that ended profitable"
              size="lg"
            />
            <MetricCard
              label="Expected Final Equity"
              value={formatCurrency(parametric?.expected_final_equity ?? 0)}
              valueColor={(parametric?.expected_final_equity ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Mean final equity across all simulations"
              size="lg"
            />
            <MetricCard
              label="Simulations"
              value={formatNumber(parametric?.n_simulations ?? 0, 0)}
              tooltip="Number of Monte Carlo simulations run"
              size="lg"
            />
            <MetricCard
              label="Median Outcome (P50)"
              value={formatCurrency(parametric?.percentiles.p50 ?? 0)}
              valueColor={(parametric?.percentiles.p50 ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="50th percentile final equity"
              size="lg"
            />
          </>
        )}
      </div>

      {/* Percentile Cards */}
      <div className="grid grid-cols-5 gap-4">
        {parametricLoading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} size="sm" />)
        ) : (
          <>
            <MetricCard
              label="P5 (Worst Case)"
              value={formatCurrency(parametric?.percentiles.p5 ?? 0)}
              valueColor={(parametric?.percentiles.p5 ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="5th percentile - worst 5% of outcomes"
              size="sm"
            />
            <MetricCard
              label="P25"
              value={formatCurrency(parametric?.percentiles.p25 ?? 0)}
              valueColor={(parametric?.percentiles.p25 ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="25th percentile outcome"
              size="sm"
            />
            <MetricCard
              label="P50 (Median)"
              value={formatCurrency(parametric?.percentiles.p50 ?? 0)}
              valueColor={(parametric?.percentiles.p50 ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="50th percentile - median outcome"
              size="sm"
            />
            <MetricCard
              label="P75"
              value={formatCurrency(parametric?.percentiles.p75 ?? 0)}
              valueColor="profit"
              tooltip="75th percentile outcome"
              size="sm"
            />
            <MetricCard
              label="P95 (Best Case)"
              value={formatCurrency(parametric?.percentiles.p95 ?? 0)}
              valueColor="profit"
              tooltip="95th percentile - best 5% of outcomes"
              size="sm"
            />
          </>
        )}
      </div>

      {/* Fan Chart */}
      <Panel
        title="Equity Cone (Parametric MC)"
        description="Probability bands showing range of possible equity curves"
      >
        {parametricLoading ? (
          <div className="h-[400px] bg-muted/30 rounded-xl animate-pulse" />
        ) : parametric ? (
          <div className="space-y-4">
            <FanChart data={parametric} />
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-3 rounded bg-chart-1/10" />
                <span className="text-xs text-muted-foreground">P5-P95 Range</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-3 rounded bg-chart-1/20" />
                <span className="text-xs text-muted-foreground">P25-P75 Range</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-chart-1" />
                <span className="text-xs text-muted-foreground">Median (P50)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No Monte Carlo data available
          </div>
        )}
      </Panel>

      {/* Final Equity Distribution */}
      <Panel
        title="Final Equity Distribution"
        description="Histogram of simulated final account values"
      >
        {parametricLoading ? (
          <div className="h-[300px] bg-muted/30 rounded-xl animate-pulse" />
        ) : parametric && parametric.final_equities.length > 0 ? (
          <FinalEquityHistogram data={parametric} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No final equity distribution data available
          </div>
        )}
      </Panel>

      {/* Block Bootstrap Results */}
      <Panel
        title="Block Bootstrap Simulation"
        description="Preserves trade sequence dependencies for more realistic simulation"
      >
        {bootstrapLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} size="sm" />)}
          </div>
        ) : bootstrap ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-surface rounded-xl border border-border p-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                Prob. of Profit
              </span>
              <span className={cn(
                'text-xl font-mono font-semibold',
                bootstrap.probability_of_profit >= 80 ? 'text-profit' : bootstrap.probability_of_profit >= 60 ? 'text-foreground' : 'text-loss'
              )}>
                {formatPercent(bootstrap.probability_of_profit)}
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                P5 (Worst)
              </span>
              <span className={cn('text-xl font-mono font-semibold', bootstrap.percentiles.p5 >= 0 ? 'text-profit' : 'text-loss')}>
                {formatCurrency(bootstrap.percentiles.p5)}
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                P50 (Median)
              </span>
              <span className={cn('text-xl font-mono font-semibold', bootstrap.percentiles.p50 >= 0 ? 'text-profit' : 'text-loss')}>
                {formatCurrency(bootstrap.percentiles.p50)}
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                P95 (Best)
              </span>
              <span className="text-xl font-mono font-semibold text-profit">
                {formatCurrency(bootstrap.percentiles.p95)}
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                Simulations
              </span>
              <span className="text-xl font-mono font-semibold text-foreground">
                {formatNumber(bootstrap.n_simulations, 0)}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground">
            No block bootstrap data available
          </div>
        )}
      </Panel>
    </div>
  )
}
