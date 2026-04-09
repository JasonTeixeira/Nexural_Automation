'use client'

import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { Panel, PanelSkeleton } from '@/components/panel'
import { MetricCard, MetricCardSkeleton } from '@/components/metric-card'
import { DistributionChart, DistributionChartSkeleton } from '@/components/charts/distribution-chart'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import type { DistributionMetrics, DistributionChartData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

function PercentileTable({ data }: { data: DistributionMetrics }) {
  const percentiles = [
    { label: 'P1', value: data.percentile_01 },
    { label: 'P5', value: data.percentile_05 },
    { label: 'P10', value: data.percentile_10 },
    { label: 'P25', value: data.percentile_25 },
    { label: 'P50 (Median)', value: data.median },
    { label: 'P75', value: data.percentile_75 },
    { label: 'P90', value: data.percentile_90 },
    { label: 'P95', value: data.percentile_95 },
    { label: 'P99', value: data.percentile_99 },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Percentile
            </th>
            <th className="text-right py-2 px-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              PnL Value
            </th>
          </tr>
        </thead>
        <tbody>
          {percentiles.map((p) => (
            <tr key={p.label} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
              <td className="py-2 px-3 text-muted-foreground">{p.label}</td>
              <td className={cn('text-right py-2 px-3 font-mono', p.value >= 0 ? 'text-profit' : 'text-loss')}>
                {formatCurrency(p.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DistributionPage() {
  const { sessionId } = useSession()

  const { data: stats, isLoading: statsLoading } = useSWR<DistributionMetrics>(
    sessionId ? `/api/analysis/distribution?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: chartData, isLoading: chartLoading } = useSWR<DistributionChartData>(
    sessionId ? `/api/charts/distribution?session_id=${sessionId}` : null,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Distribution Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statistical distribution of trade PnL with VaR and normality testing
        </p>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Mean PnL"
              value={formatCurrency(stats?.mean ?? 0)}
              valueColor={(stats?.mean ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Average profit/loss per trade"
            />
            <MetricCard
              label="Median PnL"
              value={formatCurrency(stats?.median ?? 0)}
              valueColor={(stats?.median ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Middle value of all PnLs (50th percentile)"
            />
            <MetricCard
              label="Std Deviation"
              value={formatCurrency(stats?.std ?? 0)}
              tooltip="Volatility of trade returns"
            />
            <MetricCard
              label="VaR (95%)"
              value={formatCurrency(stats?.var_95 ?? 0)}
              valueColor="loss"
              tooltip="Value at Risk: worst expected loss 5% of the time"
            />
            <MetricCard
              label="CVaR (95%)"
              value={formatCurrency(stats?.cvar_95 ?? 0)}
              valueColor="loss"
              tooltip="Conditional VaR: expected loss when VaR is breached"
            />
            <MetricCard
              label="Skewness"
              value={formatNumber(stats?.skewness ?? 0, 2)}
              valueColor={(stats?.skewness ?? 0) > 0 ? 'profit' : 'default'}
              tooltip="Positive = right skew (more upside). Negative = left skew"
            />
          </>
        )}
      </div>

      {/* PnL Histogram */}
      <Panel
        title="PnL Distribution Histogram"
        description="Distribution of trade profits and losses with risk markers"
      >
        {chartLoading ? (
          <DistributionChartSkeleton height={400} />
        ) : chartData ? (
          <div className="space-y-4">
            <DistributionChart data={chartData} height={400} />
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-profit" />
                <span className="text-xs text-muted-foreground">Profit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-loss" />
                <span className="text-xs text-muted-foreground">Loss</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-warning" style={{ borderStyle: 'dashed' }} />
                <span className="text-xs text-muted-foreground">VaR 95%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-loss" style={{ borderStyle: 'dashed' }} />
                <span className="text-xs text-muted-foreground">CVaR 95%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No distribution data available
          </div>
        )}
      </Panel>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Normality Test */}
        {statsLoading ? (
          <PanelSkeleton height={300} />
        ) : (
          <Panel
            title="Normality Test"
            description="Jarque-Bera test for distribution normality"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {stats?.is_normal ? (
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-profit/10 border border-profit/20">
                    <CheckCircle2 className="h-8 w-8 text-profit" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-info/10 border border-info/20">
                    <Info className="h-8 w-8 text-info" />
                  </div>
                )}
                <div>
                  <span className={cn(
                    'text-lg font-semibold',
                    stats?.is_normal ? 'text-profit' : 'text-info'
                  )}>
                    {stats?.is_normal ? 'Normal Distribution' : 'Non-Normal Distribution'}
                  </span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats?.is_normal
                      ? 'Returns follow a normal distribution'
                      : 'Returns deviate from normal distribution (fat tails likely)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-border p-4">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                    JB Statistic
                  </span>
                  <span className="text-xl font-mono font-semibold text-foreground">
                    {formatNumber(stats?.jarque_bera_stat ?? 0, 2)}
                  </span>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                    P-Value
                  </span>
                  <span className={cn(
                    'text-xl font-mono font-semibold',
                    (stats?.jarque_bera_p ?? 0) > 0.05 ? 'text-profit' : 'text-info'
                  )}>
                    {formatNumber(stats?.jarque_bera_p ?? 0, 4)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-border p-4">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                    Skewness
                  </span>
                  <span className={cn(
                    'text-xl font-mono font-semibold',
                    (stats?.skewness ?? 0) > 0 ? 'text-profit' : 'text-foreground'
                  )}>
                    {formatNumber(stats?.skewness ?? 0, 3)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {(stats?.skewness ?? 0) > 0.5
                      ? 'Positive skew (more upside)'
                      : (stats?.skewness ?? 0) < -0.5
                      ? 'Negative skew (more downside)'
                      : 'Near symmetric'}
                  </span>
                </div>
                <div className="bg-surface rounded-xl border border-border p-4">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-1">
                    Kurtosis
                  </span>
                  <span className={cn(
                    'text-xl font-mono font-semibold',
                    (stats?.kurtosis ?? 0) > 3 ? 'text-warning' : 'text-foreground'
                  )}>
                    {formatNumber(stats?.kurtosis ?? 0, 3)}
                  </span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {(stats?.kurtosis ?? 0) > 3
                      ? 'Fat tails (extreme events more likely)'
                      : 'Normal tails'}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Percentile Table */}
        {statsLoading ? (
          <PanelSkeleton height={300} />
        ) : (
          <Panel
            title="Percentile Breakdown"
            description="PnL values at various percentile levels"
          >
            {stats ? (
              <PercentileTable data={stats} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No percentile data available
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
