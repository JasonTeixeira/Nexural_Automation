'use client'

import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/format'
import { type EquityChartData } from '@/lib/types'

interface EquityChartProps {
  data: EquityChartData
  height?: number
  showTradePnL?: boolean
}

export function EquityChart({ data, height = 400, showTradePnL = true }: EquityChartProps) {
  // Transform data for Recharts
  const chartData = data.timestamps.map((timestamp, i) => ({
    date: timestamp,
    equity: data.equity[i],
    drawdown: data.drawdown[i],
    tradePnL: data.trade_pnl[i],
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="equity"
            orientation="left"
            tickFormatter={(value) => formatCurrency(value, 0)}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <YAxis
            yAxisId="drawdown"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={50}
            domain={['dataMin', 0]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatDate(label)}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">Equity</span>
                      <span className="text-sm font-mono text-chart-1">
                        {formatCurrency(payload[0]?.value as number)}
                      </span>
                    </div>
                    {payload[1] && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground">Drawdown</span>
                        <span className="text-sm font-mono text-chart-3">
                          {(payload[1]?.value as number).toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {showTradePnL && payload[2] && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground">Trade P&L</span>
                        <span
                          className={`text-sm font-mono ${
                            (payload[2]?.value as number) >= 0
                              ? 'text-profit'
                              : 'text-loss'
                          }`}
                        >
                          {formatCurrency(payload[2]?.value as number)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            }}
          />
          <ReferenceLine yAxisId="drawdown" y={0} stroke="var(--border)" />
          <Area
            yAxisId="equity"
            type="monotone"
            dataKey="equity"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
          <Area
            yAxisId="drawdown"
            type="monotone"
            dataKey="drawdown"
            stroke="var(--chart-3)"
            strokeWidth={1.5}
            fill="url(#drawdownGradient)"
          />
          {showTradePnL && (
            <Bar
              yAxisId="equity"
              dataKey="tradePnL"
              fill="var(--chart-2)"
              opacity={0.5}
              maxBarSize={4}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Skeleton
export function EquityChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div
      className="bg-surface rounded-xl border border-border animate-pulse"
      style={{ height }}
    >
      <div className="h-full w-full bg-muted/30 rounded-xl" />
    </div>
  )
}
