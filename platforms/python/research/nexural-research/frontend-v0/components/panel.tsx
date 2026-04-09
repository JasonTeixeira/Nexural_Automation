'use client'

import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface PanelProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerAction?: ReactNode
  noPadding?: boolean
}

export function Panel({
  title,
  description,
  children,
  className,
  headerAction,
  noPadding = false,
}: PanelProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded-2xl border border-border',
        !noPadding && 'p-6',
        className
      )}
    >
      {(title || headerAction) && (
        <div className={cn('flex items-center justify-between', noPadding && 'px-6 pt-6')}>
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn((title || headerAction) && !noPadding && 'mt-4')}>
        {children}
      </div>
    </div>
  )
}

// Skeleton loader for panel
export function PanelSkeleton({
  className,
  height = 200,
}: {
  className?: string
  height?: number
}) {
  return (
    <div
      className={cn(
        'bg-surface rounded-2xl border border-border p-6 animate-pulse',
        className
      )}
      style={{ height }}
    >
      <div className="h-4 w-32 bg-muted rounded mb-4" />
      <div className="h-full w-full bg-muted/50 rounded-lg" />
    </div>
  )
}
