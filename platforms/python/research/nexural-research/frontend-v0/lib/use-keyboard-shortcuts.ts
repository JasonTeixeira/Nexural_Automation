'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type KeyHandler = (event: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: KeyHandler
  description: string
  category: string
}

// Global keyboard shortcuts
export function useKeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: 'g', meta: true, handler: () => router.push('/dashboard'), description: 'Go to Overview', category: 'Navigation' },
    { key: '1', meta: true, handler: () => router.push('/dashboard'), description: 'Overview', category: 'Navigation' },
    { key: '2', meta: true, handler: () => router.push('/dashboard/advanced'), description: 'Advanced Metrics', category: 'Navigation' },
    { key: '3', meta: true, handler: () => router.push('/dashboard/monte-carlo'), description: 'Monte Carlo', category: 'Navigation' },
    { key: '4', meta: true, handler: () => router.push('/dashboard/trades'), description: 'Trade Log', category: 'Navigation' },
    
    // Actions
    { key: '/', handler: () => document.getElementById('global-search')?.focus(), description: 'Focus search', category: 'Actions' },
    { key: 'Escape', handler: () => document.activeElement instanceof HTMLElement && document.activeElement.blur(), description: 'Clear focus', category: 'Actions' },
    { key: '?', shift: true, handler: () => setShowHelp(prev => !prev), description: 'Show keyboard shortcuts', category: 'Actions' },
    
    // Analysis
    { key: 'b', alt: true, handler: () => document.dispatchEvent(new CustomEvent('toggle-benchmark')), description: 'Toggle benchmark', category: 'Analysis' },
    { key: 'r', alt: true, handler: () => window.location.reload(), description: 'Refresh data', category: 'Analysis' },
    { key: 'e', meta: true, handler: () => router.push('/dashboard/export'), description: 'Export data', category: 'Analysis' },
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (event.key === 'Escape') {
          ;(event.target as HTMLElement).blur()
        }
        return
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : !(event.metaKey || event.ctrlKey)
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        if (event.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.handler(event)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, shortcuts])

  return { shortcuts, showHelp, setShowHelp }
}

// Hook for single key binding
export function useKeyPress(targetKey: string, handler: () => void, options?: { ctrl?: boolean; meta?: boolean; shift?: boolean }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const metaMatch = options?.meta ? (event.metaKey || event.ctrlKey) : true
      const shiftMatch = options?.shift ? event.shiftKey : true

      if (event.key.toLowerCase() === targetKey.toLowerCase() && metaMatch && shiftMatch) {
        event.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [targetKey, handler, options])
}

// Announce to screen readers
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return announce
}

// Focus trap for modals
export function useFocusTrap(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => element.removeEventListener('keydown', handleKeyDown)
  }, [ref])
}
