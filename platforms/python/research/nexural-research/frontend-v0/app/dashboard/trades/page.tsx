'use client'

import { useSession } from '@/lib/session-context'
import { Panel } from '@/components/panel'
import { GradeBadge } from '@/components/grade-badge'
import { formatPercent, formatCurrency, formatNumber, formatDate } from '@/lib/format'
import { Table, Filter, Download, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'
import type { Trade } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type SortField = 'date' | 'symbol' | 'side' | 'pnl' | 'pnl_percent' | 'duration' | 'size'
type SortDirection = 'asc' | 'desc'

interface TradeLogResponse {
  trades: Trade[]
  total_trades: number
  winning_trades: number
  losing_trades: number
  total_pnl: number
  largest_win: number
  largest_loss: number
  avg_winner: number
  avg_loser: number
}

export default function TradesPage() {
  const { sessionId } = useSession()
  const { data, error, isLoading } = useSWR<TradeLogResponse>(
    sessionId ? `/api/charts/trades?session_id=${sessionId}` : null,
    fetcher
  )

  // State
  const [search, setSearch] = useState('')
  const [sideFilter, setSideFilter] = useState<'all' | 'long' | 'short'>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'winner' | 'loser'>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // Filtered and sorted trades
  const processedTrades = useMemo(() => {
    if (!data?.trades) return []
    
    let result = [...data.trades]
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(t => 
        t.symbol?.toLowerCase().includes(searchLower) ||
        t.trade_id?.toLowerCase().includes(searchLower)
      )
    }
    
    // Side filter
    if (sideFilter !== 'all') {
      result = result.filter(t => t.side?.toLowerCase() === sideFilter)
    }
    
    // Outcome filter
    if (outcomeFilter === 'winner') {
      result = result.filter(t => (t.pnl ?? 0) > 0)
    } else if (outcomeFilter === 'loser') {
      result = result.filter(t => (t.pnl ?? 0) < 0)
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0
      
      switch (sortField) {
        case 'date':
          aVal = new Date(a.entry_date || 0).getTime()
          bVal = new Date(b.entry_date || 0).getTime()
          break
        case 'symbol':
          aVal = a.symbol || ''
          bVal = b.symbol || ''
          break
        case 'side':
          aVal = a.side || ''
          bVal = b.side || ''
          break
        case 'pnl':
          aVal = a.pnl ?? 0
          bVal = b.pnl ?? 0
          break
        case 'pnl_percent':
          aVal = a.pnl_percent ?? 0
          bVal = b.pnl_percent ?? 0
          break
        case 'duration':
          aVal = a.duration_hours ?? 0
          bVal = b.duration_hours ?? 0
          break
        case 'size':
          aVal = a.size ?? 0
          bVal = b.size ?? 0
          break
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }
      
      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal
    })
    
    return result
  }, [data?.trades, search, sideFilter, outcomeFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(processedTrades.length / pageSize)
  const paginatedTrades = processedTrades.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />
  }

  const clearFilters = () => {
    setSearch('')
    setSideFilter('all')
    setOutcomeFilter('all')
  }

  const hasActiveFilters = search || sideFilter !== 'all' || outcomeFilter !== 'all'

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Table className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Strategy Loaded</h2>
          <p className="text-sm text-muted-foreground">Upload a CSV file to view trade log</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete trade history with filtering and analysis
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="text-lg font-mono font-semibold mt-0.5">{formatNumber(data.total_trades)}</div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Winners</div>
            <div className="text-lg font-mono font-semibold text-profit mt-0.5">{formatNumber(data.winning_trades)}</div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Losers</div>
            <div className="text-lg font-mono font-semibold text-loss mt-0.5">{formatNumber(data.losing_trades)}</div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</div>
            <div className="text-lg font-mono font-semibold mt-0.5">
              {formatPercent(data.winning_trades / data.total_trades)}
            </div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P&L</div>
            <div className={`text-lg font-mono font-semibold mt-0.5 ${data.total_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(data.total_pnl)}
            </div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Largest Win</div>
            <div className="text-lg font-mono font-semibold text-profit mt-0.5">{formatCurrency(data.largest_win)}</div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Largest Loss</div>
            <div className="text-lg font-mono font-semibold text-loss mt-0.5">{formatCurrency(data.largest_loss)}</div>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit Factor</div>
            <div className="text-lg font-mono font-semibold mt-0.5">
              {data.avg_loser !== 0 ? formatNumber(Math.abs(data.avg_winner / data.avg_loser), 2) : '-'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Panel>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or trade ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sideFilter} onValueChange={(v) => setSideFilter(v as typeof sideFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sides</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as typeof outcomeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              <SelectItem value="winner">Winners</SelectItem>
              <SelectItem value="loser">Losers</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </Panel>

      {/* Table */}
      <Panel className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-muted-foreground">
            Failed to load trade data
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        Date <SortIcon field="date" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('symbol')}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        Symbol <SortIcon field="symbol" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('side')}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        Side <SortIcon field="side" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('size')}
                        className="flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors"
                      >
                        Size <SortIcon field="size" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Entry</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Exit</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('pnl')}
                        className="flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors"
                      >
                        P&L <SortIcon field="pnl" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('pnl_percent')}
                        className="flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors"
                      >
                        P&L % <SortIcon field="pnl_percent" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      <button 
                        onClick={() => handleSort('duration')}
                        className="flex items-center gap-1.5 ml-auto hover:text-foreground transition-colors"
                      >
                        Duration <SortIcon field="duration" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrades.map((trade, idx) => (
                    <tr 
                      key={trade.trade_id || idx}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        {trade.entry_date ? formatDate(trade.entry_date) : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium">{trade.symbol || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          trade.side?.toLowerCase() === 'long' 
                            ? 'bg-profit/10 text-profit' 
                            : 'bg-loss/10 text-loss'
                        }`}>
                          {trade.side || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{formatNumber(trade.size ?? 0)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(trade.entry_price ?? 0)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(trade.exit_price ?? 0)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-medium ${
                        (trade.pnl ?? 0) >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {formatCurrency(trade.pnl ?? 0)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono ${
                        (trade.pnl_percent ?? 0) >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {formatPercent(trade.pnl_percent ?? 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {trade.duration_hours ? `${formatNumber(trade.duration_hours, 1)}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, processedTrades.length)} of {processedTrades.length} trades
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
