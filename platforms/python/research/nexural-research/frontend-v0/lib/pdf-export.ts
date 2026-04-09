// PDF Export utility for generating institutional-grade strategy reports
// Uses browser print functionality with full branding and professional styling

export interface ReportSection {
  id: string
  title: string
  enabled: boolean
  description?: string
}

export interface ReportConfig {
  title: string
  strategyName: string
  generatedAt: Date
  sections: ReportSection[]
  includeCharts: boolean
  includeTradeLog: boolean
  confidentialWatermark: boolean
  pageSize: 'letter' | 'a4'
  theme: 'light' | 'dark'
  analyst?: string
  firm?: string
  disclaimer?: string
}

export interface ReportMetrics {
  cagr?: number
  sharpe?: number
  sortino?: number
  maxDrawdown?: number
  winRate?: number
  profitFactor?: number
  totalTrades?: number
  netProfit?: number
  calmar?: number
  omega?: number
  expectancy?: number
  avgWin?: number
  avgLoss?: number
  largestWin?: number
  largestLoss?: number
  consecutiveLosses?: number
  recoveryFactor?: number
  var95?: number
  cvar95?: number
  grade?: string
  gradeScore?: number
}

export interface ReportData {
  metrics: ReportMetrics
  equityData?: { date: string; equity: number; benchmark?: number }[]
  drawdownData?: { date: string; drawdown: number }[]
  monthlyReturns?: Record<string, Record<string, number>>
  tradeLog?: {
    id: string
    date: string
    symbol: string
    side: string
    pnl: number
    duration: string
  }[]
  monteCarlo?: {
    percentile: string
    finalEquity: number
    cagr: number
    maxDrawdown: number
  }[]
  robustness?: {
    test: string
    result: string
    status: 'pass' | 'warning' | 'fail'
  }[]
}

export const defaultReportSections: ReportSection[] = [
  { id: 'summary', title: 'Executive Summary', enabled: true, description: 'High-level strategy overview and key metrics' },
  { id: 'performance', title: 'Performance Metrics', enabled: true, description: 'Comprehensive return and risk metrics' },
  { id: 'risk', title: 'Risk Analysis', enabled: true, description: 'VaR, CVaR, and tail risk analysis' },
  { id: 'equity', title: 'Equity Curve', enabled: true, description: 'Strategy equity vs benchmark' },
  { id: 'drawdown', title: 'Drawdown Analysis', enabled: true, description: 'Historical drawdown periods' },
  { id: 'distribution', title: 'Return Distribution', enabled: true, description: 'Return histogram and statistics' },
  { id: 'montecarlo', title: 'Monte Carlo Analysis', enabled: true, description: 'Probabilistic outcome scenarios' },
  { id: 'robustness', title: 'Robustness Tests', enabled: true, description: 'Walk-forward, PBO, and overfitting analysis' },
  { id: 'factors', title: 'Factor Attribution', enabled: true, description: 'Fama-French factor decomposition' },
  { id: 'heatmap', title: 'Monthly Returns', enabled: true, description: 'Calendar year performance heatmap' },
  { id: 'trades', title: 'Trade Log Summary', enabled: false, description: 'Recent trade activity' },
]

// Logo as base64 embedded SVG for PDF
const NEXURAL_LOGO_SVG = `
<svg width="168" height="180" viewBox="0 0 168 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="84" cy="90" r="70" fill="#0a0a0f" stroke="#10b981" stroke-width="2"/>
  <circle cx="84" cy="90" r="50" fill="none" stroke="#10b98140" stroke-width="1"/>
  <circle cx="84" cy="90" r="35" fill="none" stroke="#10b98120" stroke-width="1"/>
  <rect x="54" y="70" width="8" height="40" rx="2" fill="#10b981"/>
  <rect x="66" y="60" width="8" height="60" rx="2" fill="#10b981"/>
  <rect x="78" y="50" width="8" height="80" rx="2" fill="#10b981"/>
  <rect x="90" y="65" width="8" height="50" rx="2" fill="#10b981"/>
  <rect x="102" y="75" width="8" height="30" rx="2" fill="#10b981"/>
</svg>
`

function formatNumber(value: number | undefined, decimals = 2, prefix = '', suffix = ''): string {
  if (value === undefined || value === null) return 'N/A'
  return `${prefix}${value.toFixed(decimals)}${suffix}`
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function getGradeClass(grade: string | undefined): string {
  if (!grade) return 'grade-na'
  const g = grade.toUpperCase().charAt(0)
  if (g === 'A') return 'grade-a'
  if (g === 'B') return 'grade-b'
  if (g === 'C') return 'grade-c'
  if (g === 'D') return 'grade-d'
  return 'grade-f'
}

function getValueClass(value: number | undefined, threshold = 0): string {
  if (value === undefined || value === null) return ''
  return value >= threshold ? 'positive' : 'negative'
}

export function generatePrintableReport(config: ReportConfig, data: ReportData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups.')
  }

  const enabledSections = config.sections.filter(s => s.enabled)
  const isDark = config.theme === 'dark'

  const colors = isDark ? {
    bg: '#0a0a0f',
    bgCard: '#18181b',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    border: '#27272a',
    accent: '#10b981',
    positive: '#10b981',
    negative: '#ef4444',
    warning: '#f59e0b',
  } : {
    bg: '#ffffff',
    bgCard: '#f8f8f8',
    text: '#1a1a1a',
    textMuted: '#666666',
    border: '#e5e5e5',
    accent: '#10b981',
    positive: '#10b981',
    negative: '#ef4444',
    warning: '#f59e0b',
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${config.title} - Strategy Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    @page {
      size: ${config.pageSize};
      margin: 0.75in;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: ${colors.text};
      background: ${colors.bg};
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }
    
    .logo-container {
      margin-bottom: 2rem;
    }
    
    .logo-text {
      font-size: 32pt;
      font-weight: 700;
      letter-spacing: -1px;
      color: ${colors.accent};
      margin-top: 1rem;
    }
    
    .logo-subtext {
      font-size: 12pt;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: ${colors.textMuted};
      margin-top: 0.5rem;
    }
    
    .cover-title {
      font-size: 28pt;
      font-weight: 700;
      margin: 3rem 0 1rem;
      color: ${colors.text};
    }
    
    .cover-subtitle {
      font-size: 16pt;
      color: ${colors.textMuted};
      margin-bottom: 3rem;
    }
    
    .cover-meta {
      font-size: 10pt;
      color: ${colors.textMuted};
      margin-top: auto;
      padding-top: 3rem;
    }
    
    .cover-meta div {
      margin: 0.25rem 0;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid ${colors.accent};
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .header-logo {
      width: 40px;
      height: 40px;
    }
    
    .header-brand {
      font-size: 14pt;
      font-weight: 700;
      color: ${colors.accent};
    }
    
    .header-right {
      text-align: right;
      font-size: 9pt;
      color: ${colors.textMuted};
    }
    
    h1 {
      font-size: 22pt;
      margin: 0 0 1rem;
      font-weight: 700;
      color: ${colors.text};
    }
    
    h2 {
      font-size: 14pt;
      margin: 2rem 0 1rem;
      font-weight: 600;
      color: ${colors.text};
      border-bottom: 1px solid ${colors.border};
      padding-bottom: 0.5rem;
    }
    
    h3 {
      font-size: 11pt;
      margin: 1rem 0 0.5rem;
      font-weight: 600;
      color: ${colors.text};
    }
    
    p {
      margin-bottom: 0.5rem;
    }
    
    .section-description {
      font-size: 9pt;
      color: ${colors.textMuted};
      margin-bottom: 1rem;
      font-style: italic;
    }
    
    .executive-summary {
      background: ${colors.bgCard};
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    
    .summary-grade {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin: 1rem 0;
    }
    
    .metric-card {
      background: ${colors.bgCard};
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid ${colors.border};
    }
    
    .metric-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${colors.textMuted};
      margin-bottom: 4px;
    }
    
    .metric-value {
      font-size: 16pt;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      color: ${colors.text};
    }
    
    .metric-value.positive { color: ${colors.positive}; }
    .metric-value.negative { color: ${colors.negative}; }
    
    .grade-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 20pt;
    }
    
    .grade-a { background: ${colors.positive}20; color: ${colors.positive}; }
    .grade-b { background: #3b82f620; color: #3b82f6; }
    .grade-c { background: ${colors.warning}20; color: ${colors.warning}; }
    .grade-d { background: #f9731620; color: #f97316; }
    .grade-f { background: ${colors.negative}20; color: ${colors.negative}; }
    .grade-na { background: ${colors.border}; color: ${colors.textMuted}; }
    
    .grade-description {
      font-size: 11pt;
    }
    
    .grade-score {
      font-size: 10pt;
      color: ${colors.textMuted};
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin: 1rem 0;
    }
    
    th, td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid ${colors.border};
    }
    
    th {
      font-weight: 600;
      background: ${colors.bgCard};
      color: ${colors.text};
    }
    
    td {
      font-family: 'JetBrains Mono', monospace;
    }
    
    .status-pass { color: ${colors.positive}; }
    .status-warning { color: ${colors.warning}; }
    .status-fail { color: ${colors.negative}; }
    
    .chart-placeholder {
      background: ${colors.bgCard};
      height: 3in;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${colors.textMuted};
      font-style: italic;
      border-radius: 8px;
      border: 1px dashed ${colors.border};
      margin: 1rem 0;
    }
    
    .heatmap-grid {
      display: grid;
      grid-template-columns: 80px repeat(12, 1fr) 80px;
      gap: 2px;
      font-size: 8pt;
      margin: 1rem 0;
    }
    
    .heatmap-cell {
      padding: 0.3rem;
      text-align: center;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .heatmap-header {
      font-weight: 600;
      color: ${colors.textMuted};
    }
    
    .heatmap-positive { background: ${colors.positive}40; color: ${colors.positive}; }
    .heatmap-negative { background: ${colors.negative}40; color: ${colors.negative}; }
    .heatmap-neutral { background: ${colors.bgCard}; color: ${colors.textMuted}; }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80pt;
      color: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
      font-weight: 700;
      pointer-events: none;
      z-index: -1;
      white-space: nowrap;
    }
    
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid ${colors.border};
      font-size: 8pt;
      color: ${colors.textMuted};
      display: flex;
      justify-content: space-between;
    }
    
    .disclaimer {
      background: ${colors.bgCard};
      padding: 1rem;
      border-radius: 8px;
      font-size: 8pt;
      color: ${colors.textMuted};
      margin-top: 2rem;
      border: 1px solid ${colors.border};
    }
    
    .page-break {
      page-break-after: always;
    }
    
    @media print {
      body {
        padding: 0;
        background: ${colors.bg};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .no-print {
        display: none !important;
      }
      
      .cover-page {
        height: 100vh;
      }
    }

    .print-button-container {
      text-align: center;
      margin: 2rem 0;
      padding: 2rem;
      background: ${colors.bgCard};
      border-radius: 8px;
    }

    .print-button {
      padding: 1rem 2rem;
      font-size: 14pt;
      font-weight: 600;
      background: ${colors.accent};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .print-button:hover {
      opacity: 0.9;
    }

    .print-instructions {
      margin-top: 1rem;
      font-size: 10pt;
      color: ${colors.textMuted};
    }
  </style>
</head>
<body>
  ${config.confidentialWatermark ? '<div class="watermark">CONFIDENTIAL</div>' : ''}
  
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="logo-container">
      ${NEXURAL_LOGO_SVG}
      <div class="logo-text">NEXURAL</div>
      <div class="logo-subtext">Trading Research</div>
    </div>
    
    <div class="cover-title">${config.title}</div>
    <div class="cover-subtitle">${config.strategyName}</div>
    
    <div class="cover-meta">
      ${config.analyst ? `<div>Prepared by: ${config.analyst}</div>` : ''}
      ${config.firm ? `<div>${config.firm}</div>` : ''}
      <div>Generated: ${config.generatedAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} at ${config.generatedAt.toLocaleTimeString()}</div>
      <div style="margin-top: 1rem; font-family: 'JetBrains Mono', monospace;">
        Report ID: NXR-${Date.now().toString(36).toUpperCase()}
      </div>
    </div>
  </div>

  <!-- Report Content -->
  <div class="header">
    <div class="header-left">
      <svg class="header-logo" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" fill="${colors.bg}" stroke="${colors.accent}" stroke-width="1.5"/>
        <rect x="10" y="15" width="4" height="15" rx="1" fill="${colors.accent}"/>
        <rect x="16" y="10" width="4" height="20" rx="1" fill="${colors.accent}"/>
        <rect x="22" y="12" width="4" height="18" rx="1" fill="${colors.accent}"/>
        <rect x="28" y="17" width="4" height="10" rx="1" fill="${colors.accent}"/>
      </svg>
      <span class="header-brand">Nexural Research</span>
    </div>
    <div class="header-right">
      <div>${config.strategyName}</div>
      <div>${config.generatedAt.toLocaleDateString()}</div>
    </div>
  </div>

  <h1>Strategy Analysis Report</h1>

  ${enabledSections.map(section => {
    switch (section.id) {
      case 'summary':
        return `
          <section id="summary">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            
            <div class="executive-summary">
              <div class="summary-grade">
                <div class="grade-badge ${getGradeClass(data.metrics.grade)}">
                  ${data.metrics.grade || 'N/A'}
                </div>
                <div>
                  <div class="grade-description">Overall Strategy Grade</div>
                  <div class="grade-score">Score: ${data.metrics.gradeScore?.toFixed(0) || 'N/A'}/100</div>
                </div>
              </div>
              
              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-label">CAGR</div>
                  <div class="metric-value ${getValueClass(data.metrics.cagr)}">${formatPercent(data.metrics.cagr)}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Sharpe Ratio</div>
                  <div class="metric-value ${getValueClass(data.metrics.sharpe, 1)}">${formatNumber(data.metrics.sharpe)}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Max Drawdown</div>
                  <div class="metric-value negative">${formatPercent(data.metrics.maxDrawdown)}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Win Rate</div>
                  <div class="metric-value ${getValueClass(data.metrics.winRate, 0.5)}">${formatPercent(data.metrics.winRate)}</div>
                </div>
              </div>
            </div>
          </section>
        `
      
      case 'performance':
        return `
          <section id="performance">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            
            <h3>Return Metrics</h3>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">CAGR</div>
                <div class="metric-value ${getValueClass(data.metrics.cagr)}">${formatPercent(data.metrics.cagr)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Net Profit</div>
                <div class="metric-value ${getValueClass(data.metrics.netProfit)}">${formatCurrency(data.metrics.netProfit)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Profit Factor</div>
                <div class="metric-value ${getValueClass(data.metrics.profitFactor, 1)}">${formatNumber(data.metrics.profitFactor)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Expectancy</div>
                <div class="metric-value ${getValueClass(data.metrics.expectancy)}">${formatCurrency(data.metrics.expectancy)}</div>
              </div>
            </div>
            
            <h3>Risk-Adjusted Returns</h3>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Sharpe Ratio</div>
                <div class="metric-value ${getValueClass(data.metrics.sharpe, 1)}">${formatNumber(data.metrics.sharpe)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Sortino Ratio</div>
                <div class="metric-value ${getValueClass(data.metrics.sortino, 1)}">${formatNumber(data.metrics.sortino)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Calmar Ratio</div>
                <div class="metric-value ${getValueClass(data.metrics.calmar, 1)}">${formatNumber(data.metrics.calmar)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Omega Ratio</div>
                <div class="metric-value ${getValueClass(data.metrics.omega, 1)}">${formatNumber(data.metrics.omega)}</div>
              </div>
            </div>
            
            <h3>Trade Statistics</h3>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Total Trades</div>
                <div class="metric-value">${data.metrics.totalTrades || 'N/A'}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Win Rate</div>
                <div class="metric-value ${getValueClass(data.metrics.winRate, 0.5)}">${formatPercent(data.metrics.winRate)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Avg Winner</div>
                <div class="metric-value positive">${formatCurrency(data.metrics.avgWin)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Avg Loser</div>
                <div class="metric-value negative">${formatCurrency(data.metrics.avgLoss)}</div>
              </div>
            </div>
          </section>
        `
      
      case 'risk':
        return `
          <section id="risk">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Max Drawdown</div>
                <div class="metric-value negative">${formatPercent(data.metrics.maxDrawdown)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">VaR (95%)</div>
                <div class="metric-value negative">${formatPercent(data.metrics.var95)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">CVaR (95%)</div>
                <div class="metric-value negative">${formatPercent(data.metrics.cvar95)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Recovery Factor</div>
                <div class="metric-value ${getValueClass(data.metrics.recoveryFactor, 1)}">${formatNumber(data.metrics.recoveryFactor)}</div>
              </div>
            </div>
            
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Largest Winner</div>
                <div class="metric-value positive">${formatCurrency(data.metrics.largestWin)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Largest Loser</div>
                <div class="metric-value negative">${formatCurrency(data.metrics.largestLoss)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Max Consecutive Losses</div>
                <div class="metric-value">${data.metrics.consecutiveLosses || 'N/A'}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Calmar Ratio</div>
                <div class="metric-value ${getValueClass(data.metrics.calmar, 0.5)}">${formatNumber(data.metrics.calmar)}</div>
              </div>
            </div>
          </section>
        `
      
      case 'equity':
        return `
          <section id="equity">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            <div class="chart-placeholder">
              [Equity Curve Chart - Export from dashboard for high-resolution image]
            </div>
          </section>
        `
      
      case 'drawdown':
        return `
          <section id="drawdown">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            <div class="chart-placeholder">
              [Underwater/Drawdown Chart - Export from dashboard for high-resolution image]
            </div>
          </section>
        `
      
      case 'distribution':
        return `
          <section id="distribution">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            <div class="chart-placeholder">
              [Return Distribution Histogram - Export from dashboard for high-resolution image]
            </div>
          </section>
        `
      
      case 'montecarlo':
        return `
          <section id="montecarlo">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            ${data.monteCarlo ? `
              <table>
                <thead>
                  <tr>
                    <th>Percentile</th>
                    <th>Final Equity</th>
                    <th>CAGR</th>
                    <th>Max Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.monteCarlo.map(row => `
                    <tr>
                      <td>${row.percentile}</td>
                      <td>${formatCurrency(row.finalEquity)}</td>
                      <td class="${getValueClass(row.cagr)}">${formatPercent(row.cagr)}</td>
                      <td class="negative">${formatPercent(row.maxDrawdown)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="chart-placeholder">[Monte Carlo Simulation Results]</div>'}
          </section>
        `
      
      case 'robustness':
        return `
          <section id="robustness">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            ${data.robustness ? `
              <table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Result</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.robustness.map(row => `
                    <tr>
                      <td>${row.test}</td>
                      <td>${row.result}</td>
                      <td class="status-${row.status}">${row.status.toUpperCase()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="chart-placeholder">[Robustness Test Results]</div>'}
          </section>
        `
      
      case 'factors':
        return `
          <section id="factors">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            <div class="chart-placeholder">
              [Fama-French Factor Decomposition - Export from Factor Attribution page]
            </div>
          </section>
        `
      
      case 'heatmap':
        return `
          <section id="heatmap">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            <div class="chart-placeholder">
              [Monthly Returns Heatmap - Export from dashboard for full calendar view]
            </div>
          </section>
        `
      
      case 'trades':
        return `
          <section id="trades" class="page-break">
            <h2>${section.title}</h2>
            <p class="section-description">${section.description}</p>
            ${data.tradeLog ? `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>P&L</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.tradeLog.slice(0, 25).map(trade => `
                    <tr>
                      <td>${trade.date}</td>
                      <td>${trade.symbol}</td>
                      <td>${trade.side}</td>
                      <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(trade.pnl)}</td>
                      <td>${trade.duration}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${data.tradeLog.length > 25 ? `<p style="font-style: italic; color: ${colors.textMuted};">Showing 25 of ${data.tradeLog.length} trades. Export full trade log for complete data.</p>` : ''}
            ` : '<div class="chart-placeholder">[Trade Log - Enable in export settings]</div>'}
          </section>
        `
      
      default:
        return ''
    }
  }).join('')}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> ${config.disclaimer || 'This report is for informational purposes only and does not constitute investment advice. Past performance is not indicative of future results. Trading involves substantial risk of loss. The metrics and analysis presented are based on historical data and simulated results. Actual trading results may vary significantly.'}
  </div>

  <div class="footer">
    <div>Nexural Research Platform</div>
    <div>Confidential - For Authorized Recipients Only</div>
    <div>${config.generatedAt.toLocaleDateString()}</div>
  </div>

  <div class="no-print print-button-container">
    <button class="print-button" onclick="window.print()">
      Download as PDF
    </button>
    <p class="print-instructions">
      Click the button above or use Ctrl/Cmd + P to save as PDF.<br/>
      For best results, enable "Background graphics" in print settings.
    </p>
  </div>
</body>
</html>
`

  printWindow.document.write(html)
  printWindow.document.close()
}

// CSV Export
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const value = row[h]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return String(value ?? '')
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// JSON Export
export function exportToJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.json`
  a.click()
  URL.revokeObjectURL(url)
}
