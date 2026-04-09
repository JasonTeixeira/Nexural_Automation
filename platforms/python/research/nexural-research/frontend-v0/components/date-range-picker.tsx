'use client'

import * as React from 'react'
import { format, subDays, subMonths, subYears, startOfYear, startOfMonth, startOfQuarter } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
  align?: 'start' | 'center' | 'end'
}

const presets = [
  { label: '7D', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: '1M', getValue: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
  { label: '3M', getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: '6M', getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: 'YTD', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: 'QTD', getValue: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: 'MTD', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: '1Y', getValue: () => ({ from: subYears(new Date(), 1), to: new Date() }) },
  { label: '3Y', getValue: () => ({ from: subYears(new Date(), 3), to: new Date() }) },
  { label: '5Y', getValue: () => ({ from: subYears(new Date(), 5), to: new Date() }) },
  { label: 'ALL', getValue: () => ({ from: undefined, to: undefined }) },
]

export function DateRangePicker({
  value,
  onChange,
  className,
  align = 'end',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const displayValue = React.useMemo(() => {
    if (!value.from && !value.to) return 'All Time'
    if (value.from && value.to) {
      return `${format(value.from, 'MMM d, yyyy')} - ${format(value.to, 'MMM d, yyyy')}`
    }
    if (value.from) return `From ${format(value.from, 'MMM d, yyyy')}`
    return 'Select range'
  }, [value])

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue()
    onChange(range)
    if (preset.label !== 'Custom') {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal gap-2 h-9',
            !value.from && !value.to && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{displayValue}</span>
          <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex">
          {/* Presets */}
          <div className="border-r border-border p-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-2">
              Quick Select
            </div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.from}
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                onChange({ from: range?.from, to: range?.to })
              }}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Compact version for toolbars
export function DateRangePresets({
  value,
  onChange,
  className,
}: Omit<DateRangePickerProps, 'align'>) {
  const [activePreset, setActivePreset] = React.useState<string>('ALL')

  const compactPresets = presets.filter(p => ['7D', '1M', '3M', 'YTD', '1Y', 'ALL'].includes(p.label))

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-muted/50 rounded-lg', className)}>
      {compactPresets.map((preset) => (
        <Button
          key={preset.label}
          variant={activePreset === preset.label ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => {
            setActivePreset(preset.label)
            onChange(preset.getValue())
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
