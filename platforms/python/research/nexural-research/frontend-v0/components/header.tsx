'use client'

import { cn } from '@/lib/utils'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, FileText, LogOut, Plus, Menu } from 'lucide-react'
import Link from 'next/link'
import { ConnectionStatus, AlertsIndicator } from '@/components/real-time-indicator'
import { AnnotationsPanel } from '@/components/annotations-panel'
import { CommandPaletteHint } from '@/components/command-palette'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  className?: string
}

export function Header({ onMenuClick, showMenuButton = false, className }: HeaderProps) {
  const { sessionId, sessions, setSessionId, clearSession } = useSession()

  const currentSession = sessions.find((s) => s.session_id === sessionId)

  return (
    <header
      className={cn(
        'flex items-center justify-between h-14 px-4 lg:px-6 bg-background border-b border-border',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Session Picker */}
        {sessionId && sessions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[200px] truncate text-sm">
                  {currentSession?.filename || 'Select Session'}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Active Sessions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sessions.map((session) => (
                <DropdownMenuItem
                  key={session.session_id}
                  onClick={() => setSessionId(session.session_id)}
                  className={cn(
                    'cursor-pointer',
                    session.session_id === sessionId && 'bg-accent'
                  )}
                >
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{session.filename}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload New
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Command Palette */}
        <CommandPaletteHint />
        
        {/* Real-time Connection Status */}
        <div className="hidden md:block">
          <ConnectionStatus />
        </div>
        
        {/* Annotations */}
        {sessionId && (
          <div className="hidden sm:block">
            <AnnotationsPanel />
          </div>
        )}
        
        {/* Alerts */}
        <AlertsIndicator />
        
        {/* Session Actions */}
        {sessionId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSession}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">New Analysis</span>
          </Button>
        )}
      </div>
    </header>
  )
}
