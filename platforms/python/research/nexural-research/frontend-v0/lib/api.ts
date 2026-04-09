// API Configuration — uses Next.js rewrites proxy (same-origin, no CORS issues)
export const API_BASE_URL = ''

// Error messages mapped from status codes
const USER_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  404: 'Session not found. Upload a CSV first.',
  413: 'File too large. Maximum is 100MB.',
  422: 'Invalid parameters.',
  429: 'Rate limit exceeded. Try again shortly.',
  500: 'Server error. Try again later.',
  502: 'AI provider error. Check your API key.',
}

export class APIError extends Error {
  status: number
  requestId?: string

  constructor(message: string, status: number, requestId?: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.requestId = requestId
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError('Request timed out. Please try again.', 408)
    }
    throw error
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const requestId = response.headers.get('X-Request-ID') || undefined

  if (!response.ok) {
    const message = USER_MESSAGES[response.status] || 'An unexpected error occurred.'
    throw new APIError(message, response.status, requestId)
  }

  return response.json()
}

// Typed API functions
export const api = {
  // Session management
  getSessions: () => 
    apiRequest<{ sessions: Array<{ session_id: string; filename: string; created_at: string }> }>('/api/sessions'),
  
  deleteSession: (sessionId: string) =>
    apiRequest<{ success: boolean }>(`/api/sessions/${sessionId}`, { method: 'DELETE' }),

  // Upload
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const message = USER_MESSAGES[response.status] || 'Upload failed.'
      throw new APIError(message, response.status)
    }
    
    return response.json()
  },

  // Analysis endpoints
  getMetrics: (sessionId: string) =>
    apiRequest<{ metrics: import('./types').BasicMetrics }>(`/api/analysis/metrics?session_id=${sessionId}`),
  
  getRiskReturn: (sessionId: string) =>
    apiRequest<import('./types').RiskReturnMetrics>(`/api/analysis/risk-return?session_id=${sessionId}`),
  
  getExpectancy: (sessionId: string) =>
    apiRequest<import('./types').ExpectancyMetrics>(`/api/analysis/expectancy?session_id=${sessionId}`),
  
  getInstitutional: (sessionId: string) =>
    apiRequest<import('./types').InstitutionalMetrics>(`/api/analysis/institutional?session_id=${sessionId}`),
  
  getComprehensive: (sessionId: string) =>
    apiRequest<import('./types').ComprehensiveMetrics>(`/api/analysis/comprehensive?session_id=${sessionId}`),
  
  getDistribution: (sessionId: string) =>
    apiRequest<import('./types').DistributionMetrics>(`/api/analysis/distribution?session_id=${sessionId}`),
  
  getImprovements: (sessionId: string) =>
    apiRequest<import('./types').ImprovementsResult>(`/api/analysis/improvements?session_id=${sessionId}`),

  // Desk Analytics
  getHurst: (sessionId: string) =>
    apiRequest<import('./types').HurstResult>(`/api/analysis/hurst?session_id=${sessionId}`),
  
  getACF: (sessionId: string) =>
    apiRequest<import('./types').ACFResult>(`/api/analysis/acf?session_id=${sessionId}`),
  
  getRollingCorrelation: (sessionId: string) =>
    apiRequest<import('./types').RollingCorrelationResult>(`/api/analysis/rolling-correlation?session_id=${sessionId}`),
  
  getInformationRatio: (sessionId: string) =>
    apiRequest<import('./types').InformationRatioResult>(`/api/analysis/information-ratio?session_id=${sessionId}`),

  // Stress Testing
  getTailAmplification: (sessionId: string) =>
    apiRequest<import('./types').TailAmplificationResult>(`/api/stress/tail-amplification?session_id=${sessionId}`),
  
  getHistoricalStress: (sessionId: string) =>
    apiRequest<import('./types').HistoricalStressResult>(`/api/stress/historical?session_id=${sessionId}`),
  
  getParameterSensitivity: (sessionId: string) =>
    apiRequest<import('./types').ParameterSensitivityResult>(`/api/stress/sensitivity?session_id=${sessionId}`),

  // Robustness
  getParametricMonteCarlo: (sessionId: string) =>
    apiRequest<import('./types').MonteCarloResult>(`/api/robustness/parametric-monte-carlo?session_id=${sessionId}`),
  
  getBlockBootstrap: (sessionId: string) =>
    apiRequest<import('./types').MonteCarloResult>(`/api/robustness/block-bootstrap?session_id=${sessionId}`),
  
  getWalkForward: (sessionId: string) =>
    apiRequest<import('./types').WalkForwardResult>(`/api/robustness/walk-forward?session_id=${sessionId}`),
  
  getRollingWalkForward: (sessionId: string) =>
    apiRequest<import('./types').WalkForwardResult>(`/api/robustness/rolling-walk-forward?session_id=${sessionId}`),
  
  getDeflatedSharpe: (sessionId: string) =>
    apiRequest<import('./types').DeflatedSharpeResult>(`/api/robustness/deflated-sharpe?session_id=${sessionId}`),
  
  getRegime: (sessionId: string) =>
    apiRequest<import('./types').RegimeResult>(`/api/robustness/regime?session_id=${sessionId}`),

  // Charts
  getEquityChart: (sessionId: string) =>
    apiRequest<import('./types').EquityChartData>(`/api/charts/equity?session_id=${sessionId}`),
  
  getDistributionChart: (sessionId: string) =>
    apiRequest<import('./types').DistributionChartData>(`/api/charts/distribution?session_id=${sessionId}`),
  
  getHeatmap: (sessionId: string) =>
    apiRequest<import('./types').HeatmapChartData>(`/api/charts/heatmap?session_id=${sessionId}`),
  
  getRollingMetrics: (sessionId: string, window: number = 20) =>
    apiRequest<import('./types').RollingMetricsChartData>(`/api/charts/rolling-metrics?session_id=${sessionId}&window=${window}`),
  
  getTrades: (sessionId: string, limit: number = 10000) =>
    apiRequest<{ trades: import('./types').Trade[] }>(`/api/charts/trades?session_id=${sessionId}&limit=${limit}`),

  // Compare
  getComparison: (sessionA: string, sessionB: string) =>
    apiRequest<import('./types').ComparisonResult>(`/api/export/comparison?session_a=${sessionA}&session_b=${sessionB}`),

  // AI Analysis
  analyze: (request: import('./types').AIAnalysisRequest) =>
    apiRequest<import('./types').AIAnalysisResponse>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  // Export URLs (for download links)
  getExportUrl: (sessionId: string, format: 'json' | 'csv' | 'excel') =>
    `${API_BASE_URL}/api/export/${format}?session_id=${sessionId}`,
  
  getFilteredCsvUrl: (sessionId: string) =>
    `${API_BASE_URL}/api/export/csv?session_id=${sessionId}&filtered=true`,
  
  getHtmlReportUrl: (sessionId: string) =>
    `${API_BASE_URL}/api/report/html?session_id=${sessionId}`,
}

// SWR fetcher
export const fetcher = <T>(url: string): Promise<T> => apiRequest<T>(url)

// SWR Hooks for data fetching
import useSWR from 'swr'

export function useMetrics(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/metrics?session_id=${sessionId}` : null, fetcher)
}

export function useRiskReturn(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/risk-return?session_id=${sessionId}` : null, fetcher)
}

export function useExpectancy(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/expectancy?session_id=${sessionId}` : null, fetcher)
}

export function useInstitutional(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/institutional?session_id=${sessionId}` : null, fetcher)
}

export function useComprehensive(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/comprehensive?session_id=${sessionId}` : null, fetcher)
}

export function useDistribution(sessionId: string | null) {
  return useSWR(sessionId ? `/api/analysis/distribution?session_id=${sessionId}` : null, fetcher)
}

export function useEquityChart(sessionId: string | null) {
  return useSWR(sessionId ? `/api/charts/equity?session_id=${sessionId}` : null, fetcher)
}

export function useHeatmap(sessionId: string | null) {
  return useSWR(sessionId ? `/api/charts/heatmap?session_id=${sessionId}` : null, fetcher)
}

export function useRolling(sessionId: string | null) {
  return useSWR(sessionId ? `/api/charts/rolling-metrics?session_id=${sessionId}` : null, fetcher)
}

export function useTradeLog(sessionId: string | null) {
  return useSWR(sessionId ? `/api/charts/trades?session_id=${sessionId}` : null, fetcher)
}

export function useMonteCarlo(sessionId: string | null) {
  return useSWR(sessionId ? `/api/robustness/parametric-monte-carlo?session_id=${sessionId}` : null, fetcher)
}

export function useWalkForward(sessionId: string | null) {
  return useSWR(sessionId ? `/api/robustness/walk-forward?session_id=${sessionId}` : null, fetcher)
}

export function useOverfitting(sessionId: string | null) {
  return useSWR(sessionId ? `/api/robustness/deflated-sharpe?session_id=${sessionId}` : null, fetcher)
}

export function useRegime(sessionId: string | null) {
  return useSWR(sessionId ? `/api/robustness/regime?session_id=${sessionId}` : null, fetcher)
}

export function useStressTesting(sessionId: string | null) {
  return useSWR(sessionId ? `/api/stress/historical?session_id=${sessionId}` : null, fetcher)
}

export function useDeskAnalytics(sessionId: string | null) {
  const hurst = useSWR(sessionId ? `/api/analysis/hurst?session_id=${sessionId}` : null, fetcher)
  const acf = useSWR(sessionId ? `/api/analysis/acf?session_id=${sessionId}` : null, fetcher)
  const correlation = useSWR(sessionId ? `/api/analysis/rolling-correlation?session_id=${sessionId}` : null, fetcher)
  const ir = useSWR(sessionId ? `/api/analysis/information-ratio?session_id=${sessionId}` : null, fetcher)
  
  return {
    hurst,
    acf,
    correlation,
    ir,
    isLoading: hurst.isLoading || acf.isLoading || correlation.isLoading || ir.isLoading,
    error: hurst.error || acf.error || correlation.error || ir.error,
  }
}

export function useCompare(sessionIds: string[]) {
  const validIds = sessionIds.filter(Boolean)
  const key = validIds.length >= 1 ? `/api/compare?ids=${validIds.join(',')}` : null
  return useSWR(key, fetcher)
}
