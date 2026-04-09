'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { SessionProvider, useSession } from '@/lib/session-context'
import { AnalysisProvider } from '@/lib/analysis-context'
import { AuditProvider } from '@/lib/audit-context'
import { ChartBrushProvider } from '@/lib/chart-brush-context'
import { WebSocketProvider } from '@/lib/websocket-context'
import { AnnotationsProvider } from '@/lib/annotations-context'
import { ErrorBoundary } from '@/components/error-boundary'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'
import { AnnotationsPanel } from '@/components/annotations-panel'
import { ConnectionStatus, AlertsIndicator } from '@/components/real-time-indicator'
import { CommandPalette } from '@/components/command-palette'
import { APIKeysProvider } from '@/lib/api-keys-context'
import { cn } from '@/lib/utils'

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { sessionId } = useSession()
  const router = useRouter()

  // Redirect to upload if no session
  useEffect(() => {
    if (!sessionId) {
      router.push('/')
    }
  }, [sessionId, router])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-[260px] lg:flex-shrink-0">
        <Sidebar className="w-full" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar className="h-full" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          showMenuButton
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1800px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <AnalysisProvider>
        <AuditProvider>
          <ChartBrushProvider>
            <WebSocketProvider>
              <AnnotationsProvider>
                <APIKeysProvider>
                  <ErrorBoundary>
                    <DashboardLayoutInner>{children}</DashboardLayoutInner>
                    <KeyboardShortcutsHelp />
                    <CommandPalette />
                  </ErrorBoundary>
                </APIKeysProvider>
              </AnnotationsProvider>
            </WebSocketProvider>
          </ChartBrushProvider>
        </AuditProvider>
      </AnalysisProvider>
    </SessionProvider>
  )
}
