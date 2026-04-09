'use client'

import { useSession } from '@/lib/session-context'
import { Panel } from '@/components/panel'
import { GradeBadge } from '@/components/grade-badge'
import { MetricCard } from '@/components/metric-card'
import { formatPercent, formatNumber, formatCurrency } from '@/lib/format'
import { TrendingUp, AlertTriangle, CheckCircle, XCircle, ArrowRight, Lightbulb, Target, Shield, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'

interface Improvement {
  id: string
  category: 'risk' | 'return' | 'consistency' | 'robustness'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  current_value: number
  target_value: number
  impact_score: number
  action_items: string[]
}

interface ImprovementsData {
  overall_score: number
  improvements: Improvement[]
  strengths: string[]
  weaknesses: string[]
  risk_score: number
  return_score: number
  consistency_score: number
  robustness_score: number
}

const severityColors = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
}

const categoryIcons = {
  risk: Shield,
  return: TrendingUp,
  consistency: BarChart3,
  robustness: Target,
}

export default function ImprovementsPage() {
  const { sessionId } = useSession()
  const { data, error, isLoading } = useSWR<ImprovementsData>(
    sessionId ? `/api/analysis/improvements?session_id=${sessionId}` : null,
    fetcher
  )

  // Mock data for UI demonstration
  const mockData: ImprovementsData = {
    overall_score: 72,
    risk_score: 68,
    return_score: 78,
    consistency_score: 65,
    robustness_score: 75,
    strengths: [
      'Strong risk-adjusted returns with Sharpe > 1.5',
      'Consistent monthly positive returns (70% win rate)',
      'Low correlation to benchmark (0.3)',
      'Reasonable max drawdown under 15%',
    ],
    weaknesses: [
      'High tail risk exposure (negative skewness)',
      'Long drawdown recovery periods',
      'Concentrated winning trades',
      'Sensitivity to market regime changes',
    ],
    improvements: [
      {
        id: '1',
        category: 'risk',
        severity: 'critical',
        title: 'Reduce Tail Risk Exposure',
        description: 'Strategy shows significant negative skewness (-1.2) and excess kurtosis (4.5), indicating fat tail risk that could lead to catastrophic losses.',
        current_value: -1.2,
        target_value: -0.5,
        impact_score: 9.2,
        action_items: [
          'Implement stop-loss at 2% per trade',
          'Add portfolio-level drawdown circuit breaker at 10%',
          'Consider hedging during high VIX periods',
        ],
      },
      {
        id: '2',
        category: 'consistency',
        severity: 'high',
        title: 'Improve Drawdown Recovery',
        description: 'Average drawdown duration of 45 days is above institutional threshold. Recovery factor of 1.8 suggests inefficient capital utilization during recovery.',
        current_value: 45,
        target_value: 30,
        impact_score: 7.8,
        action_items: [
          'Reduce position sizing during drawdown periods',
          'Implement momentum filter to avoid choppy markets',
          'Add regime detection to pause trading in adverse conditions',
        ],
      },
      {
        id: '3',
        category: 'robustness',
        severity: 'high',
        title: 'Address Overfitting Concerns',
        description: 'Walk-forward efficiency of 0.62 and PBO of 0.35 suggest moderate overfitting risk. Strategy may underperform out-of-sample.',
        current_value: 0.62,
        target_value: 0.80,
        impact_score: 7.5,
        action_items: [
          'Reduce number of optimized parameters',
          'Extend out-of-sample testing period',
          'Test on alternative markets/instruments',
        ],
      },
      {
        id: '4',
        category: 'return',
        severity: 'medium',
        title: 'Optimize Position Sizing',
        description: 'Current fixed position sizing leaves returns on table. Kelly criterion suggests 15% optimal sizing vs current 10%.',
        current_value: 10,
        target_value: 12,
        impact_score: 5.4,
        action_items: [
          'Implement fractional Kelly (0.5x) position sizing',
          'Scale positions based on recent volatility',
          'Add conviction-based sizing for high-probability setups',
        ],
      },
      {
        id: '5',
        category: 'consistency',
        severity: 'medium',
        title: 'Reduce Trade Concentration',
        description: 'Top 10% of trades account for 65% of profits. High concentration increases variance and path dependency.',
        current_value: 65,
        target_value: 40,
        impact_score: 5.1,
        action_items: [
          'Implement profit targets to lock in gains',
          'Add more trade signals to increase frequency',
          'Consider diversifying across uncorrelated strategies',
        ],
      },
      {
        id: '6',
        category: 'risk',
        severity: 'low',
        title: 'Enhance Regime Adaptation',
        description: 'Strategy underperforms by 40% during high volatility regimes. Adding regime detection could smooth returns.',
        current_value: -40,
        target_value: -15,
        impact_score: 4.2,
        action_items: [
          'Add VIX-based regime filter',
          'Reduce exposure during trending markets',
          'Implement adaptive parameters based on market state',
        ],
      },
    ],
  }

  const displayData = data || mockData

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Strategy Loaded</h2>
          <p className="text-sm text-muted-foreground">Upload a CSV file to view improvement recommendations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strategy Improvements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered recommendations to enhance your strategy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall Score</div>
            <div className="text-2xl font-bold">{displayData.overall_score}/100</div>
          </div>
          <GradeBadge 
            grade={displayData.overall_score >= 90 ? 'A' : displayData.overall_score >= 80 ? 'B' : displayData.overall_score >= 70 ? 'C' : 'D'} 
            size="lg" 
          />
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Panel className="text-center">
          <Shield className="h-5 w-5 mx-auto mb-2 text-blue-400" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk Management</div>
          <div className="text-2xl font-bold">{displayData.risk_score}</div>
          <Progress value={displayData.risk_score} className="h-1.5 mt-2" />
        </Panel>
        <Panel className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-400" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Return Quality</div>
          <div className="text-2xl font-bold">{displayData.return_score}</div>
          <Progress value={displayData.return_score} className="h-1.5 mt-2" />
        </Panel>
        <Panel className="text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-2 text-amber-400" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Consistency</div>
          <div className="text-2xl font-bold">{displayData.consistency_score}</div>
          <Progress value={displayData.consistency_score} className="h-1.5 mt-2" />
        </Panel>
        <Panel className="text-center">
          <Target className="h-5 w-5 mx-auto mb-2 text-purple-400" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Robustness</div>
          <div className="text-2xl font-bold">{displayData.robustness_score}</div>
          <Progress value={displayData.robustness_score} className="h-1.5 mt-2" />
        </Panel>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-profit" />
            <h3 className="text-sm font-medium">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {displayData.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-profit mt-2 shrink-0" />
                <span className="text-muted-foreground">{strength}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-loss" />
            <h3 className="text-sm font-medium">Weaknesses</h3>
          </div>
          <ul className="space-y-2">
            {displayData.weaknesses.map((weakness, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-loss mt-2 shrink-0" />
                <span className="text-muted-foreground">{weakness}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Improvement Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Prioritized Recommendations</h2>
        </div>

        <div className="space-y-4">
          {displayData.improvements.map((improvement, index) => {
            const CategoryIcon = categoryIcons[improvement.category]
            return (
              <Panel key={improvement.id} className="hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Priority Number */}
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-bold shrink-0">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${severityColors[improvement.severity]}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {improvement.severity.toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted">
                        <CategoryIcon className="h-3 w-3" />
                        {improvement.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Impact Score: <span className="font-mono font-medium">{improvement.impact_score}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-semibold mb-1">{improvement.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{improvement.description}</p>

                    {/* Action Items */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recommended Actions</div>
                      <ul className="space-y-1.5">
                        {improvement.action_items.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Impact Indicator */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Potential Impact</div>
                    <div className={`text-lg font-bold ${
                      improvement.impact_score >= 8 ? 'text-profit' :
                      improvement.impact_score >= 5 ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      +{improvement.impact_score.toFixed(1)}
                    </div>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      </div>

      {/* Summary CTA */}
      <Panel className="bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold mb-1">Ready to Implement?</h3>
            <p className="text-sm text-muted-foreground">
              Implementing the top 3 recommendations could improve your score by approximately 15 points
            </p>
          </div>
          <Button className="gap-2">
            Generate Implementation Plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Panel>
    </div>
  )
}
