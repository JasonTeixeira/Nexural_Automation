'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// Animated skeleton with shimmer effect
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/50 rounded',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:animate-[shimmer_1.5s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className
      )}
    />
  )
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <div className="bg-card/50 border border-border/50 rounded-xl p-4 space-y-3">
      <ShimmerSkeleton className="h-3 w-20" />
      <ShimmerSkeleton className="h-8 w-24" />
      <ShimmerSkeleton className="h-2 w-16" />
    </div>
  )
}

// Chart skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <ShimmerSkeleton className="absolute inset-0 rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <ShimmerSkeleton 
              key={colIndex} 
              className="h-4 flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Panel skeleton
export function PanelSkeleton({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-card/50 border border-border/50 rounded-xl p-5',
      className
    )}>
      {children || (
        <div className="space-y-4">
          <ShimmerSkeleton className="h-5 w-32" />
          <ShimmerSkeleton className="h-[200px] w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}

// Grid of metric cards skeleton
export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Full page loading state
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-7 w-48" />
          <ShimmerSkeleton className="h-4 w-64" />
        </div>
        <ShimmerSkeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Metrics grid */}
      <MetricGridSkeleton count={4} />

      {/* Main chart */}
      <PanelSkeleton>
        <ChartSkeleton height={350} />
      </PanelSkeleton>

      {/* Secondary panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelSkeleton>
          <ChartSkeleton height={200} />
        </PanelSkeleton>
        <PanelSkeleton>
          <TableSkeleton rows={5} columns={3} />
        </PanelSkeleton>
      </div>
    </div>
  )
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted/50 mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {action}
    </div>
  )
}

// Loading overlay for async operations
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}

// Progress indicator for long operations
export function ProgressIndicator({ 
  progress, 
  message 
}: { 
  progress: number
  message?: string 
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-2 w-48 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {message || `${Math.round(progress)}%`}
      </span>
    </div>
  )
}
