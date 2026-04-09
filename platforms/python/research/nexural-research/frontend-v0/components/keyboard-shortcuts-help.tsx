'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts'
import { Kbd } from '@/components/ui/kbd'

export function KeyboardShortcutsHelp() {
  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts()

  // Group shortcuts by category
  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, typeof shortcuts> = {}
    for (const shortcut of shortcuts) {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = []
      }
      groups[shortcut.category].push(shortcut)
    }
    return groups
  }, [shortcuts])

  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    const parts: string[] = []
    if (shortcut.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
    if (shortcut.shift) parts.push('⇧')
    parts.push(shortcut.key.toUpperCase())
    return parts
  }

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-foreground">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {formatShortcut(shortcut).map((key, i) => (
                        <React.Fragment key={i}>
                          <Kbd>{key}</Kbd>
                          {i < formatShortcut(shortcut).length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Press <Kbd>?</Kbd> to toggle this help
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Floating hint for shortcuts
export function ShortcutHint({
  keys,
  className,
}: {
  keys: string[]
  className?: string
}) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <Kbd size="sm">{key}</Kbd>
          {i < keys.length - 1 && <span className="text-muted-foreground/50 text-[10px]">+</span>}
        </React.Fragment>
      ))}
    </div>
  )
}
