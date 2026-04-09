'use client'

import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/skeletons'
import { ChartErrorBoundary } from '@/components/error-boundary'
import type { Data, Layout, Config } from 'plotly.js'

// Lazy load Plotly to reduce initial bundle size
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <ChartSkeleton height={400} />,
})

// Design system chart theme
const chartTheme: Partial<Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: {
    family: 'Inter, system-ui, sans-serif',
    size: 11,
    color: '#6b7280',
  },
  margin: { t: 30, r: 20, b: 40, l: 50 },
  xaxis: {
    gridcolor: 'rgba(255, 255, 255, 0.04)',
    linecolor: 'rgba(255, 255, 255, 0.08)',
    tickcolor: 'transparent',
    zerolinecolor: 'rgba(255, 255, 255, 0.08)',
  },
  yaxis: {
    gridcolor: 'rgba(255, 255, 255, 0.04)',
    linecolor: 'rgba(255, 255, 255, 0.08)',
    tickcolor: 'transparent',
    zerolinecolor: 'rgba(255, 255, 255, 0.08)',
  },
  hoverlabel: {
    bgcolor: '#1a1a25',
    bordercolor: 'rgba(255, 255, 255, 0.1)',
    font: { color: '#f5f5f5', size: 12 },
  },
  legend: {
    bgcolor: 'transparent',
    font: { color: '#6b7280', size: 11 },
    orientation: 'h',
    y: 1.05,
  },
}

const defaultConfig: Partial<Config> = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  displaylogo: false,
  responsive: true,
  scrollZoom: true,
}

interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  style?: React.CSSProperties
  className?: string
  onInitialized?: (figure: any, graphDiv: HTMLElement) => void
  onUpdate?: (figure: any, graphDiv: HTMLElement) => void
}

export function PlotlyChart({
  data,
  layout,
  config,
  style,
  className,
  onInitialized,
  onUpdate,
}: PlotlyChartProps) {
  const mergedLayout: Partial<Layout> = {
    ...chartTheme,
    ...layout,
    xaxis: { ...chartTheme.xaxis, ...layout?.xaxis },
    yaxis: { ...chartTheme.yaxis, ...layout?.yaxis },
  }

  const mergedConfig: Partial<Config> = {
    ...defaultConfig,
    ...config,
  }

  return (
    <ChartErrorBoundary>
      <Plot
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        style={{ width: '100%', height: '100%', ...style }}
        className={className}
        onInitialized={onInitialized}
        onUpdate={onUpdate}
        useResizeHandler
      />
    </ChartErrorBoundary>
  )
}

// Pre-configured equity chart
interface EquityChartData {
  dates: string[]
  equity: number[]
  benchmark?: number[]
  drawdown?: number[]
}

export function PlotlyEquityChart({
  data,
  showBenchmark = true,
  showDrawdown = true,
  height = 400,
}: {
  data: EquityChartData
  showBenchmark?: boolean
  showDrawdown?: boolean
  height?: number
}) {
  const traces: Data[] = [
    {
      name: 'Strategy',
      x: data.dates,
      y: data.equity,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#3b82f6', width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(59, 130, 246, 0.1)',
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra>Strategy</extra>',
    },
  ]

  if (showBenchmark && data.benchmark) {
    traces.push({
      name: 'Benchmark (SPY)',
      x: data.dates,
      y: data.benchmark,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#6b7280', width: 1, dash: 'dash' },
      hovertemplate: '%{x}<br>$%{y:,.0f}<extra>Benchmark</extra>',
    })
  }

  const layout: Partial<Layout> = {
    height,
    showlegend: true,
    hovermode: 'x unified',
    xaxis: {
      type: 'date',
      rangeslider: { visible: true, thickness: 0.05 },
      rangeselector: {
        buttons: [
          { count: 1, label: '1M', step: 'month', stepmode: 'backward' },
          { count: 3, label: '3M', step: 'month', stepmode: 'backward' },
          { count: 6, label: '6M', step: 'month', stepmode: 'backward' },
          { count: 1, label: 'YTD', step: 'year', stepmode: 'todate' },
          { count: 1, label: '1Y', step: 'year', stepmode: 'backward' },
          { step: 'all', label: 'All' },
        ],
        bgcolor: '#1a1a25',
        activecolor: '#3b82f6',
        font: { color: '#f5f5f5', size: 10 },
      },
    },
    yaxis: {
      title: { text: 'Portfolio Value ($)', font: { size: 11, color: '#6b7280' } },
      tickformat: '$,.0f',
    },
  }

  return <PlotlyChart data={traces} layout={layout} />
}

// Monte Carlo fan chart
interface MonteCarloData {
  dates: string[]
  median: number[]
  p5: number[]
  p25: number[]
  p75: number[]
  p95: number[]
  actual?: number[]
}

export function PlotlyMonteCarloChart({
  data,
  height = 400,
}: {
  data: MonteCarloData
  height?: number
}) {
  const traces: Data[] = [
    // 95% confidence band
    {
      name: '95% CI',
      x: [...data.dates, ...data.dates.slice().reverse()],
      y: [...data.p95, ...data.p5.slice().reverse()],
      fill: 'toself',
      fillcolor: 'rgba(59, 130, 246, 0.1)',
      line: { color: 'transparent' },
      type: 'scatter',
      hoverinfo: 'skip',
      showlegend: true,
    },
    // 50% confidence band
    {
      name: '50% CI',
      x: [...data.dates, ...data.dates.slice().reverse()],
      y: [...data.p75, ...data.p25.slice().reverse()],
      fill: 'toself',
      fillcolor: 'rgba(59, 130, 246, 0.2)',
      line: { color: 'transparent' },
      type: 'scatter',
      hoverinfo: 'skip',
      showlegend: true,
    },
    // Median line
    {
      name: 'Median',
      x: data.dates,
      y: data.median,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#3b82f6', width: 2 },
      hovertemplate: '%{x}<br>Median: $%{y:,.0f}<extra></extra>',
    },
  ]

  if (data.actual) {
    traces.push({
      name: 'Actual',
      x: data.dates,
      y: data.actual,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#10b981', width: 2 },
      hovertemplate: '%{x}<br>Actual: $%{y:,.0f}<extra></extra>',
    })
  }

  const layout: Partial<Layout> = {
    height,
    showlegend: true,
    hovermode: 'x unified',
    yaxis: {
      title: { text: 'Portfolio Value ($)', font: { size: 11, color: '#6b7280' } },
      tickformat: '$,.0f',
    },
  }

  return <PlotlyChart data={traces} layout={layout} />
}

// Heatmap chart
export function PlotlyHeatmap({
  data,
  xLabels,
  yLabels,
  colorscale = 'RdYlGn',
  title,
  height = 400,
}: {
  data: number[][]
  xLabels: string[]
  yLabels: string[]
  colorscale?: string
  title?: string
  height?: number
}) {
  const traces: Data[] = [
    {
      type: 'heatmap',
      z: data,
      x: xLabels,
      y: yLabels,
      colorscale,
      hovertemplate: '%{x} %{y}<br>Return: %{z:.1%}<extra></extra>',
      colorbar: {
        title: { text: 'Return %', font: { size: 10, color: '#6b7280' } },
        tickformat: '.0%',
        tickfont: { size: 10, color: '#6b7280' },
      },
    },
  ]

  const layout: Partial<Layout> = {
    height,
    title: title ? { text: title, font: { size: 14, color: '#f5f5f5' } } : undefined,
    xaxis: { tickangle: -45 },
  }

  return <PlotlyChart data={traces} layout={layout} />
}

// Distribution chart with histogram and KDE
export function PlotlyDistribution({
  values,
  bins = 50,
  showKDE = true,
  title,
  height = 300,
}: {
  values: number[]
  bins?: number
  showKDE?: boolean
  title?: string
  height?: number
}) {
  const traces: Data[] = [
    {
      type: 'histogram',
      x: values,
      nbinsx: bins,
      name: 'Distribution',
      marker: {
        color: 'rgba(59, 130, 246, 0.6)',
        line: { color: '#3b82f6', width: 1 },
      },
      hovertemplate: 'Return: %{x:.2%}<br>Count: %{y}<extra></extra>',
    },
  ]

  const layout: Partial<Layout> = {
    height,
    title: title ? { text: title, font: { size: 14, color: '#f5f5f5' } } : undefined,
    bargap: 0.05,
    xaxis: { title: { text: 'Return', font: { size: 11, color: '#6b7280' } }, tickformat: '.1%' },
    yaxis: { title: { text: 'Frequency', font: { size: 11, color: '#6b7280' } } },
    shapes: [
      // Zero line
      {
        type: 'line',
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#6b7280', width: 1, dash: 'dash' },
      },
    ],
  }

  return <PlotlyChart data={traces} layout={layout} />
}
