'use client'

import { DateRangePicker, DateRangePresets } from '@/components/date-range-picker'
import { BenchmarkSelector, BenchmarkToggle } from '@/components/benchmark-selector'
import { useAnalysis } from '@/lib/analysis-context'
import { Button } from '@/components/ui/button'
import { Settings2, RotateCcw, Sliders } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AnalysisToolbarProps {
  className?: string
  showDateRange?: boolean
  showBenchmark?: boolean
  showSettings?: boolean
  compact?: boolean
}

export function AnalysisToolbar({
  className,
  showDateRange = true,
  showBenchmark = true,
  showSettings = true,
  compact = false,
}: AnalysisToolbarProps) {
  const {
    settings,
    setDateRange,
    setBenchmark,
    setShowBenchmark,
    setConfidenceLevel,
    setRiskFreeRate,
    resetToDefaults,
  } = useAnalysis()

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <DateRangePresets value={settings.dateRange} onChange={setDateRange} />
        {showBenchmark && (
          <BenchmarkToggle
            enabled={settings.showBenchmark}
            benchmark={settings.benchmark}
            onToggle={setShowBenchmark}
            onBenchmarkChange={setBenchmark}
          />
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-3 bg-card/50 border border-border/50 rounded-lg',
      className
    )}>
      <div className="flex items-center gap-3">
        {showDateRange && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Period</span>
            <DateRangePicker
              value={settings.dateRange}
              onChange={setDateRange}
              className="w-[280px]"
            />
          </div>
        )}

        {showBenchmark && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Benchmark</span>
            <BenchmarkSelector
              value={settings.benchmark}
              onChange={setBenchmark}
              className="w-[220px]"
            />
            <Button
              variant={settings.showBenchmark ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9"
              onClick={() => setShowBenchmark(!settings.showBenchmark)}
            >
              {settings.showBenchmark ? 'On' : 'Off'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSettings && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Analysis Parameters</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure calculation settings for all metrics
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confidence" className="text-sm">
                      Confidence Level
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="confidence"
                        type="number"
                        min={0.9}
                        max={0.99}
                        step={0.01}
                        value={settings.confidenceLevel}
                        onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                        className="w-20 h-8 text-sm font-mono"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="rfr" className="text-sm">
                      Risk-Free Rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="rfr"
                        type="number"
                        min={0}
                        max={0.2}
                        step={0.01}
                        value={settings.riskFreeRate}
                        onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
                        className="w-20 h-8 text-sm font-mono"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={resetToDefaults}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Defaults
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

// Minimal toolbar for chart headers
export function ChartToolbar({
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
  className,
}: {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
  onExport?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onZoomOut && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </Button>
      )}
      {onZoomIn && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </Button>
      )}
      {onReset && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      {onExport && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExport}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </Button>
      )}
    </div>
  )
}
