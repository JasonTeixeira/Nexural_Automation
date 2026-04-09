'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from './session-context'

// WebSocket message types
export type WSMessageType = 
  | 'trade_update'
  | 'metrics_update'
  | 'equity_update'
  | 'alert'
  | 'connection_status'
  | 'heartbeat'

export interface WSMessage {
  type: WSMessageType
  timestamp: string
  data: unknown
  sessionId?: string
}

export interface TradeUpdate {
  trade_id: string
  timestamp: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number
  exit_price?: number
  pnl?: number
  status: 'open' | 'closed'
}

export interface MetricsUpdate {
  total_pnl: number
  daily_pnl: number
  open_positions: number
  win_rate: number
  sharpe_ratio: number
}

export interface EquityUpdate {
  timestamp: string
  equity: number
  drawdown: number
  high_water_mark: number
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  timestamp: string
}

interface WebSocketContextValue {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastMessage: WSMessage | null
  lastTradeUpdate: TradeUpdate | null
  lastMetricsUpdate: MetricsUpdate | null
  lastEquityUpdate: EquityUpdate | null
  alerts: Alert[]
  liveMode: boolean
  setLiveMode: (enabled: boolean) => void
  connect: () => void
  disconnect: () => void
  clearAlerts: () => void
  dismissAlert: (id: string) => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}

// Safe hook that doesn't throw if used outside provider
export function useWebSocketSafe() {
  return useContext(WebSocketContext)
}

interface WebSocketProviderProps {
  children: React.ReactNode
  wsUrl?: string
}

export function WebSocketProvider({ children, wsUrl }: WebSocketProviderProps) {
  const { sessionId } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const [lastTradeUpdate, setLastTradeUpdate] = useState<TradeUpdate | null>(null)
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<MetricsUpdate | null>(null)
  const [lastEquityUpdate, setLastEquityUpdate] = useState<EquityUpdate | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [liveMode, setLiveMode] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set())

  const baseWsUrl = wsUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data)
      setLastMessage(message)

      switch (message.type) {
        case 'trade_update':
          setLastTradeUpdate(message.data as TradeUpdate)
          break
        case 'metrics_update':
          setLastMetricsUpdate(message.data as MetricsUpdate)
          break
        case 'equity_update':
          setLastEquityUpdate(message.data as EquityUpdate)
          break
        case 'alert':
          const alert = message.data as Alert
          setAlerts(prev => [alert, ...prev].slice(0, 50)) // Keep last 50 alerts
          break
        case 'heartbeat':
          // Connection is alive
          break
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (!liveMode) return

    clearTimers()
    setConnectionStatus('connecting')

    try {
      const url = sessionId ? `${baseWsUrl}?session_id=${sessionId}` : baseWsUrl
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Resubscribe to channels
        subscriptions.forEach(channel => {
          wsRef.current?.send(JSON.stringify({ action: 'subscribe', channel }))
        })

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'ping' }))
          }
        }, 30000)
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        clearTimers()

        // Attempt reconnect after 5 seconds if live mode is still enabled
        if (liveMode) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000)
        }
      }

      wsRef.current.onerror = () => {
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      setConnectionStatus('error')
    }
  }, [baseWsUrl, sessionId, liveMode, subscriptions, handleMessage, clearTimers])

  const disconnect = useCallback(() => {
    clearTimers()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [clearTimers])

  const subscribe = useCallback((channel: string) => {
    setSubscriptions(prev => new Set(prev).add(channel))
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    setSubscriptions(prev => {
      const next = new Set(prev)
      next.delete(channel)
      return next
    })
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'unsubscribe', channel }))
    }
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  // Auto-connect when live mode is enabled
  useEffect(() => {
    if (liveMode) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      disconnect()
    }
  }, [liveMode, connect, disconnect])

  // Reconnect when session changes
  useEffect(() => {
    if (liveMode && sessionId) {
      disconnect()
      connect()
    }
  }, [sessionId, liveMode, connect, disconnect])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        connectionStatus,
        lastMessage,
        lastTradeUpdate,
        lastMetricsUpdate,
        lastEquityUpdate,
        alerts,
        liveMode,
        setLiveMode,
        connect,
        disconnect,
        clearAlerts,
        dismissAlert,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}
