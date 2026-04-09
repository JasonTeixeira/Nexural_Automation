'use client'

import { useWebSocketSafe } from '@/lib/websocket-context'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, Radio, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatNumber } from '@/lib/format'

export function LiveIndicator() {
  const ws = useWebSocketSafe()
  
  if (!ws) return null

  const {
    isConnected,
    connectionStatus,
    liveMode,
    setLiveMode,
    lastMetricsUpdate,
    alerts,
    dismissAlert,
    clearAlerts,
  } = ws

  const statusColors = {
    connecting: 'text-amber-500',
    connected: 'text-emerald-500',
    disconnected: 'text-muted-foreground',
    error: 'text-red-500',
  }

  const statusLabels = {
    connecting: 'Connecting...',
    connected: 'Live',
    disconnected: 'Offline',
    error: 'Error',
  }

  const unreadAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning')

  return (
    <div className="flex items-center gap-3">
      {/* Live Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Live</span>
        <Switch
          checked={liveMode}
          onCheckedChange={setLiveMode}
          aria-label="Toggle live mode"
        />
      </div>

      {/* Connection Status */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-2 h-8 px-2',
              statusColors[connectionStatus]
            )}
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Radio className="h-4 w-4" />
              </>
            ) : connectionStatus === 'connecting' ? (
              <Wifi className="h-4 w-4 animate-pulse" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-xs hidden sm:inline">{statusLabels[connectionStatus]}</span>
            {unreadAlerts.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadAlerts.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Status</span>
              <span className={cn('text-sm', statusColors[connectionStatus])}>
                {statusLabels[connectionStatus]}
              </span>
            </div>

            {/* Live Metrics */}
            {isConnected && lastMetricsUpdate && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Live Metrics</span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Daily P&L</span>
                    <p className={cn(
                      'font-mono font-medium',
                      lastMetricsUpdate.daily_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {lastMetricsUpdate.daily_pnl >= 0 ? '+' : ''}{formatNumber(lastMetricsUpdate.daily_pnl, 'currency')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Open Positions</span>
                    <p className="font-mono font-medium">{lastMetricsUpdate.open_positions}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Rate</span>
                    <p className="font-mono font-medium">{formatNumber(lastMetricsUpdate.win_rate, 'percent')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sharpe</span>
                    <p className="font-mono font-medium">{lastMetricsUpdate.sharpe_ratio.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Alerts ({alerts.length})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={clearAlerts}
                  >
                    Clear all
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-2 rounded-md text-xs flex items-start gap-2',
                        alert.severity === 'critical' && 'bg-red-500/10 border border-red-500/20',
                        alert.severity === 'warning' && 'bg-amber-500/10 border border-amber-500/20',
                        alert.severity === 'info' && 'bg-blue-500/10 border border-blue-500/20'
                      )}
                    >
                      <AlertCircle className={cn(
                        'h-4 w-4 shrink-0 mt-0.5',
                        alert.severity === 'critical' && 'text-red-500',
                        alert.severity === 'warning' && 'text-amber-500',
                        alert.severity === 'info' && 'text-blue-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-muted-foreground truncate">{alert.message}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            {!liveMode && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Enable live mode to receive real-time updates from your trading system.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Compact version for mobile/sidebar
export function LiveStatusBadge() {
  const ws = useWebSocketSafe()
  
  if (!ws || !ws.liveMode) return null

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="relative flex h-2 w-2">
        {ws.isConnected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        )}
      </span>
      <span className={ws.isConnected ? 'text-emerald-500' : 'text-amber-500'}>
        {ws.isConnected ? 'LIVE' : 'CONNECTING'}
      </span>
    </span>
  )
}
