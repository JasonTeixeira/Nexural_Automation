'use client'

import { useState } from 'react'
import { Panel } from '@/components/panel'
import { MetricCard } from '@/components/metric-card'
import { GradeBadge } from '@/components/grade-badge'
import { useSession } from '@/lib/session-context'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import { FactorAttributionResult, RollingFactorResult } from '@/lib/types-extended'
import { MetricCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/skeletons'
import { FadeIn, SlideUp, CountUp } from '@/components/motion'
import { formatPercent, formatNumber, formatDecimal } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Download,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

type ModelType = 'CAPM' | 'FF3' | 'FF5'

// Factor descriptions for tooltips
const factorDescriptions: Record<string, string> = {
  'Market (Rm-Rf)': 'Market excess return over risk-free rate. Measures systematic market risk exposure.',
  'SMB': 'Small Minus Big. Captures size premium - positive means tilted toward small caps.',
  'HML': 'High Minus Low. Captures value premium - positive means tilted toward value stocks.',
  'RMW': 'Robust Minus Weak. Profitability factor - positive means tilted toward profitable firms.',
  'CMA': 'Conservative Minus Aggressive. Investment factor - positive means tilted toward low-investment firms.',
  'Alpha': 'Risk-adjusted excess return not explained by factor exposures. The "skill" component.',
}

// Mock data for demo - replace with actual API call
const mockFactorData: FactorAttributionResult = {
  alpha: 0.0023,
  alpha_annualized: 0.0276,
  alpha_t_stat: 2.34,
  alpha_p_value: 0.019,
  r_squared: 0.42,
  adjusted_r_squared: 0.38,
  factors: [
    { factor: 'Market (Rm-Rf)', beta: 0.45, t_stat: 4.21, p_value: 0.0001, contribution_pct: 65, significant: true },
    { factor: 'SMB', beta: -0.12, t_stat: -1.89, p_value: 0.059, contribution_pct: 8, significant: false },
    { factor: 'HML', beta: 0.28, t_stat: 2.67, p_value: 0.008, contribution_pct: 18, significant: true },
    { factor: 'RMW', beta: 0.15, t_stat: 1.42, p_value: 0.156, contribution_pct: 5, significant: false },
    { factor: 'CMA', beta: -0.08, t_stat: -0.91, p_value: 0.363, contribution_pct: 4, significant: false },
  ],
  residual_volatility: 0.082,
  tracking_error: 0.065,
  information_ratio: 0.42,
  interpretation: 'Strategy exhibits significant positive alpha with moderate market exposure (beta 0.45). Slight value tilt (HML positive) and minimal size bias. Low R-squared suggests substantial idiosyncratic returns, characteristic of skill-based strategies.',
  model_type: 'FF5',
}

const mockRollingData: RollingFactorResult = {
  timestamps: Array.from({ length: 52 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (51 - i) * 7)
    return d.toISOString()
  }),
  rolling_alpha: Array.from({ length: 52 }, () => 0.002 + (Math.random() - 0.5) * 0.003),
  rolling_beta_market: Array.from({ length: 52 }, () => 0.45 + (Math.random() - 0.5) * 0.2),
  rolling_r_squared: Array.from({ length: 52 }, () => 0.35 + Math.random() * 0.2),
  rolling_beta_smb: Array.from({ length: 52 }, () => -0.12 + (Math.random() - 0.5) * 0.15),
  rolling_beta_hml: Array.from({ length: 52 }, () => 0.28 + (Math.random() - 0.5) * 0.2),
  window_size: 60,
}

export default function FactorAttributionPage() {
  const { sessionId } = useSession()
  const [modelType, setModelType] = useState<ModelType>('FF5')
  const [showRolling, setShowRolling] = useState(true)

  // In production, this would fetch from your API
  const { data: factorData, isLoading: factorLoading } = useSWR<FactorAttributionResult>(
    sessionId ? `/api/analysis/factor-attribution?session_id=${sessionId}&model=${modelType}` : null,
    fetcher,
    { fallbackData: mockFactorData }
  )

  const { data: rollingData, isLoading: rollingLoading } = useSWR<RollingFactorResult>(
    sessionId && showRolling ? `/api/analysis/rolling-factors?session_id=${sessionId}&model=${modelType}` : null,
    fetcher,
    { fallbackData: mockRollingData }
  )

  const data = factorData || mockFactorData
  const rolling = rollingData || mockRollingData

  const isLoading = factorLoading

  // Determine alpha quality
  const alphaQuality = data.alpha_p_value < 0.01 ? 'excellent' : data.alpha_p_value < 0.05 ? 'good' : data.alpha_p_value < 0.1 ? 'marginal' : 'not_significant'
  const alphaGrade = alphaQuality === 'excellent' ? 'A' : alphaQuality === 'good' ? 'B+' : alphaQuality === 'marginal' ? 'C+' : 'D'

  return (
    <div className="space-y-6" role="main" aria-label="Factor Attribution Analysis">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Factor Attribution</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fama-French factor decomposition and risk attribution analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={modelType} onValueChange={(v) => setModelType(v as ModelType)}>
              <SelectTrigger className="w-[140px]" aria-label="Select factor model">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAPM">CAPM (1 Factor)</SelectItem>
                <SelectItem value="FF3">Fama-French 3</SelectItem>
                <SelectItem value="FF5">Fama-French 5</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" aria-label="Export factor analysis">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Alpha Summary Cards */}
      <SlideUp delay={0.1}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Annualized Alpha"
                value={<CountUp value={data.alpha_annualized * 100} decimals={2} suffix="%" />}
                tooltip="Risk-adjusted excess return not explained by factor exposures"
                status={data.alpha_annualized > 0 ? 'positive' : 'negative'}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                label="Alpha t-Stat"
                value={<CountUp value={data.alpha_t_stat} decimals={2} />}
                tooltip="Statistical significance of alpha. |t| > 2 is typically significant"
                status={Math.abs(data.alpha_t_stat) > 2 ? 'positive' : 'neutral'}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <MetricCard
                label="Alpha p-Value"
                value={formatDecimal(data.alpha_p_value, 4)}
                tooltip="Probability alpha is due to chance. Lower is better (< 0.05 significant)"
                status={data.alpha_p_value < 0.05 ? 'positive' : data.alpha_p_value < 0.1 ? 'warning' : 'negative'}
              />
              <MetricCard
                label="R-Squared"
                value={<CountUp value={data.r_squared * 100} decimals={1} suffix="%" />}
                tooltip="Variance explained by factor model. Higher means more systematic exposure"
              />
              <MetricCard
                label="Information Ratio"
                value={<CountUp value={data.information_ratio} decimals={2} />}
                tooltip="Alpha divided by tracking error. Measures consistency of outperformance"
                status={data.information_ratio > 0.5 ? 'positive' : data.information_ratio > 0 ? 'neutral' : 'negative'}
              />
              <MetricCard
                label="Tracking Error"
                value={<CountUp value={data.tracking_error * 100} decimals={2} suffix="%" />}
                tooltip="Volatility of returns relative to benchmark"
              />
            </>
          )}
        </div>
      </SlideUp>

      {/* Alpha Quality Assessment */}
      <SlideUp delay={0.15}>
        <Panel
          title="Alpha Quality Assessment"
          icon={<CheckCircle className="h-5 w-5" />}
          headerRight={<GradeBadge grade={alphaGrade} size="lg" />}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 border border-border/50">
              {alphaQuality === 'excellent' || alphaQuality === 'good' ? (
                <CheckCircle className="h-5 w-5 text-positive shrink-0 mt-0.5" />
              ) : alphaQuality === 'marginal' ? (
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-negative shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{data.interpretation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={alphaQuality === 'excellent' ? 'default' : 'secondary'}>
                    {alphaQuality === 'excellent' ? 'Statistically Significant (p < 0.01)' :
                     alphaQuality === 'good' ? 'Significant (p < 0.05)' :
                     alphaQuality === 'marginal' ? 'Marginally Significant (p < 0.10)' :
                     'Not Statistically Significant'}
                  </Badge>
                  <Badge variant="outline">
                    {data.r_squared < 0.3 ? 'Low Systematic Exposure' :
                     data.r_squared < 0.6 ? 'Moderate Systematic Exposure' :
                     'High Systematic Exposure'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </SlideUp>

      {/* Factor Exposures Table */}
      <SlideUp delay={0.2}>
        <Panel title="Factor Exposures" icon={<PieChart className="h-5 w-5" />}>
          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Factor</TableHead>
                    <TableHead className="text-right">Beta</TableHead>
                    <TableHead className="text-right">t-Statistic</TableHead>
                    <TableHead className="text-right">p-Value</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                    <TableHead className="text-center">Significant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.factors.map((factor) => (
                    <TableRow key={factor.factor}>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-2 cursor-help">
                              {factor.factor}
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p>{factorDescriptions[factor.factor] || 'Factor exposure coefficient'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={factor.beta >= 0 ? 'text-positive' : 'text-negative'}>
                          {factor.beta >= 0 ? '+' : ''}{formatDecimal(factor.beta, 3)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDecimal(factor.t_stat, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDecimal(factor.p_value, 4)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${factor.contribution_pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs w-10 text-right">
                            {factor.contribution_pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {factor.significant ? (
                          <CheckCircle className="h-4 w-4 text-positive mx-auto" aria-label="Statistically significant" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" aria-label="Not significant" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </SlideUp>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Factor Contribution Pie Chart */}
        <SlideUp delay={0.25}>
          <Panel title="Factor Contribution" icon={<PieChart className="h-5 w-5" />}>
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <div className="h-[300px]">
                <Plot
                  data={[
                    {
                      type: 'pie',
                      labels: [...data.factors.map(f => f.factor), 'Alpha (Unexplained)'],
                      values: [...data.factors.map(f => f.contribution_pct), 100 - data.factors.reduce((sum, f) => sum + f.contribution_pct, 0)],
                      hole: 0.4,
                      marker: {
                        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
                      },
                      textinfo: 'label+percent',
                      textposition: 'outside',
                      textfont: { size: 11, color: '#a1a1aa' },
                      hovertemplate: '%{label}<br>%{value:.1f}%<extra></extra>',
                    },
                  ]}
                  layout={{
                    autosize: true,
                    margin: { t: 20, b: 20, l: 20, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    showlegend: false,
                    font: { family: 'Inter, sans-serif', color: '#a1a1aa' },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
          </Panel>
        </SlideUp>

        {/* Beta Bar Chart */}
        <SlideUp delay={0.3}>
          <Panel title="Factor Betas" icon={<BarChart3 className="h-5 w-5" />}>
            {isLoading ? (
              <ChartSkeleton height={300} />
            ) : (
              <div className="h-[300px]">
                <Plot
                  data={[
                    {
                      type: 'bar',
                      x: data.factors.map(f => f.factor),
                      y: data.factors.map(f => f.beta),
                      marker: {
                        color: data.factors.map(f => f.beta >= 0 ? '#10b981' : '#ef4444'),
                      },
                      text: data.factors.map(f => (f.beta >= 0 ? '+' : '') + f.beta.toFixed(2)),
                      textposition: 'outside',
                      textfont: { size: 11, color: '#a1a1aa' },
                      hovertemplate: '%{x}<br>Beta: %{y:.3f}<extra></extra>',
                    },
                  ]}
                  layout={{
                    autosize: true,
                    margin: { t: 30, b: 80, l: 50, r: 20 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: {
                      tickangle: -45,
                      tickfont: { size: 10, color: '#71717a' },
                      gridcolor: 'rgba(255,255,255,0.05)',
                    },
                    yaxis: {
                      title: { text: 'Beta', font: { size: 11, color: '#71717a' } },
                      tickfont: { size: 10, color: '#71717a' },
                      gridcolor: 'rgba(255,255,255,0.05)',
                      zeroline: true,
                      zerolinecolor: 'rgba(255,255,255,0.2)',
                    },
                    font: { family: 'Inter, sans-serif' },
                    shapes: [
                      {
                        type: 'line',
                        x0: -0.5,
                        x1: data.factors.length - 0.5,
                        y0: 0,
                        y1: 0,
                        line: { color: 'rgba(255,255,255,0.3)', width: 1, dash: 'dash' },
                      },
                    ],
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
          </Panel>
        </SlideUp>
      </div>

      {/* Rolling Factor Analysis */}
      <SlideUp delay={0.35}>
        <Panel
          title="Rolling Factor Analysis"
          icon={<TrendingUp className="h-5 w-5" />}
          headerRight={
            <Badge variant="outline" className="font-mono text-xs">
              {rolling.window_size}-day window
            </Badge>
          }
        >
          {rollingLoading ? (
            <ChartSkeleton height={400} />
          ) : (
            <div className="h-[400px]">
              <Plot
                data={[
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Rolling Alpha',
                    x: rolling.timestamps,
                    y: rolling.rolling_alpha.map(v => v * 100),
                    line: { color: '#3b82f6', width: 2 },
                    yaxis: 'y',
                    hovertemplate: 'Alpha: %{y:.3f}%<extra></extra>',
                  },
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Market Beta',
                    x: rolling.timestamps,
                    y: rolling.rolling_beta_market,
                    line: { color: '#10b981', width: 2 },
                    yaxis: 'y2',
                    hovertemplate: 'Market Beta: %{y:.2f}<extra></extra>',
                  },
                  {
                    type: 'scatter',
                    mode: 'lines',
                    name: 'R-Squared',
                    x: rolling.timestamps,
                    y: rolling.rolling_r_squared.map(v => v * 100),
                    line: { color: '#f59e0b', width: 1.5, dash: 'dot' },
                    yaxis: 'y3',
                    hovertemplate: 'R²: %{y:.1f}%<extra></extra>',
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 30, b: 50, l: 60, r: 60 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  legend: {
                    orientation: 'h',
                    y: 1.1,
                    x: 0.5,
                    xanchor: 'center',
                    font: { size: 11, color: '#a1a1aa' },
                    bgcolor: 'transparent',
                  },
                  xaxis: {
                    tickfont: { size: 10, color: '#71717a' },
                    gridcolor: 'rgba(255,255,255,0.05)',
                  },
                  yaxis: {
                    title: { text: 'Alpha (%)', font: { size: 10, color: '#3b82f6' } },
                    tickfont: { size: 10, color: '#71717a' },
                    gridcolor: 'rgba(255,255,255,0.05)',
                    side: 'left',
                  },
                  yaxis2: {
                    title: { text: 'Beta', font: { size: 10, color: '#10b981' } },
                    tickfont: { size: 10, color: '#71717a' },
                    overlaying: 'y',
                    side: 'right',
                    showgrid: false,
                  },
                  yaxis3: {
                    tickfont: { size: 10, color: '#71717a' },
                    overlaying: 'y',
                    side: 'right',
                    position: 0.95,
                    showgrid: false,
                    visible: false,
                  },
                  font: { family: 'Inter, sans-serif' },
                  hovermode: 'x unified',
                }}
                config={{
                  displayModeBar: true,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                  responsive: true,
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
        </Panel>
      </SlideUp>

      {/* Methodology Note */}
      <SlideUp delay={0.4}>
        <div className="p-4 rounded-lg bg-card/30 border border-border/30">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">Methodology</p>
              <p>
                Factor attribution uses {modelType === 'FF5' ? 'Fama-French 5-Factor' : modelType === 'FF3' ? 'Fama-French 3-Factor' : 'CAPM'} regression 
                on strategy returns. Daily factor data sourced from Kenneth French Data Library. Alpha represents 
                risk-adjusted excess return after controlling for systematic factor exposures. Statistical significance 
                assessed using heteroskedasticity-robust standard errors (White, 1980).
              </p>
            </div>
          </div>
        </div>
      </SlideUp>
    </div>
  )
}
