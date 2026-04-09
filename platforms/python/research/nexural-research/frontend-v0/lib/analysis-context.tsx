'use client'

import * as React from 'react'
import type { DateRange } from '@/components/date-range-picker'

interface AnalysisSettings {
  dateRange: DateRange
  benchmark: string
  showBenchmark: boolean
  confidenceLevel: number
  riskFreeRate: number
}

interface AnalysisContextValue {
  settings: AnalysisSettings
  setDateRange: (range: DateRange) => void
  setBenchmark: (benchmark: string) => void
  setShowBenchmark: (show: boolean) => void
  setConfidenceLevel: (level: number) => void
  setRiskFreeRate: (rate: number) => void
  resetToDefaults: () => void
}

const defaultSettings: AnalysisSettings = {
  dateRange: { from: undefined, to: undefined },
  benchmark: 'spy',
  showBenchmark: true,
  confidenceLevel: 0.95,
  riskFreeRate: 0.05,
}

const AnalysisContext = React.createContext<AnalysisContextValue | undefined>(undefined)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AnalysisSettings>(defaultSettings)

  const setDateRange = React.useCallback((range: DateRange) => {
    setSettings((prev) => ({ ...prev, dateRange: range }))
  }, [])

  const setBenchmark = React.useCallback((benchmark: string) => {
    setSettings((prev) => ({ ...prev, benchmark }))
  }, [])

  const setShowBenchmark = React.useCallback((show: boolean) => {
    setSettings((prev) => ({ ...prev, showBenchmark: show }))
  }, [])

  const setConfidenceLevel = React.useCallback((level: number) => {
    setSettings((prev) => ({ ...prev, confidenceLevel: level }))
  }, [])

  const setRiskFreeRate = React.useCallback((rate: number) => {
    setSettings((prev) => ({ ...prev, riskFreeRate: rate }))
  }, [])

  const resetToDefaults = React.useCallback(() => {
    setSettings(defaultSettings)
  }, [])

  return (
    <AnalysisContext.Provider
      value={{
        settings,
        setDateRange,
        setBenchmark,
        setShowBenchmark,
        setConfidenceLevel,
        setRiskFreeRate,
        resetToDefaults,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const context = React.useContext(AnalysisContext)
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return context
}
