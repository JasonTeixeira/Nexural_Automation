'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Shuffle,
  GitBranch,
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
  ChevronDown,
  Menu,
  X,
  Layers,
  FlaskConical,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'Analysis',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Advanced Metrics', href: '/dashboard/advanced', icon: BarChart3 },
      { label: 'Distribution', href: '/dashboard/distribution', icon: PieChart },
      { label: 'Desk Analytics', href: '/dashboard/desk-analytics', icon: LineChart },
      { label: 'Factor Attribution', href: '/dashboard/factor-attribution', icon: Layers, badge: 'NEW' },
      { label: 'Improvements', href: '/dashboard/improvements', icon: TrendingUp },
    ],
  },
  {
    title: 'Robustness',
    items: [
      { label: 'Monte Carlo', href: '/dashboard/monte-carlo', icon: Shuffle },
      { label: 'Walk-Forward', href: '/dashboard/walk-forward', icon: GitBranch },
      { label: 'Overfitting', href: '/dashboard/overfitting', icon: Shield },
      { label: 'Regime Analysis', href: '/dashboard/regime', icon: Activity },
      { label: 'Stress Testing', href: '/dashboard/stress-testing', icon: Flame },
      { label: 'Scenario Builder', href: '/dashboard/scenario-builder', icon: FlaskConical, badge: 'NEW' },
    ],
  },
  {
    title: 'Data',
    items: [
      { label: 'Trade Log', href: '/dashboard/trades', icon: Table },
      { label: 'Heatmap', href: '/dashboard/heatmap', icon: Grid3X3 },
      { label: 'Equity Curve', href: '/dashboard/equity', icon: LineChart },
      { label: 'Rolling Metrics', href: '/dashboard/rolling', icon: Waves, badge: 'NEW' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Compare', href: '/dashboard/compare', icon: GitCompare },
      { label: 'AI Analyst', href: '/dashboard/ai-analyst', icon: Bot },
      { label: 'Export', href: '/dashboard/export', icon: Download },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(
    navigation.map((s) => s.title)
  )

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          N
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground tracking-tight">
            Nexural
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Research
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navigation.map((section) => (
          <Collapsible
            key={section.title}
            open={expandedSections.includes(section.title)}
            onOpenChange={() => toggleSection(section.title)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors">
              {section.title}
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  expandedSections.includes(section.title) && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pb-3">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                        : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Nexural Research</span>
          <span className="mx-1.5">·</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  )
}

// Mobile sidebar toggle
export function MobileSidebarTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={onToggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  )
}
