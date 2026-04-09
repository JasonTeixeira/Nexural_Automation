'use client'

import * as React from 'react'

export interface AuditEntry {
  id: string
  timestamp: Date
  action: 'upload' | 'analysis' | 'export' | 'settings_change' | 'filter_change' | 'comparison'
  description: string
  details?: Record<string, unknown>
  sessionId?: string
  strategyName?: string
}

interface AuditContextValue {
  entries: AuditEntry[]
  addEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void
  clearEntries: () => void
  getEntriesForSession: (sessionId: string) => AuditEntry[]
  exportAuditLog: () => string
}

const AuditContext = React.createContext<AuditContextValue | undefined>(undefined)

const MAX_ENTRIES = 1000

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = React.useState<AuditEntry[]>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexural_audit_log')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return parsed.map((e: AuditEntry) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }))
        } catch {
          return []
        }
      }
    }
    return []
  })

  // Persist to localStorage
  React.useEffect(() => {
    localStorage.setItem('nexural_audit_log', JSON.stringify(entries))
  }, [entries])

  const addEntry = React.useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    
    setEntries((prev) => {
      const updated = [newEntry, ...prev]
      // Limit entries to prevent unbounded growth
      return updated.slice(0, MAX_ENTRIES)
    })
  }, [])

  const clearEntries = React.useCallback(() => {
    setEntries([])
    localStorage.removeItem('nexural_audit_log')
  }, [])

  const getEntriesForSession = React.useCallback((sessionId: string) => {
    return entries.filter((e) => e.sessionId === sessionId)
  }, [entries])

  const exportAuditLog = React.useCallback(() => {
    const csv = [
      ['Timestamp', 'Action', 'Description', 'Strategy', 'Session ID', 'Details'].join(','),
      ...entries.map((e) => [
        e.timestamp.toISOString(),
        e.action,
        `"${e.description}"`,
        e.strategyName || '',
        e.sessionId || '',
        e.details ? `"${JSON.stringify(e.details)}"` : '',
      ].join(',')),
    ].join('\n')
    
    return csv
  }, [entries])

  return (
    <AuditContext.Provider
      value={{
        entries,
        addEntry,
        clearEntries,
        getEntriesForSession,
        exportAuditLog,
      }}
    >
      {children}
    </AuditContext.Provider>
  )
}

export function useAudit() {
  const context = React.useContext(AuditContext)
  if (context === undefined) {
    throw new Error('useAudit must be used within an AuditProvider')
  }
  return context
}

// Formatted action names for display
export const actionLabels: Record<AuditEntry['action'], string> = {
  upload: 'File Upload',
  analysis: 'Analysis Run',
  export: 'Data Export',
  settings_change: 'Settings Changed',
  filter_change: 'Filters Updated',
  comparison: 'Strategy Comparison',
}
