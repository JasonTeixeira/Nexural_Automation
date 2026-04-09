'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronUp,
  ChevronDown,
  Search,
  Download,
  Filter,
  X,
} from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode
  className?: string
}

export interface VirtualizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  rowHeight?: number
  className?: string
  onRowClick?: (row: T, index: number) => void
  getRowClassName?: (row: T, index: number) => string
  emptyMessage?: string
  searchable?: boolean
  exportable?: boolean
  stickyHeader?: boolean
}

type SortDirection = 'asc' | 'desc' | null
type SortState = { key: string; direction: SortDirection }

export function VirtualizedTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight = 44,
  className,
  onRowClick,
  getRowClassName,
  emptyMessage = 'No data available',
  searchable = true,
  exportable = true,
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [sort, setSort] = useState<SortState>({ key: '', direction: null })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data]
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key as keyof T]
          return String(value).toLowerCase().includes(searchLower)
        })
      )
    }
    
    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((row) => {
          const cellValue = row[key as keyof T]
          return String(cellValue).toLowerCase().includes(value.toLowerCase())
        })
      }
    })
    
    // Apply sort
    if (sort.key && sort.direction) {
      result.sort((a, b) => {
        const aVal = a[sort.key as keyof T]
        const bVal = b[sort.key as keyof T]
        
        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal
        }
        
        // Handle dates
        if (aVal instanceof Date && bVal instanceof Date) {
          return sort.direction === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime()
        }
        
        // Handle strings
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sort.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
    }
    
    return result
  }, [data, columns, search, filters, sort])
  
  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })
  
  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  
  // Handle sort
  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return { key: '', direction: null }
    })
  }, [])
  
  // Handle export
  const handleExport = useCallback(() => {
    const headers = columns.map((c) => c.header).join(',')
    const rows = processedData.map((row) =>
      columns.map((col) => {
        const value = row[col.key as keyof T]
        // Escape commas and quotes
        const str = String(value ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [columns, processedData])
  
  // Calculate column widths
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || col.minWidth || 120), 0)
  }, [columns])
  
  // Get cell value
  const getCellValue = (row: T, col: Column<T>, index: number) => {
    const value = row[col.key as keyof T]
    if (col.render) {
      return col.render(value, row, index)
    }
    if (value === null || value === undefined) {
      return '-'
    }
    if (typeof value === 'number') {
      // Format numbers nicely
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      }
      return value.toFixed(2)
    }
    if (value instanceof Date) {
      return value.toLocaleString()
    }
    return String(value)
  }
  
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div className="flex items-center gap-3 mb-4">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all columns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'bg-muted')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).some(Boolean) && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </Button>
          
          {exportable && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          
          <div className="text-sm text-muted-foreground ml-auto">
            {processedData.length.toLocaleString()} rows
            {processedData.length !== data.length && (
              <span className="text-muted-foreground/60">
                {' '}(of {data.length.toLocaleString()})
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Column Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg border border-border bg-muted/30">
          {columns.filter(c => c.filterable !== false).map((col) => (
            <div key={String(col.key)} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{col.header}:</span>
              <Input
                placeholder={`Filter ${col.header}...`}
                value={filters[String(col.key)] || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    [String(col.key)]: e.target.value,
                  }))
                }
                className="h-8 w-32 text-sm"
              />
            </div>
          ))}
          {Object.values(filters).some(Boolean) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({})}
              className="h-8"
            >
              Clear All
            </Button>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            'flex border-b border-border bg-muted/50',
            stickyHeader && 'sticky top-0 z-10'
          )}
          style={{ minWidth: totalWidth }}
        >
          {columns.map((col) => (
            <div
              key={String(col.key)}
              className={cn(
                'flex items-center gap-1 px-3 py-3 font-medium text-sm text-muted-foreground',
                col.sortable !== false && 'cursor-pointer hover:text-foreground',
                col.align === 'center' && 'justify-center',
                col.align === 'right' && 'justify-end',
                col.className
              )}
              style={{
                width: col.width || col.minWidth || 120,
                minWidth: col.minWidth || 80,
              }}
              onClick={() => col.sortable !== false && handleSort(String(col.key))}
            >
              <span>{col.header}</span>
              {col.sortable !== false && sort.key === String(col.key) && (
                sort.direction === 'asc' ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              )}
            </div>
          ))}
        </div>
        
        {/* Body */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 400px)', minHeight: 200 }}
        >
          {processedData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div
              style={{
                height: totalSize,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualRows.map((virtualRow) => {
                const row = processedData[virtualRow.index]
                const rowClassName = getRowClassName?.(row, virtualRow.index)
                
                return (
                  <div
                    key={virtualRow.key}
                    className={cn(
                      'absolute top-0 left-0 flex border-b border-border/50 hover:bg-muted/30 transition-colors',
                      onRowClick && 'cursor-pointer',
                      virtualRow.index % 2 === 0 && 'bg-muted/10',
                      rowClassName
                    )}
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                      minWidth: totalWidth,
                    }}
                    onClick={() => onRowClick?.(row, virtualRow.index)}
                  >
                    {columns.map((col) => (
                      <div
                        key={String(col.key)}
                        className={cn(
                          'flex items-center px-3 text-sm truncate',
                          col.align === 'center' && 'justify-center',
                          col.align === 'right' && 'justify-end',
                          col.className
                        )}
                        style={{
                          width: col.width || col.minWidth || 120,
                          minWidth: col.minWidth || 80,
                        }}
                      >
                        {getCellValue(row, col, virtualRow.index)}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
