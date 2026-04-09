"use client"

import { useState, useMemo } from "react"
import { useSession } from "@/lib/session-context"
import { useTradeLog } from "@/lib/api"
import { Panel } from "@/components/panel"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatPercent, formatCurrency, formatDate } from "@/lib/format"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from "lucide-react"

type SortField = "entry_date" | "exit_date" | "pnl" | "pnl_pct" | "duration" | "mae" | "mfe"
type SortDir = "asc" | "desc"

export default function TradeLogPage() {
  const { sessionId } = useSession()
  const { data, isLoading, error } = useTradeLog(sessionId)
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("exit_date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [filterWinners, setFilterWinners] = useState<"all" | "winners" | "losers">("all")

  const filteredAndSorted = useMemo(() => {
    if (!data?.trades) return []
    
    let trades = [...data.trades]
    
    // Filter by search
    if (search) {
      const q = search.toLowerCase()
      trades = trades.filter(t => 
        t.symbol?.toLowerCase().includes(q) || 
        t.side?.toLowerCase().includes(q)
      )
    }
    
    // Filter winners/losers
    if (filterWinners === "winners") {
      trades = trades.filter(t => t.pnl >= 0)
    } else if (filterWinners === "losers") {
      trades = trades.filter(t => t.pnl < 0)
    }
    
    // Sort
    trades.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === "entry_date" || sortField === "exit_date") {
        aVal = new Date(aVal as string).getTime()
        bVal = new Date(bVal as string).getTime()
      }
      
      if (sortDir === "asc") {
        return (aVal as number) - (bVal as number)
      }
      return (bVal as number) - (aVal as number)
    })
    
    return trades
  }, [data?.trades, search, sortField, sortDir, filterWinners])

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize)
  const paginatedTrades = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No strategy loaded. Please upload a strategy first.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Failed to load trade log data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Trade Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete trade history with {data.trades.length} trades
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-foreground">{data.trades.length}</div>
          <div className="text-xs text-muted-foreground">Total Trades</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-positive">
            {data.trades.filter(t => t.pnl >= 0).length}
          </div>
          <div className="text-xs text-muted-foreground">Winners</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-negative">
            {data.trades.filter(t => t.pnl < 0).length}
          </div>
          <div className="text-xs text-muted-foreground">Losers</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatPercent(data.trades.filter(t => t.pnl >= 0).length / data.trades.length)}
          </div>
          <div className="text-xs text-muted-foreground">Win Rate</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-positive">
            {formatCurrency(data.trades.filter(t => t.pnl >= 0).reduce((s, t) => s + t.pnl, 0) / data.trades.filter(t => t.pnl >= 0).length || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Avg Win</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-2xl font-bold font-mono text-negative">
            {formatCurrency(data.trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0) / data.trades.filter(t => t.pnl < 0).length || 0)}
          </div>
          <div className="text-xs text-muted-foreground">Avg Loss</div>
        </div>
      </div>

      {/* Filters & Search */}
      <Panel>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or side..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => { setFilterWinners("all"); setPage(1) }}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  filterWinners === "all" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setFilterWinners("winners"); setPage(1) }}
                className={`px-3 py-1.5 text-sm transition-colors border-x border-border ${
                  filterWinners === "winners" 
                    ? "bg-positive text-white" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Winners
              </button>
              <button
                onClick={() => { setFilterWinners("losers"); setPage(1) }}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  filterWinners === "losers" 
                    ? "bg-negative text-white" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Losers
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Trade Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">#</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Symbol</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Side</th>
                <th 
                  className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("entry_date")}
                >
                  <div className="flex items-center gap-1">
                    Entry <SortIcon field="entry_date" />
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("exit_date")}
                >
                  <div className="flex items-center gap-1">
                    Exit <SortIcon field="exit_date" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("duration")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Duration <SortIcon field="duration" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Entry Price</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Exit Price</th>
                <th 
                  className="text-right py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("pnl")}
                >
                  <div className="flex items-center justify-end gap-1">
                    PnL <SortIcon field="pnl" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("pnl_pct")}
                >
                  <div className="flex items-center justify-end gap-1">
                    PnL % <SortIcon field="pnl_pct" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("mae")}
                >
                  <div className="flex items-center justify-end gap-1">
                    MAE <SortIcon field="mae" />
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("mfe")}
                >
                  <div className="flex items-center justify-end gap-1">
                    MFE <SortIcon field="mfe" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((trade, idx) => (
                <tr 
                  key={trade.id || idx} 
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">{trade.symbol}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.side === "LONG" 
                        ? "bg-positive/20 text-positive" 
                        : "bg-negative/20 text-negative"
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDate(trade.entry_date)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDate(trade.exit_date)}</td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {trade.duration}d
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-foreground">
                    {formatCurrency(trade.entry_price)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-foreground">
                    {formatCurrency(trade.exit_price)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${trade.pnl >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatCurrency(trade.pnl)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${trade.pnl_pct >= 0 ? "text-positive" : "text-negative"}`}>
                    {formatPercent(trade.pnl_pct)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-negative">
                    {formatPercent(trade.mae)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-positive">
                    {formatPercent(trade.mfe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} trades
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
