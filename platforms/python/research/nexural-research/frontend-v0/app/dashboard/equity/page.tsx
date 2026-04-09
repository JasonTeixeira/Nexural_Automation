'use client'

import { useSession } from '@/lib/session-context'
import { Panel } from '@/components/panel'
import { MetricCard } from '@/components/metric-card'
import { formatPercent, formatCurrency, formatNumber } from '@/lib/format'
import { LineChart, TrendingUp, TrendingDown, Activity, Calendar, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useMemo, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend,
  Line,
  ComposedChart,
} from 'recharts'

interface EquityData {
  dates: string[]
  equity: number[]
  benchmark?: number[]
  drawdown: number[]
  underwater_days: number[]
  peak_equity: number
  current_equity: number
  max_drawdown: number
  max_drawdown_duration: number
  avg_drawdown: number
  recovery_factor: number
}

export default function EquityPage() {
  const { sessionId } = useSession()
  const { data, error, isLoading } = useSWR<EquityData>(
    sessionId ? `/api/charts/equity?session_id=${sessionId}` : null,
    fetcher
  )

  const [showBenchmark, setShowBenchmark] = useState(true)
  const [showDrawdown, setShowDrawdown] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(100)

  // Process chart data
  const chartData = useMemo(() => {
    if (!data?.dates) return []
    return data.dates.map((date, i) => ({
      date,
      equity: data.equity[i],
      benchmark: data.benchmark?.[i],
      drawdown: data.drawdown[i] * 100, // Convert to percentage
      underwaterDays: data.underwater_days[i],
    }))
  }, [data])

  // Calculate additional stats
  const stats = useMemo(() => {
    if (!data?.equity || data.equity.length === 0) return null
    
    const returns = []
    for (let i = 1; i < data.equity.length; i++) {
      returns.push((data.equity[i] - data.equity[i-1]) / data.equity[i-1])
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    const sharpe = avgReturn / stdDev * Math.sqrt(252)
    
    const positiveReturns = returns.filter(r => r > 0)
    const negativeReturns = returns.filter(r => r < 0)
    
    const avgWin = positiveReturns.length > 0 
      ? positiveReturns.reduce((a, b) => a + b, 0) / positiveReturns.length
      : 0
    const avgLoss = negativeReturns.length > 0 
      ? Math.abs(negativeReturns.reduce((a, b) => a + b, 0) / negativeReturns.length)
      : 0
    
    const totalReturn = (data.current_equity - data.equity[0]) / data.equity[0]
    
    return {
      totalReturn,
      sharpe,
      avgDailyReturn: avgReturn,
      volatility: stdDev * Math.sqrt(252),
      avgWin,
      avgLoss,
      winRate: positiveReturns.length / returns.length,
      payoffRatio: avgLoss > 0 ? avgWin / avgLoss : 0,
    }
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
        <div className="text-xs text-muted-foreground mb-2">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm capitalize">{entry.name}</span>
            </div>
            <span className="text-sm font-mono font-medium">
              {entry.name === 'drawdown' 
                ? formatPercent(entry.value / 100)
                : formatCurrency(entry.value)
              }
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Strategy Loaded</h2>
          <p className="text-sm text-muted-foreground">Upload a CSV file to view equity curve</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equity Curve</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portfolio value over time with drawdown analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={showBenchmark ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowBenchmark(!showBenchmark)}
          >
            Benchmark
          </Button>
          <Button 
            variant={showDrawdown ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowDrawdown(!showDrawdown)}
          >
            Drawdown
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <MetricCard
            label="Total Return"
            value={formatPercent(stats.totalReturn)}
            status={stats.totalReturn >= 0 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Peak Equity"
            value={formatCurrency(data.peak_equity)}
          />
          <MetricCard
            label="Current Equity"
            value={formatCurrency(data.current_equity)}
            status={data.current_equity >= data.peak_equity ? 'positive' : 'warning'}
          />
          <MetricCard
            label="Max Drawdown"
            value={formatPercent(data.max_drawdown)}
            status="negative"
          />
          <MetricCard
            label="Avg Drawdown"
            value={formatPercent(data.avg_drawdown)}
            status="warning"
          />
          <MetricCard
            label="Recovery Factor"
            value={formatNumber(data.recovery_factor, 2)}
            tooltip="Net profit divided by max drawdown"
          />
          <MetricCard
            label="Win Rate"
            value={formatPercent(stats.winRate)}
            status={stats.winRate >= 0.5 ? 'positive' : 'warning'}
          />
          <MetricCard
            label="Sharpe (Est.)"
            value={formatNumber(stats.sharpe, 2)}
            status={stats.sharpe >= 1 ? 'positive' : stats.sharpe >= 0.5 ? 'neutral' : 'negative'}
          />
        </div>
      )}

      {/* Main Equity Chart */}
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Equity Growth</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[400px] bg-muted/30 rounded animate-pulse" />
        ) : error ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Failed to load equity data
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                  }}
                />
                <YAxis 
                  yAxisId="equity"
                  orientation="left"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="drawdown"
                  orientation="right"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  domain={['dataMin - 5', 0]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  formatter={(value) => <span className="text-xs capitalize">{value}</span>}
                />
                
                {showBenchmark && data?.benchmark && (
                  <Area
                    yAxisId="equity"
                    type="monotone"
                    dataKey="benchmark"
                    stroke="hsl(var(--muted-foreground))"
                    fill="url(#benchmarkGradient)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    name="Benchmark (SPY)"
                  />
                )}
                
                <Area
                  yAxisId="equity"
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                  name="Strategy"
                />
                
                {showDrawdown && (
                  <Area
                    yAxisId="drawdown"
                    type="monotone"
                    dataKey="drawdown"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    name="Drawdown"
                  />
                )}
                
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="hsl(var(--border))"
                  fill="hsl(var(--muted))"
                  tickFormatter={(value) => ''}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Drawdown Analysis */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <h3 className="text-sm font-medium mb-4">Drawdown Periods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Maximum Drawdown</span>
                <span className="font-mono text-sm font-medium text-loss">{formatPercent(data.max_drawdown)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Max DD Duration</span>
                <span className="font-mono text-sm font-medium">{data.max_drawdown_duration} days</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Average Drawdown</span>
                <span className="font-mono text-sm font-medium text-warning">{formatPercent(data.avg_drawdown)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Recovery Factor</span>
                <span className="font-mono text-sm font-medium">{formatNumber(data.recovery_factor, 2)}x</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <h3 className="text-sm font-medium mb-4">Performance Metrics</h3>
            <div className="space-y-3">
              {stats && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Avg Daily Return</span>
                    <span className={`font-mono text-sm font-medium ${stats.avgDailyReturn >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatPercent(stats.avgDailyReturn)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Annualized Volatility</span>
                    <span className="font-mono text-sm font-medium">{formatPercent(stats.volatility)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Avg Win</span>
                    <span className="font-mono text-sm font-medium text-profit">{formatPercent(stats.avgWin)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Payoff Ratio</span>
                    <span className="font-mono text-sm font-medium">{formatNumber(stats.payoffRatio, 2)}x</span>
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
