'use client'

import { cn } from '@/lib/utils'
import { type Grade } from '@/lib/types'

interface GradeBadgeProps {
  grade: Grade
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  className?: string
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  A: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  'A-': {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  'B+': {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  B: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  'B-': {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  'C+': {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  C: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  'C-': {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  'D+': {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  D: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  'D-': {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  F: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
}

export function GradeBadge({ grade, size = 'md', showLabel = false, className }: GradeBadgeProps) {
  const colors = gradeColors[grade] || gradeColors.F
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-14 w-14 text-xl',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg font-bold font-mono border',
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size]
        )}
      >
        {grade}
      </div>
      {showLabel && (
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Grade
        </span>
      )}
    </div>
  )
}

// Skeleton for grade badge
export function GradeBadgeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-14 w-14',
  }

  return (
    <div
      className={cn(
        'rounded-lg bg-muted animate-pulse',
        sizeClasses[size]
      )}
    />
  )
}
