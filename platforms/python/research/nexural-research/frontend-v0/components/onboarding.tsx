'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { sampleStrategies, createSampleSession } from '@/lib/sample-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Upload,
  BarChart3,
  Shield,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FadeIn } from './motion'

interface OnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const features = [
  {
    icon: BarChart3,
    title: '71+ Metrics',
    description: 'Comprehensive analysis including Sharpe, Sortino, Calmar, Omega, and institutional-grade risk metrics',
  },
  {
    icon: Shield,
    title: 'Robustness Testing',
    description: 'Monte Carlo simulation, walk-forward analysis, overfitting detection, and regime analysis',
  },
  {
    icon: Zap,
    title: 'Stress Testing',
    description: 'Historical crisis scenarios, tail risk amplification, and custom parameter sensitivity',
  },
  {
    icon: Activity,
    title: 'Factor Attribution',
    description: 'Fama-French factor decomposition, alpha analysis, and style drift detection',
  },
]

const steps = [
  {
    title: 'Welcome to Nexural Research',
    description: 'Institutional-grade strategy analysis for quant desks and systematic traders',
  },
  {
    title: 'Upload Your Data',
    description: 'Import NinjaTrader backtest CSV files or connect via API',
  },
  {
    title: 'Analyze & Optimize',
    description: 'Get actionable insights with 71+ metrics and robustness tests',
  },
]

export function OnboardingDialog({ open, onOpenChange }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const { setSession } = useSession()
  const router = useRouter()

  const handleDemoMode = (strategyId: string) => {
    const sampleData = createSampleSession(strategyId)
    setSession({
      sessionId: sampleData.session.session_id,
      filename: sampleData.session.filename,
      kind: sampleData.session.kind,
      nRows: sampleData.session.n_rows,
      columns: sampleData.session.columns,
    })
    onOpenChange(false)
    router.push('/dashboard')
  }

  const handleSkip = () => {
    onOpenChange(false)
  }

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle className="text-xl text-center">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-center">
            {steps[step].description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === 0 && (
            <FadeIn>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {step === 1 && (
            <FadeIn>
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg border border-border bg-card/50 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Upload CSV File</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports NinjaTrader trade exports, TradeStation reports, and custom formats
                  </p>
                  <Button className="mt-4" onClick={() => onOpenChange(false)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Now
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or try demo</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {sampleStrategies.slice(0, 4).map((strategy) => (
                    <Card
                      key={strategy.id}
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary/50',
                        selectedStrategy === strategy.id && 'border-primary bg-primary/5'
                      )}
                      onClick={() => setSelectedStrategy(strategy.id)}
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium flex items-center justify-between">
                          {strategy.name}
                          {selectedStrategy === strategy.id && (
                            <CheckCircle className="h-3 w-3 text-primary" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[9px] px-1.5">
                            Sharpe {strategy.characteristics.expected_sharpe.toFixed(2)}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5">
                            {strategy.characteristics.expected_win_rate}% WR
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {step === 2 && (
            <FadeIn>
              <div className="space-y-4 mt-4 text-center">
                <div className="p-6 rounded-lg border border-primary/20 bg-primary/5">
                  <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStrategy 
                      ? `Launch demo with ${sampleStrategies.find(s => s.id === selectedStrategy)?.name || 'sample'} strategy`
                      : 'Upload your data or select a demo strategy to begin'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {selectedStrategy ? (
                      <Button size="lg" onClick={() => handleDemoMode(selectedStrategy)}>
                        <Play className="h-4 w-4 mr-2" />
                        Launch Demo
                      </Button>
                    ) : (
                      <Button size="lg" onClick={() => onOpenChange(false)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Data
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo mode uses simulated trade data. Upload your own CSV for real analysis.
                </p>
              </div>
            </FadeIn>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {step < 2 && (
              <Button size="sm" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sample strategy selector for upload page
export function SampleStrategySelector() {
  const { setSession } = useSession()
  const router = useRouter()

  const handleSelectStrategy = (strategyId: string) => {
    const sampleData = createSampleSession(strategyId)
    setSession({
      sessionId: sampleData.session.session_id,
      filename: sampleData.session.filename,
      kind: sampleData.session.kind,
      nRows: sampleData.session.n_rows,
      columns: sampleData.session.columns,
    })
    router.push('/dashboard')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Try Demo Mode</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {sampleStrategies.map((strategy) => (
          <Card
            key={strategy.id}
            className="cursor-pointer transition-all hover:border-primary/50 hover:bg-card/80"
            onClick={() => handleSelectStrategy(strategy.id)}
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {strategy.name}
              </CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                {strategy.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  Sharpe {strategy.characteristics.expected_sharpe.toFixed(2)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {strategy.characteristics.expected_win_rate}% Win Rate
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {strategy.characteristics.expected_max_dd}% Max DD
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 w-full">
                <Play className="h-3 w-3 mr-2" />
                Launch Demo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
