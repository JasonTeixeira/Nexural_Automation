'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/format'
import type { DistributionChartData } from '@/lib/types'

interface DistributionChartProps {
  data: DistributionChartData
  height?: number
}

export function DistributionChart({ data, height = 350 }: DistributionChartProps) {
  const chartData = data.bins.map((bin, i) => ({
    bin,
    count: data.counts[i],
    isNegative: bin < 0,
  }))

  // Calculate max count for reference line positioning
  const maxCount = Math.max(...data.counts)

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
            dataKey="bin"
            tickFormatter={(value) => formatCurrency(value, 0)}
            stroke="var(--chart-axis)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
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
              const item = payload[0].payload
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">PnL Range</p>
                  <p className="text-sm font-mono text-foreground">
                    {formatCurrency(item.bin)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Count</p>
                  <p className="text-sm font-mono text-foreground">{item.count} trades</p>
                </div>
              )
            }}
          />
          {/* VaR reference line */}
          <ReferenceLine
            x={data.var_95}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'VaR 95%',
              position: 'top',
              fill: 'var(--warning)',
              fontSize: 10,
            }}
          />
          {/* CVaR reference line */}
          <ReferenceLine
            x={data.cvar_95}
            stroke="var(--loss)"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'CVaR 95%',
              position: 'top',
              fill: 'var(--loss)',
              fontSize: 10,
            }}
          />
          {/* Zero line */}
          <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isNegative ? 'var(--loss)' : 'var(--profit)'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistributionChartSkeleton({ height = 350 }: { height?: number }) {
  return (
    <div
      className="bg-muted/30 rounded-xl animate-pulse"
      style={{ height }}
    />
  )
}
