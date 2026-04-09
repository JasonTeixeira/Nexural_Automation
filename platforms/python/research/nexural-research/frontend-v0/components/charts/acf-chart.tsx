'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import type { ACFResult } from '@/lib/types'

interface ACFChartProps {
  data: ACFResult
  height?: number
}

export function ACFChart({ data, height = 300 }: ACFChartProps) {
  const chartData = data.lags.map((lag, i) => ({
    lag,
    autocorrelation: data.autocorrelations[i],
    isSignificant: data.significant_lags.includes(lag),
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="lag"
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Lag', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'var(--chart-axis)' }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0].payload
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">Lag {item.lag}</p>
                  <p className="text-sm font-mono text-foreground">
                    ACF: {item.autocorrelation.toFixed(4)}
                  </p>
                  {item.isSignificant && (
                    <p className="text-xs text-loss mt-1">Significant</p>
                  )}
                </div>
              )
            }}
          />
          <ReferenceLine
            y={data.confidence_bound}
            stroke="var(--chart-3)"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={-data.confidence_bound}
            stroke="var(--chart-3)"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="autocorrelation" maxBarSize={20}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSignificant ? 'var(--chart-3)' : 'var(--chart-1)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ACFChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-muted/30 rounded-xl animate-pulse"
      style={{ height }}
    />
  )
}
