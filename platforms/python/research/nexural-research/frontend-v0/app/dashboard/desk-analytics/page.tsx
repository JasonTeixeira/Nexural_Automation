'use client'

import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { Panel, PanelSkeleton } from '@/components/panel'
import { ACFChart, ACFChartSkeleton } from '@/components/charts/acf-chart'
import { RollingCorrelationChart, RollingCorrelationChartSkeleton } from '@/components/charts/rolling-correlation-chart'
import { formatRatio, formatCurrency, formatPercent } from '@/lib/format'
import type { HurstResult, ACFResult, RollingCorrelationResult, InformationRatioResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3 } from 'lucide-react'

function HurstGauge({ value, regime }: { value: number; regime: string }) {
  // Map hurst value to gauge position (0 to 1 -> 0% to 100%)
  const position = Math.min(Math.max(value, 0), 1) * 100

  const regimeColors = {
    mean_reverting: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    random_walk: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
    trending: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  }

  const colors = regimeColors[regime as keyof typeof regimeColors] || regimeColors.random_walk

  return (
    <div className="space-y-3">
      {/* Gauge bar */}
      <div className="relative h-3 bg-surface rounded-full overflow-hidden border border-border">
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-blue-500/20" />
          <div className="flex-1 bg-gray-500/20" />
          <div className="flex-1 bg-emerald-500/20" />
        </div>
        {/* Position marker */}
        <div
          className="absolute top-0 w-1 h-full bg-foreground rounded-full shadow-lg"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Mean Reverting</span>
        <span>Random Walk</span>
        <span>Trending</span>
      </div>
      {/* Regime badge */}
      <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', colors.bg, colors.text, colors.border)}>
        {regime === 'mean_reverting' && <TrendingDown className="h-3 w-3" />}
        {regime === 'random_walk' && <Minus className="h-3 w-3" />}
        {regime === 'trending' && <TrendingUp className="h-3 w-3" />}
        {regime.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </div>
    </div>
  )
}

function IRComparisonBars({ baseline, recent }: { baseline: number; recent: number }) {
  const max = Math.max(Math.abs(baseline), Math.abs(recent))
  const baselineWidth = max > 0 ? (Math.abs(baseline) / max) * 100 : 0
  const recentWidth = max > 0 ? (Math.abs(recent) / max) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Baseline Mean</span>
          <span className="font-mono text-foreground">{formatCurrency(baseline)}</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', baseline >= 0 ? 'bg-muted-foreground/50' : 'bg-loss/50')}
            style={{ width: `${baselineWidth}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Recent Mean</span>
          <span className="font-mono text-foreground">{formatCurrency(recent)}</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', recent >= 0 ? 'bg-profit' : 'bg-loss')}
            style={{ width: `${recentWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function DeskAnalyticsPage() {
  const { sessionId } = useSession()

  const { data: hurst, isLoading: hurstLoading } = useSWR<HurstResult>(
    sessionId ? `/api/analysis/hurst?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: acf, isLoading: acfLoading } = useSWR<ACFResult>(
    sessionId ? `/api/analysis/acf?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: rollingCorr, isLoading: rollingLoading } = useSWR<RollingCorrelationResult>(
    sessionId ? `/api/analysis/rolling-correlation?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: ir, isLoading: irLoading } = useSWR<InformationRatioResult>(
    sessionId ? `/api/analysis/information-ratio?session_id=${sessionId}` : null,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Desk Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quantitative analysis tools used by professional trading desks
        </p>
      </div>

      {/* Top Row: Hurst + Information Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hurst Exponent */}
        {hurstLoading ? (
          <PanelSkeleton height={220} />
        ) : (
          <Panel title="Hurst Exponent" description="Market regime detection via rescaled range analysis">
            <div className="space-y-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-mono font-bold text-foreground">
                  {formatRatio(hurst?.hurst_exponent ?? 0.5)}
                </span>
                <span className="text-sm text-muted-foreground">H coefficient</span>
              </div>
              <HurstGauge value={hurst?.hurst_exponent ?? 0.5} regime={hurst?.regime ?? 'random_walk'} />
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">R²</span>
                  <span className="text-sm font-mono text-foreground">{formatRatio(hurst?.r_squared ?? 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Confidence</span>
                  <span className={cn(
                    'text-sm font-medium capitalize',
                    hurst?.confidence === 'high' && 'text-profit',
                    hurst?.confidence === 'medium' && 'text-warning',
                    hurst?.confidence === 'low' && 'text-loss'
                  )}>
                    {hurst?.confidence ?? 'unknown'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{hurst?.interpretation}</p>
            </div>
          </Panel>
        )}

        {/* Information Ratio */}
        {irLoading ? (
          <PanelSkeleton height={220} />
        ) : (
          <Panel title="Information Ratio" description="Recent performance vs historical baseline">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-mono font-bold text-foreground">
                      {formatRatio(ir?.information_ratio ?? 0)}
                    </span>
                    <span className="text-sm text-muted-foreground">IR</span>
                  </div>
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mt-2',
                    ir?.is_outperforming
                      ? 'bg-profit/10 text-profit border-profit/20'
                      : 'bg-loss/10 text-loss border-loss/20'
                  )}>
                    {ir?.is_outperforming ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {ir?.is_outperforming ? 'Outperforming' : 'Underperforming'}
                  </div>
                </div>
                <div className="flex-1">
                  <IRComparisonBars
                    baseline={ir?.baseline_mean ?? 0}
                    recent={ir?.recent_mean ?? 0}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Active Return</span>
                  <span className={cn('text-sm font-mono', (ir?.active_return ?? 0) >= 0 ? 'text-profit' : 'text-loss')}>
                    {formatCurrency(ir?.active_return ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Tracking Error</span>
                  <span className="text-sm font-mono text-foreground">{formatCurrency(ir?.tracking_error ?? 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Window</span>
                  <span className="text-sm font-mono text-foreground">{ir?.recent_window ?? 0} trades</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{ir?.interpretation}</p>
            </div>
          </Panel>
        )}
      </div>

      {/* ACF Chart */}
      <Panel
        title="Autocorrelation Function"
        description="Serial correlation analysis to detect trade dependency patterns"
        headerAction={
          acf?.has_significant_dependency && (
            <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
              Significant Dependency Detected
            </span>
          )
        }
      >
        {acfLoading ? (
          <ACFChartSkeleton height={300} />
        ) : acf ? (
          <div className="space-y-4">
            <ACFChart data={acf} height={300} />
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-chart-1" />
                <span className="text-xs text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-chart-3" />
                <span className="text-xs text-muted-foreground">Significant (outside CI)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Significant Lags:</span>
                <span className="text-xs font-mono text-foreground">
                  {acf.significant_lags.length > 0 ? acf.significant_lags.join(', ') : 'None'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{acf.interpretation}</p>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No ACF data available
          </div>
        )}
      </Panel>

      {/* Rolling Correlation */}
      <Panel
        title="Rolling Correlation Analysis"
        description="Time-varying autocorrelation, mean PnL, and win rate over rolling windows"
        headerAction={
          rollingCorr?.regime_changes_detected && rollingCorr.regime_changes_detected > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info border border-info/20">
              {rollingCorr.regime_changes_detected} Regime Change{rollingCorr.regime_changes_detected > 1 ? 's' : ''} Detected
            </span>
          )
        }
      >
        {rollingLoading ? (
          <RollingCorrelationChartSkeleton height={400} />
        ) : rollingCorr ? (
          <div className="space-y-4">
            <RollingCorrelationChart data={rollingCorr} height={400} />
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Window Size</span>
                <span className="text-sm font-mono text-foreground">{rollingCorr.window_size} trades</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Windows</span>
                <span className="text-sm font-mono text-foreground">{rollingCorr.n_windows}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block">Current Autocorr</span>
                <span className="text-sm font-mono text-foreground">{formatRatio(rollingCorr.current_autocorr)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{rollingCorr.interpretation}</p>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No rolling correlation data available
          </div>
        )}
      </Panel>
    </div>
  )
}
