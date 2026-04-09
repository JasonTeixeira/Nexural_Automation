'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { useSession } from '@/lib/session-context'
import { fetcher } from '@/lib/api'
import { MetricCard, MetricCardSkeleton } from '@/components/metric-card'
import { Panel, PanelSkeleton } from '@/components/panel'
import { GradeBadge, GradeBadgeSkeleton } from '@/components/grade-badge'
import { EquityChart, EquityChartSkeleton } from '@/components/charts/equity-chart'
import { formatCurrency, formatPercent, formatRatio, formatNumber } from '@/lib/format'
import type {
  BasicMetrics,
  RiskReturnMetrics,
  ExpectancyMetrics,
  InstitutionalMetrics,
  EquityChartData,
  ImprovementsResult,
} from '@/lib/types'

export default function OverviewPage() {
  const { sessionId, currentSession, updateSessionMetrics } = useSession()

  // Fetch all data in parallel
  const { data: metricsData, isLoading: metricsLoading } = useSWR<{ metrics: BasicMetrics }>(
    sessionId ? `/api/analysis/metrics?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: riskReturn, isLoading: riskLoading } = useSWR<RiskReturnMetrics>(
    sessionId ? `/api/analysis/risk-return?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: expectancy, isLoading: expectLoading } = useSWR<ExpectancyMetrics>(
    sessionId ? `/api/analysis/expectancy?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: institutional, isLoading: instLoading } = useSWR<InstitutionalMetrics>(
    sessionId ? `/api/analysis/institutional?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: equityData, isLoading: equityLoading } = useSWR<EquityChartData>(
    sessionId ? `/api/charts/equity?session_id=${sessionId}` : null,
    fetcher
  )

  const { data: improvements, isLoading: improvementsLoading } = useSWR<ImprovementsResult>(
    sessionId ? `/api/analysis/improvements?session_id=${sessionId}` : null,
    fetcher
  )

  const metrics = metricsData?.metrics
  const isLoading = metricsLoading || riskLoading || expectLoading || instLoading

  // Sync backend data to session context for AI access
  useEffect(() => {
    if (!isLoading && metrics && riskReturn && expectancy && institutional) {
      updateSessionMetrics({
        netProfit: metrics.net_profit,
        totalTrades: metrics.total_trades,
        winRate: metrics.win_rate,
        profitFactor: metrics.profit_factor,
        maxDrawdown: metrics.max_drawdown,
        maxDrawdownPercent: metrics.max_drawdown_pct,
        sharpeRatio: riskReturn.sharpe_ratio,
        sortinoRatio: riskReturn.sortino_ratio,
        calmarRatio: riskReturn.calmar_ratio,
        omegaRatio: riskReturn.omega_ratio,
        avgWinner: metrics.avg_winner,
        avgLoser: metrics.avg_loser,
        largestWinner: metrics.largest_winner,
        largestLoser: metrics.largest_loser,
        avgTrade: expectancy.expectancy,
        expectancy: expectancy.expectancy,
        kellyPercent: expectancy.kelly_pct,
        payoffRatio: expectancy.payoff_ratio,
        recoveryFactor: institutional.recovery_factor,
        tradesPerDay: institutional.trade_frequency_per_day,
        profitPerDay: institutional.profit_per_day,
        timeUnderWater: institutional.time_under_water_pct,
        maxConsecutiveLosses: institutional.max_consecutive_losses,
        cagr: institutional.cagr,
        var95: institutional.var_95,
        cvar95: institutional.cvar_95,
      })
    }
  }, [isLoading, metrics, riskReturn, expectancy, institutional, updateSessionMetrics])

  return (
    <div className="space-y-6">
      {/* Header Row with Grade and Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Grade */}
        <div className="col-span-2 md:col-span-1 bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
          {improvementsLoading ? (
            <GradeBadgeSkeleton size="xl" />
          ) : improvements ? (
            <>
              <GradeBadge grade={improvements.grade} size="xl" />
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block">
                  Strategy Grade
                </span>
                <span className="text-sm text-muted-foreground">
                  Score: {improvements.score}/100
                </span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No grade data</div>
          )}
        </div>

        {/* Net Profit */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Net Profit"
            value={formatCurrency(metrics?.net_profit ?? 0)}
            valueColor={(metrics?.net_profit ?? 0) >= 0 ? 'profit' : 'loss'}
            tooltip="Total profit after all losses and commissions"
          />
        )}

        {/* Sharpe Ratio */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Sharpe Ratio"
            value={formatRatio(riskReturn?.sharpe_ratio ?? 0)}
            valueColor={(riskReturn?.sharpe_ratio ?? 0) >= 2 ? 'profit' : (riskReturn?.sharpe_ratio ?? 0) >= 1 ? 'default' : 'loss'}
            tooltip="Risk-adjusted return. Above 2.0 is excellent, above 1.0 is good"
          />
        )}

        {/* Win Rate */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Win Rate"
            value={formatPercent(metrics?.win_rate ?? 0)}
            valueColor={(metrics?.win_rate ?? 0) >= 60 ? 'profit' : (metrics?.win_rate ?? 0) >= 50 ? 'default' : 'loss'}
            tooltip="Percentage of winning trades"
          />
        )}

        {/* Profit Factor */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Profit Factor"
            value={formatRatio(metrics?.profit_factor ?? 0)}
            valueColor={(metrics?.profit_factor ?? 0) >= 2 ? 'profit' : (metrics?.profit_factor ?? 0) >= 1.5 ? 'default' : 'loss'}
            tooltip="Gross profit divided by gross loss. Above 2.0 is excellent"
          />
        )}

        {/* Max Drawdown */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Max Drawdown"
            value={formatCurrency(metrics?.max_drawdown ?? 0)}
            valueColor="loss"
            tooltip="Maximum peak-to-trough decline in equity"
          />
        )}

        {/* Total Trades */}
        {isLoading ? (
          <MetricCardSkeleton />
        ) : (
          <MetricCard
            label="Total Trades"
            value={formatNumber(metrics?.total_trades ?? 0, 0)}
            tooltip="Total number of completed trades"
          />
        )}
      </div>

      {/* Equity Curve */}
      <Panel title="Equity Curve" description="Account balance over time with drawdown overlay">
        {equityLoading ? (
          <EquityChartSkeleton height={400} />
        ) : equityData ? (
          <EquityChart data={equityData} height={400} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No equity data available
          </div>
        )}
      </Panel>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Expectancy */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Expectancy"
            value={`${formatCurrency(expectancy?.expectancy ?? 0)}/trade`}
            valueColor={(expectancy?.expectancy ?? 0) >= 0 ? 'profit' : 'loss'}
            tooltip="Average profit or loss per trade"
            size="sm"
          />
        )}

        {/* Kelly % */}
        {expectLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Kelly %"
            value={formatPercent(expectancy?.kelly_pct ?? 0)}
            tooltip="Optimal position size based on Kelly Criterion"
            size="sm"
          />
        )}

        {/* Recovery Factor */}
        {instLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Recovery Factor"
            value={formatRatio(institutional?.recovery_factor ?? 0)}
            valueColor={(institutional?.recovery_factor ?? 0) >= 10 ? 'profit' : 'default'}
            tooltip="Net profit divided by max drawdown. Higher is better"
            size="sm"
          />
        )}

        {/* Sortino */}
        {riskLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Sortino Ratio"
            value={formatRatio(riskReturn?.sortino_ratio ?? 0)}
            valueColor={(riskReturn?.sortino_ratio ?? 0) >= 2 ? 'profit' : 'default'}
            tooltip="Like Sharpe, but only penalizes downside volatility"
            size="sm"
          />
        )}

        {/* Calmar */}
        {riskLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Calmar Ratio"
            value={formatRatio(riskReturn?.calmar_ratio ?? 0)}
            valueColor={(riskReturn?.calmar_ratio ?? 0) >= 3 ? 'profit' : 'default'}
            tooltip="Annualized return divided by max drawdown"
            size="sm"
          />
        )}

        {/* Omega */}
        {riskLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Omega Ratio"
            value={formatRatio(riskReturn?.omega_ratio ?? 0)}
            valueColor={(riskReturn?.omega_ratio ?? 0) >= 2 ? 'profit' : 'default'}
            tooltip="Probability-weighted ratio of gains to losses"
            size="sm"
          />
        )}
      </div>

      {/* Tertiary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Trades Per Day */}
        {instLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Trades/Day"
            value={formatNumber(institutional?.trade_frequency_per_day ?? 0, 1)}
            tooltip="Average number of trades per day"
            size="sm"
          />
        )}

        {/* Time Under Water */}
        {instLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Time Underwater"
            value={formatPercent(institutional?.time_under_water_pct ?? 0)}
            valueColor={(institutional?.time_under_water_pct ?? 0) <= 20 ? 'profit' : (institutional?.time_under_water_pct ?? 0) <= 40 ? 'warning' : 'loss'}
            tooltip="Percentage of time spent in drawdown"
            size="sm"
          />
        )}

        {/* Max Consecutive Losses */}
        {instLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Max Con. Losses"
            value={formatNumber(institutional?.max_consecutive_losses ?? 0, 0)}
            valueColor={(institutional?.max_consecutive_losses ?? 0) <= 5 ? 'default' : 'warning'}
            tooltip="Maximum consecutive losing trades"
            size="sm"
          />
        )}

        {/* Avg Winner */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Avg Winner"
            value={formatCurrency(metrics?.avg_winner ?? 0)}
            valueColor="profit"
            tooltip="Average profit per winning trade"
            size="sm"
          />
        )}

        {/* Avg Loser */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Avg Loser"
            value={formatCurrency(metrics?.avg_loser ?? 0)}
            valueColor="loss"
            tooltip="Average loss per losing trade"
            size="sm"
          />
        )}

        {/* Payoff Ratio */}
        {expectLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Payoff Ratio"
            value={formatRatio(expectancy?.payoff_ratio ?? 0)}
            valueColor={(expectancy?.payoff_ratio ?? 0) >= 1.5 ? 'profit' : 'default'}
            tooltip="Average winner divided by average loser"
            size="sm"
          />
        )}
      </div>

      {/* Bottom Row - Trade Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Largest Winner */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Largest Winner"
            value={formatCurrency(metrics?.largest_winner ?? 0)}
            valueColor="profit"
            tooltip="Single most profitable trade"
            size="sm"
          />
        )}

        {/* Largest Loser */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Largest Loser"
            value={formatCurrency(metrics?.largest_loser ?? 0)}
            valueColor="loss"
            tooltip="Single most unprofitable trade"
            size="sm"
          />
        )}

        {/* Profit Per Day */}
        {instLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Profit/Day"
            value={formatCurrency(institutional?.profit_per_day ?? 0)}
            valueColor={(institutional?.profit_per_day ?? 0) >= 0 ? 'profit' : 'loss'}
            tooltip="Average daily profit"
            size="sm"
          />
        )}

        {/* Max Drawdown % */}
        {isLoading ? (
          <MetricCardSkeleton size="sm" />
        ) : (
          <MetricCard
            label="Max DD %"
            value={formatPercent(metrics?.max_drawdown_pct ?? 0)}
            valueColor="loss"
            tooltip="Maximum drawdown as percentage of peak equity"
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
