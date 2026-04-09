'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/lib/session-context'
import { useAPIKeys, AI_PROVIDERS } from '@/lib/api-keys-context'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import {
  Bot,
  Send,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Target,
  Shield,
  Zap,
  BarChart3,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Key,
  Settings,
  Brain,
  Layers,
} from 'lucide-react'

// Quick analysis prompts for institutional-grade analysis
const QUICK_PROMPTS = [
  {
    id: 'full-analysis',
    label: 'Full Strategy Analysis',
    prompt: 'Provide a comprehensive institutional-grade analysis of this strategy. Cover statistical validity, risk assessment, curve fitting risk, execution assumptions, and edge sustainability. Be direct and quantify everything.',
    icon: BarChart3,
    category: 'analysis',
  },
  {
    id: 'risk-assessment',
    label: 'Risk Assessment',
    prompt: 'Analyze the risk profile in detail. Focus on maximum drawdown, tail risk, consecutive losses, and worst-case scenarios. Is this acceptable for institutional capital? What position sizing would limit drawdown to 10%?',
    icon: Shield,
    category: 'risk',
  },
  {
    id: 'curve-fitting',
    label: 'Curve Fitting Detection',
    prompt: 'Evaluate the probability this strategy is curve-fitted. Analyze profit factor vs sample size, win rate distribution, and parameter sensitivity. What is the likelihood these results are due to chance? Calculate the minimum backtest length needed.',
    icon: AlertTriangle,
    category: 'validation',
  },
  {
    id: 'improvements',
    label: 'Improvement Recommendations',
    prompt: 'Based on the performance data, provide specific, actionable improvements. Consider: position sizing rules, entry timing filters, exit optimization, stop loss placement, and risk management enhancements. Prioritize by expected impact.',
    icon: Lightbulb,
    category: 'optimize',
  },
  {
    id: 'time-analysis',
    label: 'Time-Based Edge Analysis',
    prompt: 'Analyze performance by time of day, day of week, and market session (RTH vs ETH). Identify statistically significant time-based edges. Should we filter trades to specific times? Calculate the impact of time filters.',
    icon: TrendingUp,
    category: 'analysis',
  },
  {
    id: 'execution-reality',
    label: 'Execution Reality Check',
    prompt: 'Evaluate execution assumptions critically. Are fills realistic for this instrument and timeframe? Estimate real-world slippage impact. What would actual performance likely be with 1-2 tick slippage per trade?',
    icon: Target,
    category: 'validation',
  },
  {
    id: 'institutional-ready',
    label: 'Institutional Readiness Score',
    prompt: 'Score this strategy 1-100 on institutional readiness. Evaluate: sample size adequacy, risk-adjusted returns, drawdown characteristics, statistical significance, and robustness. What specific changes are needed before deploying real capital?',
    icon: Zap,
    category: 'assessment',
  },
  {
    id: 'monte-carlo',
    label: 'Monte Carlo Interpretation',
    prompt: 'Interpret the Monte Carlo simulation results. What do the confidence intervals tell us? What is the probability of a 30% drawdown? What is the worst-case scenario at 95% confidence? Is this acceptable?',
    icon: FileText,
    category: 'validation',
  },
]

export default function AIAnalystPage() {
  const { sessionId, currentSession, getAIContext } = useSession()
  const { keys, activeKeyId, getDecryptedKey, ensembleConfig, setEnsembleConfig, getEnabledKeys } = useAPIKeys()
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Use selected key or active key
  const effectiveKeyId = selectedKeyId || activeKeyId
  const activeKey = keys.find(k => k.id === effectiveKeyId)
  const decryptedKey = effectiveKeyId ? getDecryptedKey(effectiveKeyId) : null
  
  // Get FULL strategy context using the new getAIContext function
  const strategyContext = useMemo(() => {
    return getAIContext()
  }, [getAIContext])
  
  // Build request body with provider info
  const getRequestBody = useMemo(() => {
    return (context: string) => {
      const body: Record<string, unknown> = {
        strategyContext: context,
      }
      
      // Add provider info if user has custom key
      if (activeKey && decryptedKey) {
        body.provider = activeKey.provider
        body.model = activeKey.model
        body.apiKey = decryptedKey
      }
      
      return body
    }
  }, [activeKey, decryptedKey])
  
  // Memoize transport to prevent recreation on every render
  const transport = useMemo(() => new DefaultChatTransport({ 
    api: '/api/ai/analyze',
  }), [])
  
  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  })
  
  const isLoading = status === 'streaming' || status === 'submitted'
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [messages, status])
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input }, { body: getRequestBody(strategyContext) })
    setInput('')
  }
  
  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return
    sendMessage({ text: prompt }, { body: getRequestBody(strategyContext) })
  }
  
  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  const handleReset = () => {
    setMessages([])
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  // Extract text from message parts (AI SDK 6 format)
  const getMessageText = (message: typeof messages[0]): string => {
    if (!message.parts || !Array.isArray(message.parts)) return ''
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
  }
  
  const enabledKeys = getEnabledKeys()
  
  if (!sessionId) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center p-6">
        <Panel className="p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">AI Strategy Analyst</h2>
          <p className="text-muted-foreground mb-6">
            Upload a NinjaTrader strategy CSV file to enable institutional-grade AI analysis.
          </p>
          <Button asChild>
            <a href="/">Upload Strategy Data</a>
          </Button>
        </Panel>
      </div>
    )
  }
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Strategy Analyst
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentSession?.filename ? `Analyzing: ${currentSession.filename}` : 'Institutional-grade analysis powered by advanced AI'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider Indicator */}
          {activeKey ? (
            <Badge variant="secondary" className="gap-1.5">
              <Brain className="h-3 w-3" />
              {AI_PROVIDERS.find(p => p.id === activeKey.provider)?.name || activeKey.provider}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Vercel AI Gateway
            </Badge>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowProviderSettings(!showProviderSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Provider
          </Button>
          
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              New Chat
            </Button>
          )}
        </div>
      </div>
      
      {/* Provider Settings Panel */}
      {showProviderSettings && (
        <Panel className="p-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              AI Provider Settings
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard/settings">Manage API Keys</a>
            </Button>
          </div>
          
          {enabledKeys.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No API keys configured. Using Vercel AI Gateway (default).</p>
              <Button variant="link" asChild className="mt-2">
                <a href="/dashboard/settings">Add API Key</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Provider</label>
                <Select value={effectiveKeyId || 'default'} onValueChange={(v) => setSelectedKeyId(v === 'default' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Vercel AI Gateway (Default)
                      </div>
                    </SelectItem>
                    {enabledKeys.map((key) => {
                      const provider = AI_PROVIDERS.find(p => p.id === key.provider)
                      return (
                        <SelectItem key={key.id} value={key.id}>
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            {key.name} ({provider?.name || key.provider})
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Ensemble Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ensemble Mode</p>
                  <p className="text-xs text-muted-foreground">Run analysis across multiple models</p>
                </div>
                <Switch 
                  checked={ensembleConfig.enabled}
                  onCheckedChange={(enabled) => setEnsembleConfig({ enabled })}
                  disabled={enabledKeys.length < 2}
                />
              </div>
              
              {ensembleConfig.enabled && enabledKeys.length >= 2 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Select providers for ensemble (min 2)
                  </p>
                  <div className="space-y-2">
                    {enabledKeys.map((key) => (
                      <label key={key.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ensembleConfig.providers.includes(key.id)}
                          onChange={(e) => {
                            const newProviders = e.target.checked
                              ? [...ensembleConfig.providers, key.id]
                              : ensembleConfig.providers.filter(p => p !== key.id)
                            setEnsembleConfig({ providers: newProviders })
                          }}
                          className="rounded"
                        />
                        {key.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Quick Prompts Sidebar */}
        <div className="lg:col-span-1 space-y-4 overflow-auto">
          <Panel className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Quick Analysis
            </h3>
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-3">
                <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
                <TabsTrigger value="validation" className="text-xs">Validation</TabsTrigger>
              </TabsList>
              <TabsContent value="analysis" className="space-y-2 mt-0">
                {QUICK_PROMPTS.filter(p => ['analysis', 'risk', 'optimize'].includes(p.category)).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2.5 px-3 text-left"
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    disabled={isLoading}
                  >
                    <prompt.icon className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{prompt.label}</span>
                  </Button>
                ))}
              </TabsContent>
              <TabsContent value="validation" className="space-y-2 mt-0">
                {QUICK_PROMPTS.filter(p => ['validation', 'assessment'].includes(p.category)).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2.5 px-3 text-left"
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    disabled={isLoading}
                  >
                    <prompt.icon className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{prompt.label}</span>
                  </Button>
                ))}
              </TabsContent>
            </Tabs>
          </Panel>
          
          {/* Data Context Status */}
          <Panel className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Data Loaded
            </h3>
            {currentSession ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategy:</span>
                  <span className="font-medium truncate max-w-[120px]">{currentSession.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades:</span>
                  <span className="font-medium">{currentSession.nRows.toLocaleString()}</span>
                </div>
                {currentSession.metrics && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Profit:</span>
                      <span className={cn("font-medium", currentSession.metrics.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                        ${currentSession.metrics.netProfit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sharpe:</span>
                      <span className="font-medium">{currentSession.metrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-medium">{currentSession.metrics.winRate > 1 ? currentSession.metrics.winRate.toFixed(1) : (currentSession.metrics.winRate * 100).toFixed(1)}%</span>
                    </div>
                  </>
                )}
                {currentSession.dataQuality && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quality Score:</span>
                    <Badge variant={currentSession.dataQuality.score >= 80 ? "secondary" : "outline"}>
                      {currentSession.dataQuality.score}/100
                    </Badge>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <Badge variant="secondary" className="w-full justify-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Full metrics sent to AI
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data loaded</p>
            )}
          </Panel>
          
          {/* Tips */}
          <Panel className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Pro Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                AI has full access to your metrics
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                Ask for specific thresholds
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                Request position sizing calcs
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                Always validate with OOS testing
              </li>
            </ul>
          </Panel>
        </div>
        
        {/* Chat Area */}
        <Panel className="lg:col-span-3 flex flex-col p-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-6">
              {messages.length === 0 ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                    <Bot className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Ready to Analyze Your Strategy
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-lg">
                    I have full access to your strategy data including {currentSession?.nRows.toLocaleString() || '0'} trades, 
                    all performance metrics, and data quality analysis.
                  </p>
                  {currentSession?.metrics && (
                    <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm">
                      <div className="px-3 py-1.5 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Net: </span>
                        <span className={cn("font-semibold", currentSession.metrics.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                          ${currentSession.metrics.netProfit.toLocaleString()}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Sharpe: </span>
                        <span className="font-semibold">{currentSession.metrics.sharpeRatio.toFixed(2)}</span>
                      </div>
                      <div className="px-3 py-1.5 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Win Rate: </span>
                        <span className="font-semibold">{(currentSession.metrics.winRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="px-3 py-1.5 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Max DD: </span>
                        <span className="font-semibold text-red-500">{(currentSession.metrics.maxDrawdownPercent * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      variant="default"
                      onClick={() => handleQuickPrompt(QUICK_PROMPTS[0].prompt)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Run Full Analysis
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleQuickPrompt(QUICK_PROMPTS[2].prompt)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Check Curve Fitting
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleQuickPrompt(QUICK_PROMPTS[6].prompt)}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Institutional Score
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => {
                    const text = getMessageText(message)
                    const isUser = message.role === 'user'
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex gap-4',
                          isUser ? 'flex-row-reverse' : 'flex-row'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          isUser ? 'bg-primary' : 'bg-muted'
                        )}>
                          {isUser ? (
                            <User className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Bot className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className={cn(
                          'flex-1 max-w-[85%]',
                          isUser ? 'text-right' : 'text-left'
                        )}>
                          <div className={cn(
                            'inline-block rounded-lg px-4 py-3 text-left',
                            isUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50'
                          )}>
                            {isUser ? (
                              <p className="whitespace-pre-wrap">{text}</p>
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                    code: ({ children }) => (
                                      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{children}</code>
                                    ),
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4 first:mt-0">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto my-3">
                                        <table className="min-w-full border-collapse text-sm">{children}</table>
                                      </div>
                                    ),
                                    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                                    th: ({ children }) => <th className="border border-border px-3 py-1.5 text-left font-medium">{children}</th>,
                                    td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
                                  }}
                                >
                                  {text}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          {!isUser && text && (
                            <button
                              onClick={() => handleCopy(text, message.id)}
                              className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="bg-muted/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">
                            Analyzing with {activeKey ? AI_PROVIDERS.find(p => p.id === activeKey.provider)?.name : 'Vercel AI Gateway'}...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input */}
          <div className="border-t border-border p-4 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your strategy performance, risk, or improvements..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors min-h-[48px] max-h-[120px]"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="h-12 px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>
                Using: {activeKey ? `${AI_PROVIDERS.find(p => p.id === activeKey.provider)?.name} / ${activeKey.model}` : 'Vercel AI Gateway'}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
