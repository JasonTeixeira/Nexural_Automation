'use client'

import * as React from 'react'
import { Check, ChevronDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface Benchmark {
  id: string
  name: string
  symbol: string
  category: string
}

const benchmarks: Benchmark[] = [
  // Equity Indices
  { id: 'spy', name: 'S&P 500', symbol: 'SPY', category: 'Equity Indices' },
  { id: 'qqq', name: 'NASDAQ 100', symbol: 'QQQ', category: 'Equity Indices' },
  { id: 'iwm', name: 'Russell 2000', symbol: 'IWM', category: 'Equity Indices' },
  { id: 'dia', name: 'Dow Jones', symbol: 'DIA', category: 'Equity Indices' },
  { id: 'vti', name: 'Total Stock Market', symbol: 'VTI', category: 'Equity Indices' },
  
  // International
  { id: 'vxus', name: 'International Stocks', symbol: 'VXUS', category: 'International' },
  { id: 'efa', name: 'Developed Markets', symbol: 'EFA', category: 'International' },
  { id: 'eem', name: 'Emerging Markets', symbol: 'EEM', category: 'International' },
  
  // Fixed Income
  { id: 'agg', name: 'US Aggregate Bonds', symbol: 'AGG', category: 'Fixed Income' },
  { id: 'tlt', name: '20+ Year Treasury', symbol: 'TLT', category: 'Fixed Income' },
  { id: 'lqd', name: 'Investment Grade Corp', symbol: 'LQD', category: 'Fixed Income' },
  
  // Alternative
  { id: 'gld', name: 'Gold', symbol: 'GLD', category: 'Alternative' },
  { id: 'vnq', name: 'Real Estate', symbol: 'VNQ', category: 'Alternative' },
  { id: 'dbc', name: 'Commodities', symbol: 'DBC', category: 'Alternative' },
  
  // Risk-Free
  { id: 'tbill', name: '3-Month T-Bill', symbol: 'BIL', category: 'Risk-Free' },
  { id: 'none', name: 'No Benchmark', symbol: '-', category: 'None' },
]

interface BenchmarkSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function BenchmarkSelector({
  value,
  onChange,
  className,
}: BenchmarkSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedBenchmark = benchmarks.find((b) => b.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between h-9 gap-2', className)}
        >
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">
            {selectedBenchmark ? (
              <>
                <span className="font-medium">{selectedBenchmark.symbol}</span>
                <span className="text-muted-foreground ml-1.5">{selectedBenchmark.name}</span>
              </>
            ) : (
              'Select benchmark'
            )}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search benchmarks..." className="h-9" />
          <CommandList>
            <CommandEmpty>No benchmark found.</CommandEmpty>
            {['Equity Indices', 'International', 'Fixed Income', 'Alternative', 'Risk-Free', 'None'].map((category) => {
              const categoryBenchmarks = benchmarks.filter((b) => b.category === category)
              if (categoryBenchmarks.length === 0) return null
              return (
                <CommandGroup key={category} heading={category}>
                  {categoryBenchmarks.map((benchmark) => (
                    <CommandItem
                      key={benchmark.id}
                      value={benchmark.id}
                      onSelect={() => {
                        onChange(benchmark.id)
                        setOpen(false)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === benchmark.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="font-mono text-xs w-10">{benchmark.symbol}</span>
                      <span className="text-sm">{benchmark.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Toggle version for quick benchmark comparison
export function BenchmarkToggle({
  enabled,
  benchmark,
  onToggle,
  onBenchmarkChange,
  className,
}: {
  enabled: boolean
  benchmark: string
  onToggle: (enabled: boolean) => void
  onBenchmarkChange: (benchmark: string) => void
  className?: string
}) {
  const selectedBenchmark = benchmarks.find((b) => b.id === benchmark)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={enabled ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 gap-2"
        onClick={() => onToggle(!enabled)}
      >
        <div className={cn(
          'h-2 w-2 rounded-full',
          enabled ? 'bg-muted-foreground' : 'bg-muted-foreground/30'
        )} />
        <span className="text-xs">vs {selectedBenchmark?.symbol || 'SPY'}</span>
      </Button>
    </div>
  )
}
