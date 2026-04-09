'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useSession } from '@/lib/session-context'
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  TrendingUp,
  Shield,
  Activity,
  Flame,
  Table,
  Grid3X3,
  Waves,
  GitCompare,
  Bot,
  Download,
  Settings,
  Upload,
  Moon,
  Sun,
  Keyboard,
  FileText,
  Layers,
  FlaskConical,
  Search,
  Zap,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  shortcut?: string
  category: 'navigation' | 'analysis' | 'tools' | 'settings'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { sessionId, clearSession } = useSession()
  
  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      
      // Quick navigation shortcuts
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            router.push('/dashboard')
            break
          case '2':
            e.preventDefault()
            router.push('/dashboard/advanced')
            break
          case '3':
            e.preventDefault()
            router.push('/dashboard/trades')
            break
          case '4':
            e.preventDefault()
            router.push('/dashboard/ai-analyst')
            break
        }
      }
    }
    
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [router])
  
  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])
  
  const navigationItems: CommandItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      description: 'Strategy summary and key metrics',
      icon: LayoutDashboard,
      action: () => router.push('/dashboard'),
      shortcut: 'Alt+1',
      category: 'navigation',
    },
    {
      id: 'advanced',
      label: 'Advanced Metrics',
      description: 'Institutional-grade performance metrics',
      icon: BarChart3,
      action: () => router.push('/dashboard/advanced'),
      shortcut: 'Alt+2',
      category: 'navigation',
    },
    {
      id: 'trades',
      label: 'Trade Log',
      description: 'Complete trade history with filters',
      icon: Table,
      action: () => router.push('/dashboard/trades'),
      shortcut: 'Alt+3',
      category: 'navigation',
    },
    {
      id: 'equity',
      label: 'Equity Analysis',
      description: 'Equity curve and drawdown analysis',
      icon: LineChart,
      action: () => router.push('/dashboard/equity'),
      category: 'navigation',
    },
    {
      id: 'desk-analytics',
      label: 'Desk Analytics',
      description: 'Hurst exponent, ACF, correlation',
      icon: Activity,
      action: () => router.push('/dashboard/desk-analytics'),
      category: 'navigation',
    },
    {
      id: 'factor-attribution',
      label: 'Factor Attribution',
      description: 'Fama-French factor decomposition',
      icon: Layers,
      action: () => router.push('/dashboard/factor-attribution'),
      category: 'navigation',
    },
    {
      id: 'monte-carlo',
      label: 'Monte Carlo',
      description: 'Parametric simulation analysis',
      icon: Waves,
      action: () => router.push('/dashboard/monte-carlo'),
      category: 'navigation',
    },
    {
      id: 'stress-testing',
      label: 'Stress Testing',
      description: 'Historical crisis scenarios',
      icon: Flame,
      action: () => router.push('/dashboard/stress-testing'),
      category: 'navigation',
    },
    {
      id: 'scenario-builder',
      label: 'Scenario Builder',
      description: 'Custom stress test scenarios',
      icon: FlaskConical,
      action: () => router.push('/dashboard/scenario-builder'),
      category: 'navigation',
    },
    {
      id: 'overfitting',
      label: 'Overfitting Detection',
      description: 'PBO and Deflated Sharpe',
      icon: Shield,
      action: () => router.push('/dashboard/overfitting'),
      category: 'navigation',
    },
    {
      id: 'heatmap',
      label: 'Monthly Heatmap',
      description: 'Calendar view of returns',
      icon: Grid3X3,
      action: () => router.push('/dashboard/heatmap'),
      category: 'navigation',
    },
    {
      id: 'compare',
      label: 'Compare Strategies',
      description: 'Side-by-side comparison',
      icon: GitCompare,
      action: () => router.push('/dashboard/compare'),
      category: 'navigation',
    },
  ]
  
  const analysisItems: CommandItem[] = [
    {
      id: 'ai-analyst',
      label: 'AI Analyst',
      description: 'Get AI-powered strategy analysis',
      icon: Bot,
      action: () => router.push('/dashboard/ai-analyst'),
      shortcut: 'Alt+4',
      category: 'analysis',
    },
    {
      id: 'improvements',
      label: 'Improvements',
      description: 'AI-suggested strategy improvements',
      icon: TrendingUp,
      action: () => router.push('/dashboard/improvements'),
      category: 'analysis',
    },
    {
      id: 'quick-analysis',
      label: 'Quick Full Analysis',
      description: 'Run comprehensive AI analysis',
      icon: Zap,
      action: () => {
        router.push('/dashboard/ai-analyst')
        // Could trigger auto-analysis here
      },
      category: 'analysis',
    },
  ]
  
  const toolItems: CommandItem[] = [
    {
      id: 'export',
      label: 'Export Report',
      description: 'PDF, CSV, or JSON export',
      icon: Download,
      action: () => router.push('/dashboard/export'),
      category: 'tools',
    },
    {
      id: 'upload',
      label: 'Upload New Strategy',
      description: 'Import NinjaTrader CSV',
      icon: Upload,
      action: () => router.push('/'),
      category: 'tools',
    },
    {
      id: 'new-session',
      label: 'New Analysis Session',
      description: 'Clear current and start fresh',
      icon: FileText,
      action: () => {
        clearSession()
        router.push('/')
      },
      category: 'tools',
    },
  ]
  
  const settingsItems: CommandItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      description: 'API configuration and preferences',
      icon: Settings,
      action: () => router.push('/dashboard/settings'),
      category: 'settings',
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: Keyboard,
      action: () => {
        // Could open shortcuts modal
        setOpen(false)
      },
      shortcut: '?',
      category: 'settings',
    },
  ]
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands, pages, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => runCommand(item.action)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Analysis">
          {analysisItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => runCommand(item.action)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Tools">
          {toolItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => runCommand(item.action)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          {settingsItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.description}`}
              onSelect={() => runCommand(item.action)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </div>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// Keyboard hint component for the header
export function CommandPaletteHint() {
  const [isMac, setIsMac] = useState(false)
  
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])
  
  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          ctrlKey: !isMac,
        })
        document.dispatchEvent(event)
      }}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search</span>
      <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        {isMac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  )
}
