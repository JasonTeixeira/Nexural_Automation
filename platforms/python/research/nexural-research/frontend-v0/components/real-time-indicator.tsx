'use client'

import { useWebSocketSafe } from '@/lib/websocket-context'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertCircle, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDistanceToNow } from 'date-fns'

export function ConnectionStatus() {
  const ws = useWebSocketSafe()
  
  if (!ws) return null
  
  const { isConnected, isConnecting, connectionError, connect } = ws
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
          isConnected && 'bg-positive/10 text-positive',
          isConnecting && 'bg-warning/10 text-warning',
          !isConnected && !isConnecting && 'bg-muted text-muted-foreground'
        )}
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-positive" />
            </span>
            <Wifi className="h-3 w-3" />
            <span>Live</span>
          </>
        ) : isConnecting ? (
          <>
            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </div>
      
      {connectionError && !isConnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={connect}
          className="h-6 px-2 text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  )
}

export function AlertsIndicator() {
  const ws = useWebSocketSafe()
  
  if (!ws) return null
  
  const { alerts, dismissAlert, clearAlerts } = ws
  const unreadCount = alerts.length
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-negative text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold">Alerts</h4>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAlerts}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No alerts
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'px-4 py-3 border-b border-border last:border-0 flex gap-3',
                  alert.severity === 'critical' && 'bg-negative/5',
                  alert.severity === 'warning' && 'bg-warning/5'
                )}
              >
                <AlertCircle
                  className={cn(
                    'h-4 w-4 mt-0.5 shrink-0',
                    alert.severity === 'critical' && 'text-negative',
                    alert.severity === 'warning' && 'text-warning',
                    alert.severity === 'info' && 'text-primary'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function LiveMetricsTicker() {
  const ws = useWebSocketSafe()
  
  if (!ws || !ws.latestMetrics) return null
  
  const { latestMetrics } = ws
  
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-card/50 rounded-lg border border-border text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Sharpe:</span>
        <span className={cn(
          latestMetrics.sharpe >= 1 ? 'text-positive' : 'text-negative'
        )}>
          {latestMetrics.sharpe.toFixed(2)}
        </span>
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">DD:</span>
        <span className="text-negative">
          {(latestMetrics.maxDrawdown * 100).toFixed(1)}%
        </span>
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Win:</span>
        <span className={cn(
          latestMetrics.winRate >= 0.5 ? 'text-positive' : 'text-negative'
        )}>
          {(latestMetrics.winRate * 100).toFixed(0)}%
        </span>
      </div>
      <div className="w-px h-3 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">P&L:</span>
        <span className={cn(
          latestMetrics.totalPnl >= 0 ? 'text-positive' : 'text-negative'
        )}>
          ${latestMetrics.totalPnl.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export function CollaboratorAvatars() {
  const ws = useWebSocketSafe()
  
  if (!ws || ws.collaborators.length === 0) return null
  
  const { collaborators } = ws
  const visibleCount = 3
  const overflow = collaborators.length - visibleCount
  
  return (
    <div className="flex items-center -space-x-2">
      {collaborators.slice(0, visibleCount).map((collab) => (
        <div
          key={collab.userId}
          className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: collab.color }}
          title={collab.userName}
        >
          {collab.userName.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
