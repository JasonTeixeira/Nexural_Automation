'use client'

import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useLinkedChart } from '@/lib/chart-brush-context'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link2, Link2Off, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface LinkedChartProps {
  id: string
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  timestamps?: string[]
  height?: number
  className?: string
  title?: string
  showSyncToggle?: boolean
  showToolbar?: boolean
  onExport?: () => void
}

// Dark theme layout defaults
const darkLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: {
    family: 'Inter, system-ui, sans-serif',
    color: '#a1a1aa',
  },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.1)',
    tickfont: { size: 10, color: '#71717a' },
    showspikes: true,
    spikemode: 'across',
    spikethickness: 1,
    spikecolor: 'rgba(255,255,255,0.3)',
    spikedash: 'dot',
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.1)',
    tickfont: { size: 10, color: '#71717a' },
    showspikes: true,
    spikemode: 'across',
    spikethickness: 1,
    spikecolor: 'rgba(255,255,255,0.3)',
    spikedash: 'dot',
  },
  margin: { t: 30, b: 50, l: 60, r: 20 },
  hovermode: 'x unified',
  dragmode: 'zoom',
}

export function LinkedChart({
  id,
  data,
  layout: customLayout,
  config: customConfig,
  timestamps = [],
  height = 300,
  className,
  title,
  showSyncToggle = true,
  showToolbar = true,
  onExport,
}: LinkedChartProps) {
  const plotRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [localSyncEnabled, setLocalSyncEnabled] = useState(true)
  
  const {
    brushState,
    hoverIndex,
    hoverDate,
    zoomRange,
    syncEnabled,
    onBrushChange,
    onHover,
    onZoom,
  } = useLinkedChart(id)

  // Merge layout with dark theme and custom options
  const mergedLayout = useMemo(() => {
    const baseLayout = {
      ...darkLayout,
      ...customLayout,
      autosize: true,
      xaxis: {
        ...darkLayout.xaxis,
        ...customLayout?.xaxis,
      },
      yaxis: {
        ...darkLayout.yaxis,
        ...customLayout?.yaxis,
      },
    }

    // Apply zoom range if synced
    if (syncEnabled && localSyncEnabled && zoomRange && timestamps.length > 0) {
      const startDate = timestamps[Math.max(0, Math.floor(zoomRange.start))]
      const endDate = timestamps[Math.min(timestamps.length - 1, Math.ceil(zoomRange.end))]
      if (startDate && endDate) {
        baseLayout.xaxis = {
          ...baseLayout.xaxis,
          range: [startDate, endDate],
        }
      }
    }

    // Add crosshair line if hovering
    if (syncEnabled && localSyncEnabled && hoverDate) {
      baseLayout.shapes = [
        ...(baseLayout.shapes || []),
        {
          type: 'line',
          x0: hoverDate,
          x1: hoverDate,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: {
            color: 'rgba(59, 130, 246, 0.5)',
            width: 1,
            dash: 'dot',
          },
        },
      ]
    }

    // Add selection rectangle if brushing
    if (syncEnabled && localSyncEnabled && brushState.startDate && brushState.endDate) {
      baseLayout.shapes = [
        ...(baseLayout.shapes || []),
        {
          type: 'rect',
          x0: brushState.startDate,
          x1: brushState.endDate,
          y0: 0,
          y1: 1,
          yref: 'paper',
          fillcolor: 'rgba(59, 130, 246, 0.1)',
          line: {
            color: 'rgba(59, 130, 246, 0.3)',
            width: 1,
          },
        },
      ]
    }

    return baseLayout
  }, [customLayout, syncEnabled, localSyncEnabled, zoomRange, hoverDate, brushState, timestamps])

  // Config with chart export
  const mergedConfig = useMemo(() => ({
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] as any[],
    modeBarButtonsToAdd: [],
    responsive: true,
    scrollZoom: true,
    ...customConfig,
  }), [customConfig])

  // Handle relayout (zoom/pan)
  const handleRelayout = useCallback((event: any) => {
    if (!syncEnabled || !localSyncEnabled) return
    
    // Handle zoom via axis range
    if (event['xaxis.range[0]'] && event['xaxis.range[1]']) {
      const startDate = event['xaxis.range[0]']
      const endDate = event['xaxis.range[1]']
      const startIdx = timestamps.findIndex(t => t >= startDate)
      const endIdx = timestamps.findIndex(t => t >= endDate)
      if (startIdx >= 0 && endIdx >= 0) {
        onZoom(startIdx, endIdx)
      }
    }
    
    // Handle reset
    if (event['xaxis.autorange'] || event['yaxis.autorange']) {
      onBrushChange(null, null)
    }
  }, [syncEnabled, localSyncEnabled, timestamps, onZoom, onBrushChange])

  // Handle hover for crosshair sync
  const handleHover = useCallback((event: any) => {
    if (!syncEnabled || !localSyncEnabled) return
    if (event.points && event.points[0]) {
      const point = event.points[0]
      const date = point.x as string
      const idx = timestamps.indexOf(date)
      onHover(idx >= 0 ? idx : point.pointIndex, date)
    }
  }, [syncEnabled, localSyncEnabled, timestamps, onHover])

  // Handle unhover
  const handleUnhover = useCallback(() => {
    if (!syncEnabled || !localSyncEnabled) return
    onHover(null)
  }, [syncEnabled, localSyncEnabled, onHover])

  // Handle selection (brush)
  const handleSelected = useCallback((event: any) => {
    if (!syncEnabled || !localSyncEnabled) return
    if (event && event.range && event.range.x) {
      const [startDate, endDate] = event.range.x
      const startIdx = timestamps.findIndex(t => t >= startDate)
      const endIdx = timestamps.findIndex(t => t <= endDate)
      onBrushChange(startIdx, endIdx, startDate, endDate)
    }
  }, [syncEnabled, localSyncEnabled, timestamps, onBrushChange])

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    onBrushChange(null, null)
    if (plotRef.current) {
      // Trigger Plotly autoscale
      plotRef.current.el?.dispatchEvent(new Event('plotly_doubleclick'))
    }
  }, [onBrushChange])

  // Toggle sync for this chart
  const toggleLocalSync = () => {
    setLocalSyncEnabled(!localSyncEnabled)
  }

  // Export chart as PNG
  const handleExport = useCallback(async () => {
    if (onExport) {
      onExport()
      return
    }
    if (plotRef.current) {
      const Plotly = await import('plotly.js')
      Plotly.downloadImage(plotRef.current.el, {
        format: 'png',
        filename: `chart-${id}-${Date.now()}`,
        width: 1200,
        height: 600,
        scale: 2,
      })
    }
  }, [id, onExport])

  return (
    <div className={cn('relative group', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showSyncToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-background/80 backdrop-blur"
              onClick={toggleLocalSync}
              aria-label={localSyncEnabled ? 'Disable chart sync' : 'Enable chart sync'}
            >
              {localSyncEnabled ? (
                <Link2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Link2Off className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur"
            onClick={handleResetZoom}
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur"
            onClick={handleExport}
            aria-label="Download chart"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Sync indicator */}
      {syncEnabled && localSyncEnabled && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 bg-background/80 backdrop-blur">
            <Link2 className="h-2.5 w-2.5 mr-1" />
            Synced
          </Badge>
        </div>
      )}

      {/* Chart */}
      <Plot
        ref={plotRef}
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        style={{ width: '100%', height: isFullscreen ? '100vh' : height }}
        onRelayout={handleRelayout}
        onHover={handleHover}
        onUnhover={handleUnhover}
        onSelected={handleSelected}
        useResizeHandler
      />

      {/* Title overlay */}
      {title && (
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/60 backdrop-blur px-2 py-0.5 rounded">
          {title}
        </div>
      )}
    </div>
  )
}

// Utility component for chart sync toggle in toolbar
export function ChartSyncToggle() {
  const { syncEnabled, setSyncEnabled } = useLinkedChart('global-toggle')
  
  return (
    <Button
      variant={syncEnabled ? 'default' : 'outline'}
      size="sm"
      onClick={() => setSyncEnabled(!syncEnabled)}
      className="gap-2"
      aria-label={syncEnabled ? 'Disable chart synchronization' : 'Enable chart synchronization'}
    >
      {syncEnabled ? (
        <>
          <Link2 className="h-4 w-4" />
          Charts Synced
        </>
      ) : (
        <>
          <Link2Off className="h-4 w-4" />
          Charts Independent
        </>
      )}
    </Button>
  )
}
