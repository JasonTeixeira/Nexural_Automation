'use client'

import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { MetricCard, MetricCardSkeleton } from '@/components/metric-card'
import { Panel, PanelSkeleton } from '@/components/panel'
import { formatCurrency, formatPercent, formatRatio, formatNumber } from '@/lib/format'
import type { ComprehensiveMetrics } from '@/lib/types'
import { AlertCircle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

function MetricSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  )
}

function InterpretationBadge({
  text,
  type,
}: {
  text: string
  type: 'positive' | 'negative' | 'neutral' | 'info'
}) {
  const colors = {
    positive: 'bg-profit/10 text-profit border-profit/20',
    negative: 'bg-loss/10 text-loss border-loss/20',
    neutral: 'bg-muted text-muted-foreground border-border',
    info: 'bg-info/10 text-info border-info/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        colors[type]
      )}
    >
      {type === 'positive' && <TrendingUp className="h-3 w-3" />}
      {type === 'negative' && <TrendingDown className="h-3 w-3" />}
      {type === 'neutral' && <Minus className="h-3 w-3" />}
      {type === 'info' && <Info className="h-3 w-3" />}
      {text}
    </span>
  )
}

export default function AdvancedMetricsPage() {
  const { sessionId } = useSession()

  const { data, isLoading, error } = useSWR<ComprehensiveMetrics>(
    sessionId ? `/api/analysis/comprehensive?session_id=${sessionId}` : null,
    fetcher
  )

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Failed to load metrics</p>
          <p className="text-xs text-destructive/70">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Advanced Metrics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive risk-adjusted performance analysis with 71+ institutional-grade metrics
        </p>
      </div>

      {/* Risk-Adjusted Returns */}
      <MetricSection
        title="Risk-Adjusted Returns"
        description="Metrics that account for risk when measuring performance"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Sharpe Ratio"
              value={formatRatio(data?.risk_return.sharpe_ratio ?? 0)}
              valueColor={(data?.risk_return.sharpe_ratio ?? 0) >= 2 ? 'profit' : (data?.risk_return.sharpe_ratio ?? 0) >= 1 ? 'default' : 'loss'}
              tooltip="Excess return per unit of total risk. Above 2.0 is excellent."
            />
            <MetricCard
              label="Sortino Ratio"
              value={formatRatio(data?.risk_return.sortino_ratio ?? 0)}
              valueColor={(data?.risk_return.sortino_ratio ?? 0) >= 2 ? 'profit' : 'default'}
              tooltip="Like Sharpe but only penalizes downside volatility."
            />
            <MetricCard
              label="Calmar Ratio"
              value={formatRatio(data?.risk_return.calmar_ratio ?? 0)}
              valueColor={(data?.risk_return.calmar_ratio ?? 0) >= 3 ? 'profit' : 'default'}
              tooltip="Annualized return divided by maximum drawdown."
            />
            <MetricCard
              label="Omega Ratio"
              value={formatRatio(data?.risk_return.omega_ratio ?? 0)}
              valueColor={(data?.risk_return.omega_ratio ?? 0) >= 2 ? 'profit' : 'default'}
              tooltip="Probability-weighted ratio of gains vs losses."
            />
            <MetricCard
              label="MAR Ratio"
              value={formatRatio(data?.risk_return.mar_ratio ?? 0)}
              tooltip="Return divided by max drawdown (CAGR/MDD)."
            />
            <MetricCard
              label="Tail Ratio"
              value={formatRatio(data?.risk_return.tail_ratio ?? 0)}
              valueColor={(data?.risk_return.tail_ratio ?? 0) >= 1 ? 'profit' : 'loss'}
              tooltip="Right tail vs left tail. Above 1.0 means positive skew."
            />
            <MetricCard
              label="Gain to Pain"
              value={formatRatio(data?.risk_return.gain_to_pain_ratio ?? 0)}
              valueColor={(data?.risk_return.gain_to_pain_ratio ?? 0) >= 1 ? 'profit' : 'default'}
              tooltip="Sum of returns divided by sum of losses."
            />
            <MetricCard
              label="Common Sense Ratio"
              value={formatRatio(data?.risk_return.common_sense_ratio ?? 0)}
              tooltip="Profit factor × tail ratio."
            />
            <MetricCard
              label="CPC Ratio"
              value={formatRatio(data?.risk_return.cpc_ratio ?? 0)}
              tooltip="Profit factor × win rate × payoff ratio."
            />
            <MetricCard
              label="Risk of Ruin"
              value={formatPercent(data?.risk_return.risk_of_ruin ?? 0)}
              valueColor={(data?.risk_return.risk_of_ruin ?? 0) <= 1 ? 'profit' : (data?.risk_return.risk_of_ruin ?? 0) <= 5 ? 'warning' : 'loss'}
              tooltip="Probability of losing all capital. Lower is better."
            />
          </>
        )}
      </MetricSection>

      {/* Edge & Sizing */}
      <MetricSection
        title="Edge & Position Sizing"
        description="Expectancy analysis and optimal position sizing"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Expectancy"
              value={formatCurrency(data?.expectancy.expectancy ?? 0)}
              valueColor={(data?.expectancy.expectancy ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Average expected profit per trade."
            />
            <MetricCard
              label="Expectancy Ratio"
              value={formatRatio(data?.expectancy.expectancy_ratio ?? 0)}
              tooltip="Expectancy as a multiple of average loss."
            />
            <MetricCard
              label="Payoff Ratio"
              value={formatRatio(data?.expectancy.payoff_ratio ?? 0)}
              valueColor={(data?.expectancy.payoff_ratio ?? 0) >= 1.5 ? 'profit' : 'default'}
              tooltip="Average win / average loss."
            />
            <MetricCard
              label="Edge Ratio"
              value={formatRatio(data?.expectancy.edge_ratio ?? 0)}
              tooltip="Statistical edge measure."
            />
            <MetricCard
              label="Kelly %"
              value={formatPercent(data?.expectancy.kelly_pct ?? 0)}
              valueColor={(data?.expectancy.kelly_pct ?? 0) > 0 ? 'profit' : 'loss'}
              tooltip="Optimal bet size from Kelly Criterion."
            />
            <MetricCard
              label="Half Kelly %"
              value={formatPercent(data?.expectancy.half_kelly_pct ?? 0)}
              tooltip="Conservative Kelly sizing (50% Kelly)."
            />
            <MetricCard
              label="Optimal f"
              value={formatPercent(data?.expectancy.optimal_f ?? 0)}
              tooltip="Optimal fixed fraction from Ralph Vince."
            />
          </>
        )}
      </MetricSection>

      {/* Trade Independence */}
      <MetricSection
        title="Trade Independence"
        description="Serial correlation and streak analysis"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <div className="col-span-full">
              <Panel>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                        Z-Score Analysis
                      </span>
                      <InterpretationBadge
                        text={data?.dependency.z_interpretation ?? 'Unknown'}
                        type={
                          data?.dependency.z_interpretation?.toLowerCase().includes('random')
                            ? 'neutral'
                            : data?.dependency.z_interpretation?.toLowerCase().includes('streak')
                            ? 'info'
                            : 'info'
                        }
                      />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-mono font-semibold text-foreground">
                        {formatRatio(data?.dependency.z_score ?? 0)}
                      </span>
                      <span className="text-sm text-muted-foreground">z-score</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
                      Serial Correlation
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-mono font-semibold text-foreground">
                        {formatRatio(data?.dependency.serial_correlation ?? 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (p={formatRatio(data?.dependency.serial_p_value ?? 0)})
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
            <MetricCard
              label="Max Win Streak"
              value={formatNumber(data?.dependency.streak_max_wins ?? 0, 0)}
              valueColor="profit"
              tooltip="Maximum consecutive winning trades."
            />
            <MetricCard
              label="Max Loss Streak"
              value={formatNumber(data?.dependency.streak_max_losses ?? 0, 0)}
              valueColor="loss"
              tooltip="Maximum consecutive losing trades."
            />
            <MetricCard
              label="Avg Win Streak"
              value={formatNumber(data?.dependency.streak_avg_wins ?? 0, 1)}
              tooltip="Average consecutive winning trades."
            />
            <MetricCard
              label="Avg Loss Streak"
              value={formatNumber(data?.dependency.streak_avg_losses ?? 0, 1)}
              tooltip="Average consecutive losing trades."
            />
          </>
        )}
      </MetricSection>

      {/* Distribution Statistics */}
      <MetricSection
        title="Distribution Statistics"
        description="PnL distribution analysis and normality testing"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Mean PnL"
              value={formatCurrency(data?.distribution.mean ?? 0)}
              valueColor={(data?.distribution.mean ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Average profit/loss per trade."
            />
            <MetricCard
              label="Median PnL"
              value={formatCurrency(data?.distribution.median ?? 0)}
              valueColor={(data?.distribution.median ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Middle value of all PnLs."
            />
            <MetricCard
              label="Std Deviation"
              value={formatCurrency(data?.distribution.std ?? 0)}
              tooltip="Volatility of trade PnLs."
            />
            <MetricCard
              label="Skewness"
              value={formatRatio(data?.distribution.skewness ?? 0)}
              valueColor={(data?.distribution.skewness ?? 0) > 0 ? 'profit' : 'default'}
              tooltip="Positive = right tail. Negative = left tail."
            />
            <MetricCard
              label="Kurtosis"
              value={formatRatio(data?.distribution.kurtosis ?? 0)}
              tooltip="High = fat tails. Low = thin tails."
            />
            <MetricCard
              label="VaR (95%)"
              value={formatCurrency(data?.distribution.var_95 ?? 0)}
              valueColor="loss"
              tooltip="Value at Risk: worst expected loss 5% of time."
            />
            <MetricCard
              label="CVaR (95%)"
              value={formatCurrency(data?.distribution.cvar_95 ?? 0)}
              valueColor="loss"
              tooltip="Expected loss given VaR is breached."
            />
            <div className="col-span-full md:col-span-2 lg:col-span-3">
              <Panel>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      Jarque-Bera Test
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-mono font-semibold text-foreground">
                        {formatNumber(data?.distribution.jarque_bera_stat ?? 0, 2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (p={formatRatio(data?.distribution.jarque_bera_p ?? 0)})
                      </span>
                    </div>
                  </div>
                  <InterpretationBadge
                    text={data?.distribution.is_normal ? 'Normal Distribution' : 'Non-Normal Distribution'}
                    type={data?.distribution.is_normal ? 'neutral' : 'info'}
                  />
                </div>
              </Panel>
            </div>
          </>
        )}
      </MetricSection>

      {/* Edge Stability / Time Decay */}
      <MetricSection
        title="Edge Stability"
        description="Analysis of performance degradation over time"
      >
        {isLoading ? (
          <PanelSkeleton className="col-span-full" height={120} />
        ) : (
          <div className="col-span-full">
            <Panel>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      Time Decay Analysis
                    </span>
                    <InterpretationBadge
                      text={data?.time_decay.is_decaying ? 'Decaying' : 'Stable'}
                      type={data?.time_decay.is_decaying ? 'negative' : 'positive'}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data?.time_decay.decay_interpretation}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      Sharpe Slope
                    </div>
                    <span className={cn(
                      'text-lg font-mono font-semibold',
                      (data?.time_decay.sharpe_slope ?? 0) >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {formatRatio(data?.time_decay.sharpe_slope ?? 0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      Sharpe R²
                    </div>
                    <span className="text-lg font-mono font-semibold text-foreground">
                      {formatRatio(data?.time_decay.sharpe_r_squared ?? 0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      PnL Slope
                    </div>
                    <span className={cn(
                      'text-lg font-mono font-semibold',
                      (data?.time_decay.pnl_slope ?? 0) >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {formatCurrency(data?.time_decay.pnl_slope ?? 0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
                      Windows
                    </div>
                    <span className="text-lg font-mono font-semibold text-foreground">
                      {data?.time_decay.n_windows ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </MetricSection>

      {/* Institutional Metrics */}
      <MetricSection
        title="Institutional Metrics"
        description="Professional-grade performance indicators"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Recovery Factor"
              value={formatRatio(data?.institutional.recovery_factor ?? 0)}
              valueColor={(data?.institutional.recovery_factor ?? 0) >= 10 ? 'profit' : 'default'}
              tooltip="Net profit / max drawdown."
            />
            <MetricCard
              label="Time Underwater"
              value={formatPercent(data?.institutional.time_under_water_pct ?? 0)}
              valueColor={(data?.institutional.time_under_water_pct ?? 0) <= 20 ? 'profit' : 'warning'}
              tooltip="Percentage of time in drawdown."
            />
            <MetricCard
              label="Profit/Day"
              value={formatCurrency(data?.institutional.profit_per_day ?? 0)}
              valueColor={(data?.institutional.profit_per_day ?? 0) >= 0 ? 'profit' : 'loss'}
              tooltip="Average daily profit."
            />
            <MetricCard
              label="Trades/Day"
              value={formatNumber(data?.institutional.trade_frequency_per_day ?? 0, 1)}
              tooltip="Average trades per trading day."
            />
            <MetricCard
              label="Max Cons. Wins"
              value={formatNumber(data?.institutional.max_consecutive_wins ?? 0, 0)}
              valueColor="profit"
              tooltip="Maximum consecutive winners."
            />
            <MetricCard
              label="Max Cons. Losses"
              value={formatNumber(data?.institutional.max_consecutive_losses ?? 0, 0)}
              valueColor="loss"
              tooltip="Maximum consecutive losers."
            />
            <MetricCard
              label="Max Cons. Loss $"
              value={formatCurrency(data?.institutional.max_consecutive_loss_amount ?? 0)}
              valueColor="loss"
              tooltip="Dollar loss during max losing streak."
            />
            <MetricCard
              label="DD Duration"
              value={`${data?.institutional.max_drawdown_duration_trades ?? 0} trades`}
              tooltip="Longest drawdown in number of trades."
            />
          </>
        )}
      </MetricSection>
    </div>
  )
}
