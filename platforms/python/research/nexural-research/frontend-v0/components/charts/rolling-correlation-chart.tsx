'use client'

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { RollingCorrelationResult } from '@/lib/types'

interface RollingCorrelationChartProps {
  data: RollingCorrelationResult
  height?: number
}

export function RollingCorrelationChart({ data, height = 400 }: RollingCorrelationChartProps) {
  const chartData = data.timestamps.map((timestamp, i) => ({
    date: timestamp,
    autocorr: data.rolling_autocorr[i],
    meanPnl: data.rolling_mean_pnl[i],
    winRate: data.rolling_win_rate[i] * 100,
    volatility: data.rolling_volatility[i],
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="meanPnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
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
            yAxisId="autocorr"
            orientation="left"
            domain={[-1, 1]}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <YAxis
            yAxisId="pnl"
            orientation="right"
            tickFormatter={(value) => formatCurrency(value, 0)}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(label).toLocaleDateString()}
                  </p>
                  <div className="space-y-1">
                    {payload.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span
                          className="text-xs flex items-center gap-1.5"
                          style={{ color: entry.color }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}
                        </span>
                        <span className="text-sm font-mono text-foreground">
                          {entry.name === 'Mean PnL'
                            ? formatCurrency(entry.value as number)
                            : entry.name === 'Win Rate'
                            ? formatPercent(entry.value as number)
                            : (entry.value as number).toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <ReferenceLine yAxisId="autocorr" y={0} stroke="var(--border)" />
          <Area
            yAxisId="pnl"
            type="monotone"
            dataKey="meanPnl"
            name="Mean PnL"
            stroke="var(--chart-2)"
            fill="url(#meanPnlGradient)"
            strokeWidth={2}
          />
          <Line
            yAxisId="autocorr"
            type="monotone"
            dataKey="autocorr"
            name="Autocorrelation"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="autocorr"
            type="monotone"
            dataKey="winRate"
            name="Win Rate"
            stroke="var(--chart-4)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RollingCorrelationChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div
      className="bg-muted/30 rounded-xl animate-pulse"
      style={{ height }}
    />
  )
}
