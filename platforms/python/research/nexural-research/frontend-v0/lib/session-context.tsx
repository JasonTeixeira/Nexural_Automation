'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import useSWR from 'swr'
import { fetcher } from './api'

// Full metrics that get passed to AI
export interface StrategyMetrics {
  // Core Performance
  netProfit: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  
  // Return Metrics
  cagr: number
  totalReturn: number
  avgMonthlyReturn: number
  
  // Risk Metrics
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  avgDrawdown: number
  maxDrawdownDuration: number // in days
  
  // Trade Statistics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWinner: number
  avgLoser: number
  largestWinner: number
  largestLoser: number
  avgTrade: number
  avgHoldingPeriod: number // in minutes/hours
  
  // Risk of Ruin
  consecutiveLosses: number
  maxConsecutiveLosses: number
  recoveryFactor: number
  
  // Time Analysis
  bestHour?: string
  worstHour?: string
  bestDay?: string
  worstDay?: string
  
  // Data Quality
  dataQualityScore: number
  gapsDetected: number
  possibleCurveFitting: boolean
  lookAheadBiasRisk: boolean
}

export interface ParsedTrade {
  id: string
  date: Date
  time: string
  instrument: string
  action: 'Buy' | 'Sell' | 'Long' | 'Short'
  quantity: number
  entryPrice: number
  exitPrice?: number
  profit: number
  commission: number
  mae?: number // Maximum Adverse Excursion
  mfe?: number // Maximum Favorable Excursion
  duration?: number // in minutes
  notes?: string
}

export interface DataQualityReport {
  score: number // 0-100
  totalRows: number
  validRows: number
  invalidRows: number
  
  // Issues found
  issues: {
    type: 'critical' | 'warning' | 'info'
    message: string
    count: number
  }[]
  
  // Data characteristics
  dateRange: {
    start: Date
    end: Date
    tradingDays: number
  }
  
  // Detected patterns
  instrumentsDetected: string[]
  sessionType: 'RTH' | 'ETH' | 'Mixed' | 'Unknown'
  avgTradesPerDay: number
  
  // Bias warnings
  curveFittingScore: number // 0-100, higher = more likely curve fit
  lookAheadRisk: boolean
  survivorshipBiasRisk: boolean
}

interface SessionInfo {
  session_id: string
  filename: string
  created_at: string
}

export interface FullSessionData {
  sessionId: string
  filename: string
  kind: string
  nRows: number
  columns: string[]
  
  // Parsed data
  trades?: ParsedTrade[]
  metrics?: StrategyMetrics
  dataQuality?: DataQualityReport
  
  // Raw CSV content for AI analysis (first 100 rows sample)
  sampleData?: string
}

interface SessionContextType {
  sessionId: string | null
  setSessionId: (id: string | null) => void
  sessions: SessionInfo[]
  isLoadingSessions: boolean
  refreshSessions: () => void
  clearSession: () => void
  
  // Full session data
  currentSession: FullSessionData | null
  setCurrentSession: (data: FullSessionData | null) => void
  setSession: (data: Partial<FullSessionData> & { sessionId: string }) => void
  
  // Update metrics from backend
  updateSessionMetrics: (metrics: Partial<StrategyMetrics>) => void
  
  // Metrics for AI
  getAIContext: () => string
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const [currentSession, setCurrentSessionState] = useState<FullSessionData | null>(null)

  // Fetch all available sessions
  const { data, isLoading, mutate } = useSWR<{ sessions: SessionInfo[] }>(
    '/api/sessions',
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: () => {
        // Silently fail - backend might not be connected
      }
    }
  )

  // Load session from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem('nexural_session_id')
    const storedSession = localStorage.getItem('nexural_current_session')
    
    if (storedId) {
      setSessionIdState(storedId)
    }
    
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession)
        // Restore dates
        if (parsed.trades) {
          parsed.trades = parsed.trades.map((t: ParsedTrade) => ({
            ...t,
            date: new Date(t.date)
          }))
        }
        if (parsed.dataQuality?.dateRange) {
          parsed.dataQuality.dateRange.start = new Date(parsed.dataQuality.dateRange.start)
          parsed.dataQuality.dateRange.end = new Date(parsed.dataQuality.dateRange.end)
        }
        setCurrentSessionState(parsed)
      } catch {
        // Invalid stored session
      }
    }
  }, [])

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id)
    if (id) {
      localStorage.setItem('nexural_session_id', id)
    } else {
      localStorage.removeItem('nexural_session_id')
      localStorage.removeItem('nexural_current_session')
      setCurrentSessionState(null)
    }
  }, [])

  const setCurrentSession = useCallback((data: FullSessionData | null) => {
    setCurrentSessionState(data)
    if (data) {
      // Store session data (without full trade list to save space)
      const toStore = {
        ...data,
        trades: data.trades?.slice(0, 100), // Only store sample for localStorage
      }
      localStorage.setItem('nexural_current_session', JSON.stringify(toStore))
      
      if (data.sessionId) {
        setSessionIdState(data.sessionId)
        localStorage.setItem('nexural_session_id', data.sessionId)
      }
    } else {
      localStorage.removeItem('nexural_current_session')
    }
  }, [])

  const clearSession = useCallback(() => {
    setSessionId(null)
    setCurrentSessionState(null)
  }, [setSessionId])

  // Alias for setCurrentSession with partial data support
  const setSession = useCallback((data: Partial<FullSessionData> & { sessionId: string }) => {
    const fullData: FullSessionData = {
      sessionId: data.sessionId,
      filename: data.filename || 'Unknown',
      kind: data.kind || 'trades',
      nRows: data.nRows || 0,
      columns: data.columns || [],
      trades: data.trades,
      metrics: data.metrics,
      dataQuality: data.dataQuality,
      sampleData: data.sampleData,
    }
    setCurrentSession(fullData)
  }, [setCurrentSession])

  // Update metrics from backend API data
  const updateSessionMetrics = useCallback((metrics: Partial<StrategyMetrics>) => {
    setCurrentSessionState(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        metrics: {
          ...prev.metrics,
          ...metrics,
        } as StrategyMetrics,
      }
      // Also update localStorage
      const toStore = {
        ...updated,
        trades: updated.trades?.slice(0, 100),
      }
      localStorage.setItem('nexural_current_session', JSON.stringify(toStore))
      return updated
    })
  }, [])

  const refreshSessions = useCallback(() => {
    mutate()
  }, [mutate])

  // Generate comprehensive AI context from session data
  const getAIContext = useCallback((): string => {
    if (!currentSession) return 'No strategy data loaded.'
    
    const { metrics, dataQuality, trades, filename, nRows, columns } = currentSession
    
    let context = `## Strategy Analysis: ${filename}\n\n`
    
    // Basic Info
    context += `### Data Overview\n`
    context += `- Total Trades: ${nRows}\n`
    context += `- Columns: ${columns.join(', ')}\n`
    
    // Metrics
    if (metrics) {
      context += `\n### Performance Metrics\n`
      context += `- Net Profit: $${metrics.netProfit.toLocaleString()}\n`
      context += `- CAGR: ${(metrics.cagr * 100).toFixed(2)}%\n`
      context += `- Total Return: ${(metrics.totalReturn * 100).toFixed(2)}%\n`
      context += `- Profit Factor: ${metrics.profitFactor.toFixed(2)}\n`
      
      context += `\n### Risk Metrics\n`
      context += `- Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}\n`
      context += `- Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}\n`
      context += `- Calmar Ratio: ${metrics.calmarRatio.toFixed(2)}\n`
      context += `- Max Drawdown: ${(metrics.maxDrawdownPercent * 100).toFixed(2)}% ($${metrics.maxDrawdown.toLocaleString()})\n`
      context += `- Max Drawdown Duration: ${metrics.maxDrawdownDuration} days\n`
      context += `- Recovery Factor: ${metrics.recoveryFactor.toFixed(2)}\n`
      
      context += `\n### Trade Statistics\n`
      context += `- Win Rate: ${(metrics.winRate * 100).toFixed(1)}%\n`
      context += `- Winning Trades: ${metrics.winningTrades} / Losing Trades: ${metrics.losingTrades}\n`
      context += `- Average Winner: $${metrics.avgWinner.toFixed(2)}\n`
      context += `- Average Loser: $${metrics.avgLoser.toFixed(2)}\n`
      context += `- Largest Winner: $${metrics.largestWinner.toFixed(2)}\n`
      context += `- Largest Loser: $${metrics.largestLoser.toFixed(2)}\n`
      context += `- Average Trade: $${metrics.avgTrade.toFixed(2)}\n`
      context += `- Max Consecutive Losses: ${metrics.maxConsecutiveLosses}\n`
      
      if (metrics.bestHour || metrics.worstHour) {
        context += `\n### Time Analysis\n`
        if (metrics.bestHour) context += `- Best Hour: ${metrics.bestHour}\n`
        if (metrics.worstHour) context += `- Worst Hour: ${metrics.worstHour}\n`
        if (metrics.bestDay) context += `- Best Day: ${metrics.bestDay}\n`
        if (metrics.worstDay) context += `- Worst Day: ${metrics.worstDay}\n`
      }
    }
    
    // Data Quality
    if (dataQuality) {
      context += `\n### Data Quality Assessment\n`
      context += `- Quality Score: ${dataQuality.score}/100\n`
      context += `- Valid Rows: ${dataQuality.validRows} / ${dataQuality.totalRows}\n`
      context += `- Date Range: ${dataQuality.dateRange.start.toLocaleDateString()} to ${dataQuality.dateRange.end.toLocaleDateString()}\n`
      context += `- Trading Days: ${dataQuality.dateRange.tradingDays}\n`
      context += `- Avg Trades/Day: ${dataQuality.avgTradesPerDay.toFixed(1)}\n`
      context += `- Session Type: ${dataQuality.sessionType}\n`
      context += `- Instruments: ${dataQuality.instrumentsDetected.join(', ')}\n`
      
      if (dataQuality.issues.length > 0) {
        context += `\n### Issues Detected\n`
        dataQuality.issues.forEach(issue => {
          context += `- [${issue.type.toUpperCase()}] ${issue.message} (${issue.count} occurrences)\n`
        })
      }
      
      context += `\n### Bias Warnings\n`
      context += `- Curve Fitting Risk Score: ${dataQuality.curveFittingScore}/100\n`
      context += `- Look-Ahead Bias Risk: ${dataQuality.lookAheadRisk ? 'YES - INVESTIGATE' : 'Low'}\n`
      context += `- Survivorship Bias Risk: ${dataQuality.survivorshipBiasRisk ? 'YES - INVESTIGATE' : 'Low'}\n`
    }
    
    // Sample Trades
    if (trades && trades.length > 0) {
      context += `\n### Sample Trades (First 20)\n`
      context += `| Date | Action | Qty | Entry | Exit | Profit | Duration |\n`
      context += `|------|--------|-----|-------|------|--------|----------|\n`
      trades.slice(0, 20).forEach(trade => {
        context += `| ${trade.date.toLocaleDateString()} | ${trade.action} | ${trade.quantity} | $${trade.entryPrice.toFixed(2)} | ${trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'} | $${trade.profit.toFixed(2)} | ${trade.duration ? `${trade.duration}m` : '-'} |\n`
      })
    }
    
    return context
  }, [currentSession])

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        setSessionId,
        sessions: data?.sessions || [],
        isLoadingSessions: isLoading,
        refreshSessions,
        clearSession,
        currentSession,
        setCurrentSession,
        setSession,
        updateSessionMetrics,
        getAIContext,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
