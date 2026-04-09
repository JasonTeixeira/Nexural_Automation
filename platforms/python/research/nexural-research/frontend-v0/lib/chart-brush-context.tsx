'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ChartBrushState } from './types-extended'

interface ChartBrushContextType {
  // Brush state
  brushState: ChartBrushState
  setBrushState: (state: ChartBrushState) => void
  clearBrush: () => void
  
  // Hover state for crosshair sync
  hoverIndex: number | null
  hoverDate: string | null
  setHover: (index: number | null, date: string | null) => void
  
  // Zoom state
  zoomRange: { start: number; end: number } | null
  setZoomRange: (range: { start: number; end: number } | null) => void
  
  // Registration for linked charts
  registeredCharts: Set<string>
  registerChart: (id: string) => void
  unregisterChart: (id: string) => void
  
  // Sync enabled flag
  syncEnabled: boolean
  setSyncEnabled: (enabled: boolean) => void
}

const defaultBrushState: ChartBrushState = {
  startIndex: null,
  endIndex: null,
  startDate: null,
  endDate: null,
}

const ChartBrushContext = createContext<ChartBrushContextType | null>(null)

export function ChartBrushProvider({ children }: { children: ReactNode }) {
  const [brushState, setBrushStateInternal] = useState<ChartBrushState>(defaultBrushState)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null)
  const [registeredCharts] = useState<Set<string>>(new Set())
  const [syncEnabled, setSyncEnabled] = useState(true)

  const setBrushState = useCallback((state: ChartBrushState) => {
    if (syncEnabled) {
      setBrushStateInternal(state)
    }
  }, [syncEnabled])

  const clearBrush = useCallback(() => {
    setBrushStateInternal(defaultBrushState)
  }, [])

  const setHover = useCallback((index: number | null, date: string | null) => {
    if (syncEnabled) {
      setHoverIndex(index)
      setHoverDate(date)
    }
  }, [syncEnabled])

  const registerChart = useCallback((id: string) => {
    registeredCharts.add(id)
  }, [registeredCharts])

  const unregisterChart = useCallback((id: string) => {
    registeredCharts.delete(id)
  }, [registeredCharts])

  return (
    <ChartBrushContext.Provider
      value={{
        brushState,
        setBrushState,
        clearBrush,
        hoverIndex,
        hoverDate,
        setHover,
        zoomRange,
        setZoomRange,
        registeredCharts,
        registerChart,
        unregisterChart,
        syncEnabled,
        setSyncEnabled,
      }}
    >
      {children}
    </ChartBrushContext.Provider>
  )
}

export function useChartBrush() {
  const context = useContext(ChartBrushContext)
  if (!context) {
    throw new Error('useChartBrush must be used within a ChartBrushProvider')
  }
  return context
}

// Hook for individual charts to sync with the brush state
export function useLinkedChart(chartId: string) {
  const {
    brushState,
    setBrushState,
    hoverIndex,
    hoverDate,
    setHover,
    zoomRange,
    setZoomRange,
    registerChart,
    unregisterChart,
    syncEnabled,
  } = useChartBrush()

  // Register this chart on mount
  useState(() => {
    registerChart(chartId)
    return () => unregisterChart(chartId)
  })

  const handleBrushChange = useCallback(
    (startIndex: number | null, endIndex: number | null, startDate?: string, endDate?: string) => {
      setBrushState({
        startIndex,
        endIndex,
        startDate: startDate || null,
        endDate: endDate || null,
      })
    },
    [setBrushState]
  )

  const handleHover = useCallback(
    (index: number | null, date?: string) => {
      setHover(index, date || null)
    },
    [setHover]
  )

  const handleZoom = useCallback(
    (start: number, end: number) => {
      setZoomRange({ start, end })
    },
    [setZoomRange]
  )

  return {
    brushState,
    hoverIndex,
    hoverDate,
    zoomRange,
    syncEnabled,
    onBrushChange: handleBrushChange,
    onHover: handleHover,
    onZoom: handleZoom,
  }
}
