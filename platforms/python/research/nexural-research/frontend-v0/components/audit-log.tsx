'use client'

import * as React from 'react'
import { useAudit, actionLabels, type AuditEntry } from '@/lib/audit-context'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { 
  History, 
  Upload, 
  BarChart3, 
  Download, 
  Settings, 
  Filter, 
  GitCompare,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const actionIcons: Record<AuditEntry['action'], React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  analysis: BarChart3,
  export: Download,
  settings_change: Settings,
  filter_change: Filter,
  comparison: GitCompare,
}

interface AuditLogProps {
  sessionId?: string
  maxItems?: number
  compact?: boolean
  className?: string
}

export function AuditLog({
  sessionId,
  maxItems = 50,
  compact = false,
  className,
}: AuditLogProps) {
  const { entries, clearEntries, getEntriesForSession, exportAuditLog } = useAudit()
  const [isOpen, setIsOpen] = React.useState(true)

  const displayEntries = React.useMemo(() => {
    const filtered = sessionId ? getEntriesForSession(sessionId) : entries
    return filtered.slice(0, maxItems)
  }, [entries, sessionId, maxItems, getEntriesForSession])

  const handleExport = () => {
    const csv = exportAuditLog()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-8">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Activity Log</span>
              <span className="text-[10px] text-muted-foreground">({displayEntries.length})</span>
            </div>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 pt-2 max-h-[200px] overflow-y-auto">
            {displayEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No activity yet</p>
            ) : (
              displayEntries.slice(0, 10).map((entry) => {
                const Icon = actionIcons[entry.action]
                return (
                  <div key={entry.id} className="flex items-start gap-2 py-1 text-xs">
                    <Icon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground truncate block">{entry.description}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Panel className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Activity Log</h3>
          <span className="text-xs text-muted-foreground">({displayEntries.length} entries)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-xs gap-1.5">
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearEntries}
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {displayEntries.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your actions will appear here for compliance tracking
            </p>
          </div>
        ) : (
          displayEntries.map((entry, index) => {
            const Icon = actionIcons[entry.action]
            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-start gap-3 py-2.5 px-2 rounded-lg transition-colors',
                  'hover:bg-muted/30'
                )}
              >
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{entry.description}</span>
                    {entry.strategyName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {entry.strategyName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {actionLabels[entry.action]}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            )
          })
        )}
      </div>
    </Panel>
  )
}

// Mini audit log for sidebar
export function AuditLogMini({ sessionId }: { sessionId?: string }) {
  const { entries, getEntriesForSession } = useAudit()
  
  const recentEntries = React.useMemo(() => {
    const filtered = sessionId ? getEntriesForSession(sessionId) : entries
    return filtered.slice(0, 5)
  }, [entries, sessionId, getEntriesForSession])

  return (
    <div className="space-y-1">
      {recentEntries.map((entry) => {
        const Icon = actionIcons[entry.action]
        return (
          <div key={entry.id} className="flex items-center gap-2 text-xs py-1">
            <Icon className="h-3 w-3 text-muted-foreground" />
            <span className="truncate flex-1 text-muted-foreground">{entry.description}</span>
          </div>
        )
      })}
    </div>
  )
}
