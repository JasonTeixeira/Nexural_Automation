'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// Fade in on mount
export function FadeIn({
  children,
  delay = 0,
  duration = 200,
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-opacity',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Slide up on mount
export function SlideUp({
  children,
  delay = 0,
  duration = 300,
  distance = 20,
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  distance?: number
  className?: string
}) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn('transition-all', className)}
      style={{
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : `translateY(${distance}px)`,
      }}
    >
      {children}
    </div>
  )
}

// Scale on hover
export function ScaleOnHover({
  children,
  scale = 1.02,
  className,
}: {
  children: React.ReactNode
  scale?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out hover:scale-[var(--hover-scale)]',
        className
      )}
      style={{ '--hover-scale': scale } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// Stagger children animations
export function StaggerChildren({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className,
}: {
  children: React.ReactNode
  staggerDelay?: number
  initialDelay?: number
  className?: string
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <SlideUp key={index} delay={initialDelay + index * staggerDelay}>
          {child}
        </SlideUp>
      ))}
    </div>
  )
}

// Count up animation for numbers
export function CountUp({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const startTime = React.useRef<number | null>(null)
  const animationFrame = React.useRef<number | null>(null)

  React.useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(eased * value)
      
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      }
    }

    startTime.current = null
    animationFrame.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// Animated metric value with color transition
export function AnimatedValue({
  value,
  previousValue,
  formatter = (v) => String(v),
  className,
}: {
  value: number
  previousValue?: number
  formatter?: (value: number) => string
  className?: string
}) {
  const [flash, setFlash] = React.useState<'up' | 'down' | null>(null)

  React.useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      setFlash(value > previousValue ? 'up' : 'down')
      const timer = setTimeout(() => setFlash(null), 500)
      return () => clearTimeout(timer)
    }
  }, [value, previousValue])

  return (
    <span
      className={cn(
        'transition-colors duration-300',
        flash === 'up' && 'text-profit',
        flash === 'down' && 'text-loss',
        className
      )}
    >
      {formatter(value)}
    </span>
  )
}

// Pulse animation for attention
export function Pulse({
  children,
  active = true,
  className,
}: {
  children: React.ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div className={cn(active && 'animate-pulse', className)}>
      {children}
    </div>
  )
}

// Glow effect on hover
export function GlowOnHover({
  children,
  color = 'primary',
  className,
}: {
  children: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
}) {
  const glowColors = {
    primary: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    success: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    warning: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    destructive: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  }

  return (
    <div className={cn('transition-shadow duration-300', glowColors[color], className)}>
      {children}
    </div>
  )
}

// Border glow effect for cards
export function GlowBorder({
  children,
  active = false,
  color = 'primary',
  className,
}: {
  children: React.ReactNode
  active?: boolean
  color?: 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
}) {
  const borderColors = {
    primary: 'border-primary/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    success: 'border-success/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    warning: 'border-warning/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    destructive: 'border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  }

  return (
    <div
      className={cn(
        'border rounded-xl transition-all duration-300',
        active ? borderColors[color] : 'border-border',
        className
      )}
    >
      {children}
    </div>
  )
}

// Intersection observer hook for scroll animations
export function useInView(ref: React.RefObject<HTMLElement>, options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        observer.disconnect()
      }
    }, options)

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, options])

  return isInView
}

// Animate on scroll into view
export function AnimateOnScroll({
  children,
  animation = 'fade',
  className,
}: {
  children: React.ReactNode
  animation?: 'fade' | 'slide' | 'scale'
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { threshold: 0.1 })

  const animations = {
    fade: {
      initial: 'opacity-0',
      animate: 'opacity-100',
    },
    slide: {
      initial: 'opacity-0 translate-y-4',
      animate: 'opacity-100 translate-y-0',
    },
    scale: {
      initial: 'opacity-0 scale-95',
      animate: 'opacity-100 scale-100',
    },
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500',
        isInView ? animations[animation].animate : animations[animation].initial,
        className
      )}
    >
      {children}
    </div>
  )
}
