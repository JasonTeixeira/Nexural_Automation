'use client'

import { useState, useCallback } from 'react'
import { Panel } from '@/components/panel'
import { MetricCard } from '@/components/metric-card'
import { useSession } from '@/lib/session-context'
import { FadeIn, SlideUp, CountUp } from '@/components/motion'
import { formatPercent, formatCurrency, formatDecimal } from '@/lib/format'
import { ScenarioParameter, ScenarioResult, CustomScenario } from '@/lib/types-extended'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FlaskConical,
  Plus,
  Play,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  TrendingUp,
  Zap,
  RefreshCw,
  Download,
  Upload,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Preset scenarios
const presetScenarios: CustomScenario[] = [
  {
    id: 'black-monday',
    name: 'Black Monday (1987)',
    description: 'Simulate a -22% single-day market crash with 3x volatility spike',
    parameters: [
      { id: '1', label: 'Return Shock', type: 'percentage', target: 'returns', value: -22, min: -50, max: 0 },
      { id: '2', label: 'Volatility Multiplier', type: 'multiplier', target: 'volatility', value: 3, min: 1, max: 10 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'gfc-2008',
    name: 'GFC (2008)',
    description: 'Global Financial Crisis scenario with sustained drawdown',
    parameters: [
      { id: '1', label: 'Peak-to-Trough', type: 'percentage', target: 'drawdown', value: -55, min: -80, max: 0 },
      { id: '2', label: 'Correlation Breakdown', type: 'multiplier', target: 'correlation', value: 0.9, min: 0, max: 1 },
      { id: '3', label: 'Volatility Spike', type: 'multiplier', target: 'volatility', value: 4, min: 1, max: 10 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'covid-crash',
    name: 'COVID Crash (2020)',
    description: 'Rapid 34% drawdown followed by V-shaped recovery',
    parameters: [
      { id: '1', label: 'Initial Drop', type: 'percentage', target: 'returns', value: -34, min: -50, max: 0 },
      { id: '2', label: 'Tail Amplification', type: 'multiplier', target: 'tail_risk', value: 2.5, min: 1, max: 5 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'flash-crash',
    name: 'Flash Crash (2010)',
    description: 'Extreme intraday volatility with -9% drop and recovery',
    parameters: [
      { id: '1', label: 'Intraday Shock', type: 'percentage', target: 'returns', value: -9, min: -20, max: 0 },
      { id: '2', label: 'Volatility Spike', type: 'multiplier', target: 'volatility', value: 5, min: 1, max: 10 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'rate-shock',
    name: 'Rate Shock (2022)',
    description: 'Aggressive rate hiking cycle with sustained vol',
    parameters: [
      { id: '1', label: 'Drawdown', type: 'percentage', target: 'drawdown', value: -27, min: -50, max: 0 },
      { id: '2', label: 'Volatility', type: 'multiplier', target: 'volatility', value: 1.8, min: 1, max: 5 },
      { id: '3', label: 'Correlation Shift', type: 'multiplier', target: 'correlation', value: 0.7, min: 0, max: 1 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'tail-event',
    name: 'Tail Risk Event',
    description: 'Amplify worst 5% of trades by 2-3x',
    parameters: [
      { id: '1', label: 'Tail Multiplier', type: 'multiplier', target: 'tail_risk', value: 2.5, min: 1, max: 5 },
      { id: '2', label: 'Tail Percentile', type: 'percentage', target: 'tail_risk', value: 5, min: 1, max: 20 },
    ],
    created_at: new Date().toISOString(),
  },
]

// Mock stress test results
function simulateScenario(scenario: CustomScenario): ScenarioResult {
  const baseNet = 125000
  const baseMdd = 15.2
  const baseSharpe = 1.45
  const baseWinRate = 58.5
  const basePF = 1.65

  // Calculate stress impact based on parameters
  let netImpact = 1
  let mddImpact = 1
  let sharpeImpact = 1
  let wrImpact = 1

  scenario.parameters.forEach(param => {
    if (param.target === 'returns') {
      netImpact *= (1 + param.value / 100)
      sharpeImpact *= Math.max(0.3, 1 + param.value / 50)
    } else if (param.target === 'drawdown') {
      mddImpact *= (1 + Math.abs(param.value) / 20)
    } else if (param.target === 'volatility') {
      sharpeImpact /= Math.sqrt(param.value)
      mddImpact *= Math.sqrt(param.value)
    } else if (param.target === 'tail_risk') {
      netImpact *= (1 - (param.value - 1) * 0.05)
      mddImpact *= param.value * 0.8
    } else if (param.target === 'correlation') {
      sharpeImpact *= (1 - param.value * 0.2)
    }
  })

  const stressedNet = baseNet * netImpact
  const stressedMdd = Math.min(baseMdd * mddImpact, 100)
  const stressedSharpe = Math.max(baseSharpe * sharpeImpact, -2)
  const stressedWr = Math.max(baseWinRate * wrImpact * 0.9, 20)
  const stressedPF = Math.max(basePF * netImpact, 0.3)

  const netChange = ((stressedNet - baseNet) / baseNet) * 100
  const mddChange = ((stressedMdd - baseMdd) / baseMdd) * 100

  let riskRating: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (stressedMdd > 40 || stressedNet < 0) riskRating = 'critical'
  else if (stressedMdd > 30 || stressedSharpe < 0.5) riskRating = 'high'
  else if (stressedMdd > 20 || stressedSharpe < 1) riskRating = 'medium'

  return {
    scenario_id: scenario.id,
    original_metrics: {
      net_profit: baseNet,
      max_drawdown: baseMdd,
      sharpe: baseSharpe,
      win_rate: baseWinRate,
      profit_factor: basePF,
    },
    stressed_metrics: {
      net_profit: stressedNet,
      max_drawdown: stressedMdd,
      sharpe: stressedSharpe,
      win_rate: stressedWr,
      profit_factor: stressedPF,
    },
    deltas: {
      net_profit_change_pct: netChange,
      drawdown_change_pct: mddChange,
      sharpe_change_pct: ((stressedSharpe - baseSharpe) / baseSharpe) * 100,
      win_rate_change_pct: ((stressedWr - baseWinRate) / baseWinRate) * 100,
      profit_factor_change_pct: ((stressedPF - basePF) / basePF) * 100,
    },
    still_profitable: stressedNet > 0,
    risk_rating: riskRating,
    interpretation: riskRating === 'critical' 
      ? 'Strategy fails under this scenario. Consider risk management improvements.'
      : riskRating === 'high'
      ? 'Significant degradation. Strategy survives but with substantial losses.'
      : riskRating === 'medium'
      ? 'Moderate impact. Strategy remains viable but returns diminished.'
      : 'Strategy demonstrates resilience under this stress scenario.',
  }
}

interface ParameterEditorProps {
  parameter: ScenarioParameter
  onChange: (param: ScenarioParameter) => void
  onRemove: () => void
}

function ParameterEditor({ parameter, onChange, onRemove }: ParameterEditorProps) {
  const handleValueChange = (newValue: number[]) => {
    onChange({ ...parameter, value: newValue[0] })
  }

  const getUnit = () => {
    switch (parameter.type) {
      case 'percentage': return '%'
      case 'multiplier': return 'x'
      case 'absolute': return ''
      default: return ''
    }
  }

  const getRange = () => {
    switch (parameter.target) {
      case 'returns': return { min: -50, max: 50, step: 1 }
      case 'drawdown': return { min: -80, max: 0, step: 1 }
      case 'volatility': return { min: 0.5, max: 10, step: 0.1 }
      case 'correlation': return { min: -1, max: 1, step: 0.05 }
      case 'tail_risk': return { min: 1, max: 5, step: 0.1 }
      default: return { min: -100, max: 100, step: 1 }
    }
  }

  const range = getRange()

  return (
    <div className="p-4 rounded-lg border border-border bg-card/50 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{parameter.label}</Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
          aria-label={`Remove ${parameter.label} parameter`}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Slider
            value={[parameter.value]}
            onValueChange={handleValueChange}
            min={range.min}
            max={range.max}
            step={range.step}
            className="flex-1"
            aria-label={`${parameter.label} value`}
          />
          <div className="w-20 text-right font-mono text-sm">
            <span className={parameter.value < 0 ? 'text-negative' : parameter.value > 0 ? 'text-positive' : ''}>
              {parameter.value > 0 && parameter.type !== 'multiplier' ? '+' : ''}
              {parameter.type === 'multiplier' ? parameter.value.toFixed(1) : parameter.value}
              {getUnit()}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{range.min}{getUnit()}</span>
          <span className="capitalize">{parameter.target.replace('_', ' ')}</span>
          <span>{range.max}{getUnit()}</span>
        </div>
      </div>
    </div>
  )
}

export default function ScenarioBuilderPage() {
  const { sessionId } = useSession()
  const [selectedPreset, setSelectedPreset] = useState<CustomScenario | null>(null)
  const [customScenario, setCustomScenario] = useState<CustomScenario>({
    id: 'custom',
    name: 'Custom Scenario',
    description: 'Build your own stress test',
    parameters: [],
    created_at: new Date().toISOString(),
  })
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<CustomScenario[]>([])

  const activeScenario = selectedPreset || customScenario

  const addParameter = () => {
    const newParam: ScenarioParameter = {
      id: Date.now().toString(),
      label: 'New Parameter',
      type: 'multiplier',
      target: 'volatility',
      value: 1.5,
      min: 0.5,
      max: 5,
    }
    setCustomScenario(prev => ({
      ...prev,
      parameters: [...prev.parameters, newParam],
    }))
    setSelectedPreset(null)
  }

  const updateParameter = (index: number, param: ScenarioParameter) => {
    if (selectedPreset) {
      setSelectedPreset(prev => prev ? {
        ...prev,
        parameters: prev.parameters.map((p, i) => i === index ? param : p),
      } : null)
    } else {
      setCustomScenario(prev => ({
        ...prev,
        parameters: prev.parameters.map((p, i) => i === index ? param : p),
      }))
    }
  }

  const removeParameter = (index: number) => {
    if (selectedPreset) {
      setSelectedPreset(prev => prev ? {
        ...prev,
        parameters: prev.parameters.filter((_, i) => i !== index),
      } : null)
    } else {
      setCustomScenario(prev => ({
        ...prev,
        parameters: prev.parameters.filter((_, i) => i !== index),
      }))
    }
  }

  const runScenario = useCallback(async () => {
    setIsRunning(true)
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800))
    const result = simulateScenario(activeScenario)
    setResults(prev => [result, ...prev.slice(0, 9)])
    setIsRunning(false)
  }, [activeScenario])

  const runAllPresets = async () => {
    setIsRunning(true)
    const allResults: ScenarioResult[] = []
    for (const preset of presetScenarios) {
      await new Promise(resolve => setTimeout(resolve, 200))
      allResults.push(simulateScenario(preset))
    }
    setResults(allResults)
    setIsRunning(false)
  }

  const saveScenario = () => {
    if (customScenario.parameters.length > 0) {
      setSavedScenarios(prev => [...prev, { ...customScenario, id: Date.now().toString() }])
      setShowSaveDialog(false)
    }
  }

  const getRiskColor = (rating: string) => {
    switch (rating) {
      case 'low': return 'text-positive'
      case 'medium': return 'text-warning'
      case 'high': return 'text-orange-500'
      case 'critical': return 'text-negative'
      default: return 'text-muted-foreground'
    }
  }

  const getRiskIcon = (rating: string) => {
    switch (rating) {
      case 'low': return <CheckCircle className="h-4 w-4 text-positive" />
      case 'medium': return <AlertTriangle className="h-4 w-4 text-warning" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'critical': return <XCircle className="h-4 w-4 text-negative" />
      default: return null
    }
  }

  return (
    <div className="space-y-6" role="main" aria-label="Custom Scenario Builder">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Scenario Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build custom stress tests and simulate historical crisis scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runAllPresets}
              disabled={isRunning}
              aria-label="Run all preset scenarios"
            >
              <Zap className="h-4 w-4 mr-2" />
              Run All Presets
            </Button>
            <Button
              size="sm"
              onClick={runScenario}
              disabled={isRunning || activeScenario.parameters.length === 0}
              aria-label="Run current scenario"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Scenario
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scenario Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preset Scenarios */}
          <SlideUp delay={0.1}>
            <Panel title="Historical Crisis Scenarios" icon={<History className="h-5 w-5" />}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presetScenarios.map((preset) => (
                  <Card
                    key={preset.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary/50',
                      selectedPreset?.id === preset.id && 'border-primary bg-primary/5'
                    )}
                    onClick={() => setSelectedPreset(preset)}
                    role="button"
                    aria-pressed={selectedPreset?.id === preset.id}
                    aria-label={`Select ${preset.name} scenario`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription className="text-xs line-clamp-2">
                        {preset.description}
                      </CardDescription>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {preset.parameters.slice(0, 2).map((p) => (
                          <Badge key={p.id} variant="secondary" className="text-[10px]">
                            {p.label}
                          </Badge>
                        ))}
                        {preset.parameters.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{preset.parameters.length - 2}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Panel>
          </SlideUp>

          {/* Parameter Editor */}
          <SlideUp delay={0.15}>
            <Panel
              title={selectedPreset ? `Edit: ${selectedPreset.name}` : 'Custom Parameters'}
              icon={<FlaskConical className="h-5 w-5" />}
              headerRight={
                <div className="flex items-center gap-2">
                  {!selectedPreset && (
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={customScenario.parameters.length === 0}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Scenario</DialogTitle>
                          <DialogDescription>
                            Save this custom scenario for future use
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="scenario-name">Name</Label>
                            <Input
                              id="scenario-name"
                              value={customScenario.name}
                              onChange={(e) => setCustomScenario(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="scenario-desc">Description</Label>
                            <Input
                              id="scenario-desc"
                              value={customScenario.description}
                              onChange={(e) => setCustomScenario(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                          <Button onClick={saveScenario}>Save Scenario</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPreset(null)}
                    disabled={!selectedPreset}
                  >
                    Clear
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                {activeScenario.parameters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No parameters configured</p>
                    <p className="text-xs mt-1">Select a preset or add custom parameters</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {activeScenario.parameters.map((param, index) => (
                      <ParameterEditor
                        key={param.id}
                        parameter={param}
                        onChange={(p) => updateParameter(index, p)}
                        onRemove={() => removeParameter(index)}
                      />
                    ))}
                  </div>
                )}
                {!selectedPreset && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={addParameter}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                )}
              </div>
            </Panel>
          </SlideUp>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <SlideUp delay={0.2}>
            <Panel title="Stress Test Results" icon={<AlertTriangle className="h-5 w-5" />}>
              {results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No results yet</p>
                  <p className="text-xs mt-1">Run a scenario to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.slice(0, 3).map((result, index) => (
                    <div
                      key={`${result.scenario_id}-${index}`}
                      className="p-4 rounded-lg border border-border bg-card/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {presetScenarios.find(p => p.id === result.scenario_id)?.name || 'Custom'}
                        </span>
                        <div className="flex items-center gap-2">
                          {getRiskIcon(result.risk_rating)}
                          <Badge
                            variant="outline"
                            className={cn('capitalize', getRiskColor(result.risk_rating))}
                          >
                            {result.risk_rating}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Net Profit</span>
                          <div className="font-mono">
                            <span className={result.deltas.net_profit_change_pct < 0 ? 'text-negative' : 'text-positive'}>
                              {formatCurrency(result.stressed_metrics.net_profit)}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              ({result.deltas.net_profit_change_pct > 0 ? '+' : ''}{result.deltas.net_profit_change_pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max DD</span>
                          <div className="font-mono">
                            <span className="text-negative">
                              {result.stressed_metrics.max_drawdown.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground ml-1">
                              (+{result.deltas.drawdown_change_pct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sharpe</span>
                          <div className="font-mono">
                            {result.stressed_metrics.sharpe.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Survives</span>
                          <div>
                            {result.still_profitable ? (
                              <CheckCircle className="h-4 w-4 text-positive" />
                            ) : (
                              <XCircle className="h-4 w-4 text-negative" />
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.interpretation}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </SlideUp>

          {/* Summary Table */}
          {results.length > 0 && (
            <SlideUp delay={0.25}>
              <Panel title="All Results" headerRight={
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              }>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead className="text-right">Net P/L</TableHead>
                        <TableHead className="text-right">Max DD</TableHead>
                        <TableHead className="text-center">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={`${result.scenario_id}-table-${index}`}>
                          <TableCell className="font-medium text-xs">
                            {presetScenarios.find(p => p.id === result.scenario_id)?.name?.slice(0, 12) || 'Custom'}
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-mono text-xs',
                            result.stressed_metrics.net_profit < 0 ? 'text-negative' : 'text-positive'
                          )}>
                            {formatCurrency(result.stressed_metrics.net_profit, 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-negative">
                            {result.stressed_metrics.max_drawdown.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {getRiskIcon(result.risk_rating)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Panel>
            </SlideUp>
          )}
        </div>
      </div>
    </div>
  )
}
