'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  Calendar,
  TrendingUp,
  Clock,
  Menu,
  X,
  LayoutDashboard,
  PieChart,
  LineChart,
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
  Layers,
  FlaskConical,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { api, APIError } from '@/lib/api'
import { SessionProvider, useSession } from '@/lib/session-context'
import { OnboardingDialog, SampleStrategySelector } from '@/components/onboarding'
import { createSampleSession, sampleStrategies } from '@/lib/sample-data'
import { 
  parseNinjaTraderCSV, 
  type NTPerformanceReport,
  type DataQualityReport,
} from '@/lib/ninjatrader-parser'

interface ParseResult {
  report: NTPerformanceReport
  quality: DataQualityReport
}

const PREVIEW_NAV = [
  { section: 'Analysis', items: [
    { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Advanced Metrics', icon: BarChart3, href: '/dashboard/advanced' },
    { label: 'Distribution', icon: PieChart, href: '/dashboard/distribution' },
    { label: 'Desk Analytics', icon: LineChart, href: '/dashboard/desk-analytics' },
    { label: 'Factor Attribution', icon: Layers, href: '/dashboard/factor-attribution', badge: 'NEW' },
    { label: 'Improvements', icon: TrendingUp, href: '/dashboard/improvements' },
  ]},
  { section: 'Robustness', items: [
    { label: 'Monte Carlo', icon: Shuffle, href: '/dashboard/monte-carlo' },
    { label: 'Walk-Forward', icon: GitBranch, href: '/dashboard/walk-forward' },
    { label: 'Overfitting', icon: Shield, href: '/dashboard/overfitting' },
    { label: 'Regime Analysis', icon: Activity, href: '/dashboard/regime' },
    { label: 'Stress Testing', icon: Flame, href: '/dashboard/stress-testing' },
    { label: 'Scenario Builder', icon: FlaskConical, href: '/dashboard/scenario-builder', badge: 'NEW' },
  ]},
  { section: 'Data', items: [
    { label: 'Trade Log', icon: Table, href: '/dashboard/trades' },
    { label: 'Heatmap', icon: Grid3X3, href: '/dashboard/heatmap' },
    { label: 'Equity Curve', icon: LineChart, href: '/dashboard/equity' },
    { label: 'Rolling Metrics', icon: Waves, href: '/dashboard/rolling', badge: 'NEW' },
  ]},
  { section: 'Tools', items: [
    { label: 'Compare', icon: GitCompare, href: '/dashboard/compare' },
    { label: 'AI Analyst', icon: Bot, href: '/dashboard/ai-analyst' },
    { label: 'Export', icon: Download, href: '/dashboard/export' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ]},
]

function UploadPageInner() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { setSession, setSessionId, sessions, isLoadingSessions } = useSession()

  // Check if first visit (no sessions)
  useState(() => {
    if (!isLoadingSessions && sessions.length === 0) {
      setShowOnboarding(true)
    }
  })

  const parseFile = async (fileToparse: File) => {
    setIsParsing(true)
    setError(null)
    setParseResult(null)

    try {
      const content = await fileToparse.text()
      const { report, quality, error } = parseNinjaTraderCSV(content)
      
      if (error || !report) {
        throw new Error(error || 'No valid trades found in the CSV file. Please check the file format.')
      }
      
      setParseResult({ report, quality })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      setFile(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)
    setParseResult(null)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile)
      parseFile(droppedFile)
    } else {
      setError('Please upload a CSV file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setParseResult(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      parseFile(selectedFile)
    } else {
      setError('Please upload a CSV file')
    }
  }, [])

  const handleUpload = async () => {
    if (!file || !parseResult) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    try {
      const response = await api.upload(file)
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Store full session data including parsed metrics
      setSession({
        sessionId: response.session_id,
        filename: file.name,
        kind: 'trades',
        nRows: parseResult.report.totalTrades,
        columns: ['entryTime', 'exitTime', 'instrument', 'profit', 'quantity'],
        metrics: {
          netProfit: parseResult.report.totalNetProfit,
          grossProfit: parseResult.report.grossProfit,
          grossLoss: parseResult.report.grossLoss,
          profitFactor: parseResult.report.profitFactor,
          totalTrades: parseResult.report.totalTrades,
          winningTrades: parseResult.report.winningTrades,
          losingTrades: parseResult.report.losingTrades,
          winRate: parseResult.report.percentProfitable,
          avgWinner: parseResult.report.avgWinningTrade,
          avgLoser: parseResult.report.avgLosingTrade,
          largestWinner: parseResult.report.largestWinner,
          largestLoser: parseResult.report.largestLoser,
          avgTrade: parseResult.report.avgTrade,
          maxDrawdown: parseResult.report.maxDrawdown,
          maxDrawdownPercent: parseResult.report.maxDrawdownPercent,
          sharpeRatio: parseResult.report.sharpeRatio || 0,
          sortinoRatio: parseResult.report.sortinoRatio || 0,
          maxConsecutiveLosses: parseResult.report.maxConsecutiveLosers,
          cagr: 0,
          totalReturn: 0,
          avgMonthlyReturn: 0,
          calmarRatio: 0,
          avgDrawdown: 0,
          maxDrawdownDuration: 0,
          consecutiveLosses: 0,
          recoveryFactor: parseResult.report.totalNetProfit / Math.abs(parseResult.report.maxDrawdown || 1),
          avgHoldingPeriod: parseResult.report.avgBarsInTrade,
          dataQualityScore: parseResult.quality.score,
          gapsDetected: parseResult.quality.warnings.length,
          possibleCurveFitting: false,
          lookAheadBiasRisk: false,
        },
      })
      
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300))
      router.push('/dashboard')
    } catch (err) {
      clearInterval(progressInterval)
      setUploadProgress(0)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Upload failed. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSessionId(sessionId)
    router.push('/dashboard')
  }

  const handleDemo = async (strategyId?: string) => {
    setIsUploading(true)
    setError(null)
    try {
      const id = strategyId || sampleStrategies[0].id
      const sampleData = createSampleSession(id)
      setSession({
        sessionId: sampleData.session.session_id,
        filename: sampleData.session.filename,
        kind: sampleData.session.kind,
        nRows: sampleData.session.n_rows,
        columns: sampleData.session.columns,
      })
      router.push('/dashboard')
    } catch {
      setError('Failed to load demo data. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-profit'
    if (score >= 70) return 'text-warning'
    return 'text-loss'
  }

  const getQualityBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const }
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const }
    if (score >= 50) return { label: 'Fair', variant: 'outline' as const }
    return { label: 'Poor', variant: 'destructive' as const }
  }

  const clearFile = () => {
    setFile(null)
    setParseResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sidebar Preview Panel */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          {/* Panel */}
          <div className="relative z-10 w-[280px] h-full bg-background border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">N</div>
                <span className="text-sm font-semibold">Features</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3">
              <p className="px-3 mb-3 text-[10px] text-muted-foreground uppercase tracking-wider">Upload a CSV to unlock all features</p>
              {PREVIEW_NAV.map((section) => (
                <div key={section.section} className="mb-4">
                  <p className="px-3 mb-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold">{section.section}</p>
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground opacity-70"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{item.badge}</span>
                      )}
                      <Lock className="h-3 w-3 ml-auto shrink-0 opacity-40" />
                    </div>
                  ))}
                </div>
              ))}
              <div className="mt-4 px-3">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Upload CSV to Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle navigation preview"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground font-bold text-base">
            N
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">
              Nexural Research
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Strategy Analysis Platform
            </p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          View All Features
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Upload Zone */}
          <div
            className={cn(
              'relative rounded-2xl border-2 border-dashed transition-all duration-200',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-border-hover',
              (file || parseResult) && 'border-solid border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file && !isParsing && (
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
            )}
            
            <div className="flex flex-col items-center justify-center py-12 px-8">
              {isParsing ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Parsing trade data...</p>
                </>
              ) : isUploading ? (
                <>
                  <div className="relative mb-6">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-mono text-primary">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Uploading to analysis engine...</p>
                </>
              ) : parseResult ? (
                <div className="w-full">
                  {/* File Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-foreground">{file?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file?.size || 0 / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFile}>
                      Change file
                    </Button>
                  </div>

                  {/* Data Quality Score */}
                  <div className="bg-surface rounded-xl border border-border p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Data Quality</span>
                      <Badge variant={getQualityBadge(parseResult.quality.score).variant}>
                        {getQualityBadge(parseResult.quality.score).label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={parseResult.quality.score} className="flex-1" />
                      <span className={cn('text-lg font-bold font-mono', getQualityColor(parseResult.quality.score))}>
                        {parseResult.quality.score}
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-surface rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Total Trades</span>
                      </div>
                      <p className="text-2xl font-bold font-mono text-foreground">
                        {parseResult.report.totalTrades.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-surface rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Net Profit</span>
                      </div>
                      <p className={cn(
                        'text-2xl font-bold font-mono',
                        parseResult.report.totalNetProfit >= 0 ? 'text-profit' : 'text-loss'
                      )}>
                        ${parseResult.report.totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-surface rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Date Range</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {parseResult.report.dateRange.start 
                          ? new Date(parseResult.report.dateRange.start).toLocaleDateString()
                          : 'N/A'
                        } - {parseResult.report.dateRange.end 
                          ? new Date(parseResult.report.dateRange.end).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="bg-surface rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Win Rate</span>
                      </div>
                      <p className={cn(
                        'text-2xl font-bold font-mono',
                        parseResult.report.percentProfitable >= 50 ? 'text-profit' : 'text-loss'
                      )}>
                        {parseResult.report.percentProfitable.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="bg-surface rounded-xl border border-border p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Profit Factor</span>
                        <p className={cn(
                          'text-lg font-bold font-mono',
                          parseResult.report.profitFactor >= 1.5 ? 'text-profit' : 
                          parseResult.report.profitFactor >= 1 ? 'text-warning' : 'text-loss'
                        )}>
                          {parseResult.report.profitFactor.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Max Drawdown</span>
                        <p className="text-lg font-bold font-mono text-loss">
                          {parseResult.report.maxDrawdownPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Avg Trade</span>
                        <p className={cn(
                          'text-lg font-bold font-mono',
                          parseResult.report.avgTrade >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          ${parseResult.report.avgTrade.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {(parseResult.quality.issues.length > 0 || parseResult.quality.warnings.length > 0) && (
                    <div className="bg-warning/5 rounded-xl border border-warning/20 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-sm font-medium text-warning">
                          {parseResult.quality.issues.length + parseResult.quality.warnings.length} issue{parseResult.quality.issues.length + parseResult.quality.warnings.length > 1 ? 's' : ''} detected
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {parseResult.quality.issues.slice(0, 2).map((issue, i) => (
                          <li key={`issue-${i}`} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-warning mt-0.5">•</span>
                            {issue.title}: {issue.description}
                          </li>
                        ))}
                        {parseResult.quality.warnings.slice(0, 2).map((warning, i) => (
                          <li key={`warning-${i}`} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-warning mt-0.5">•</span>
                            {warning.title}: {warning.description}
                          </li>
                        ))}
                        {(parseResult.quality.issues.length + parseResult.quality.warnings.length) > 4 && (
                          <li className="text-xs text-muted-foreground">
                            ...and {parseResult.quality.issues.length + parseResult.quality.warnings.length - 4} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Analysis Button */}
                  <Button
                    onClick={handleUpload}
                    className="w-full gap-2"
                    size="lg"
                    disabled={parseResult.quality.score < 20}
                  >
                    {parseResult.quality.score < 20 ? (
                      <>
                        <XCircle className="h-4 w-4" />
                        Data Quality Too Low
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Analyze {parseResult.report.totalTrades.toLocaleString()} Trades
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-surface border border-border mb-6">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drop your trade log here
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Supports NinjaTrader CSV exports up to 100MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Sample Strategies */}
          {!parseResult && (
            <div className="mt-8 pt-8 border-t border-border">
              <SampleStrategySelector />
            </div>
          )}

          {/* Onboarding Dialog */}
          <OnboardingDialog 
            open={showOnboarding} 
            onOpenChange={setShowOnboarding} 
          />

          {/* Existing Sessions */}
          {!isLoadingSessions && sessions.length > 0 && !parseResult && (
            <div className="mt-10 pt-8 border-t border-border">
              <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
                Recent Sessions
              </h2>
              <div className="space-y-2">
                {sessions.slice(0, 5).map((session) => (
                  <button
                    key={session.session_id}
                    onClick={() => handleSessionSelect(session.session_id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors text-left"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-10 text-center">
            <p className="text-xs text-muted-foreground/70">
              71+ institutional-grade metrics • Monte Carlo simulation • AI-powered insights
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function UploadPage() {
  return (
    <SessionProvider>
      <UploadPageInner />
    </SessionProvider>
  )
}
