'use client'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  tooltip?: string
  valueColor?: 'default' | 'profit' | 'loss' | 'warning' | 'info'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MetricCard({
  label,
  value,
  tooltip,
  valueColor = 'default',
  trend,
  trendValue,
  size = 'md',
  className,
}: MetricCardProps) {
  const valueColorClasses = {
    default: 'text-foreground',
    profit: 'text-profit',
    loss: 'text-loss',
    warning: 'text-warning',
    info: 'text-info',
  }

  const sizeClasses = {
    sm: {
      card: 'p-3',
      label: 'text-[9px]',
      value: 'text-lg',
    },
    md: {
      card: 'p-4',
      label: 'text-[10px]',
      value: 'text-xl',
    },
    lg: {
      card: 'p-5',
      label: 'text-[11px]',
      value: 'text-2xl',
    },
  }

  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-border transition-colors hover:border-border-hover',
        sizeClasses[size].card,
        className
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={cn(
            'uppercase tracking-[0.15em] text-muted-foreground font-medium',
            sizeClasses[size].label
          )}
        >
          {label}
        </span>
        {tooltip && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs bg-popover border-border text-sm"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono font-semibold tracking-tight',
            sizeClasses[size].value,
            valueColorClasses[valueColor]
          )}
        >
          {value}
        </span>
        {trend && trendValue && (
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up' && 'text-profit',
              trend === 'down' && 'text-loss',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}

// Skeleton loader for metric card
export function MetricCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'p-3 h-[72px]',
    md: 'p-4 h-[84px]',
    lg: 'p-5 h-[96px]',
  }

  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-border animate-pulse',
        sizeClasses[size]
      )}
    >
      <div className="h-3 w-20 bg-muted rounded mb-3" />
      <div className="h-6 w-24 bg-muted rounded" />
    </div>
  )
}
