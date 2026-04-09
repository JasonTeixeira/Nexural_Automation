'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface AccessibilityContextType {
  // Screen reader announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  
  // Focus management
  focusElement: (selector: string) => void
  trapFocus: (containerId: string) => () => void
  
  // User preferences
  reducedMotion: boolean
  highContrast: boolean
  
  // Skip link
  skipToMain: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [announcements, setAnnouncements] = useState<{ id: number; message: string; priority: string }[]>([])

  // Detect user preferences
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: more)')
    
    setReducedMotion(motionQuery.matches)
    setHighContrast(contrastQuery.matches)
    
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    const handleContrastChange = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    
    motionQuery.addEventListener('change', handleMotionChange)
    contrastQuery.addEventListener('change', handleContrastChange)
    
    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = Date.now()
    setAnnouncements(prev => [...prev, { id, message, priority }])
    
    // Clear after announcement
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 1000)
  }, [])

  // Focus management
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // Focus trap for modals
  const trapFocus = useCallback((containerId: string) => {
    const container = document.getElementById(containerId)
    if (!container) return () => {}

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Skip to main content
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main') as HTMLElement
    if (main) {
      main.tabIndex = -1
      main.focus()
      main.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return (
    <AccessibilityContext.Provider
      value={{
        announce,
        focusElement,
        trapFocus,
        reducedMotion,
        highContrast,
        skipToMain,
      }}
    >
      {/* Skip link */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          skipToMain()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Live region for announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcements.filter(a => a.priority === 'polite').map(a => (
          <div key={a.id}>{a.message}</div>
        ))}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcements.filter(a => a.priority === 'assertive').map(a => (
          <div key={a.id}>{a.message}</div>
        ))}
      </div>

      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Hook for announcing state changes
export function useAnnounce() {
  const { announce } = useAccessibility()
  return announce
}

// Hook for reduced motion preference
export function useReducedMotion() {
  const { reducedMotion } = useAccessibility()
  return reducedMotion
}
