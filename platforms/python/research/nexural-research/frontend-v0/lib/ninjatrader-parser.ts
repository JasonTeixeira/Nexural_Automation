// NinjaTrader 8 CSV Parser & Data Quality Engine
// Institutional-grade parsing for NT8 strategy performance reports

import Papa from 'papaparse'

// NinjaTrader Trade Types
export interface NTTrade {
  id: string
  instrument: string
  action: 'Buy' | 'Sell' | 'Short' | 'Cover'
  quantity: number
  entryTime: Date
  entryPrice: number
  exitTime: Date | null
  exitPrice: number | null
  profit: number
  cumProfit: number
  commission: number
  mae: number // Maximum Adverse Excursion
  mfe: number // Maximum Favorable Excursion
  etd: number // End Trade Drawdown
  bars: number
  session: 'RTH' | 'ETH' | 'FULL'
  // Calculated fields
  holdingPeriodMinutes: number
  rMultiple: number | null
  slippage: number
}

export interface NTPerformanceReport {
  strategyName: string
  instrument: string
  dataSource: string
  dateRange: { start: Date; end: Date }
  trades: NTTrade[]
  parameters: Record<string, string | number>
  
  // Summary stats from NT
  totalNetProfit: number
  grossProfit: number
  grossLoss: number
  profitFactor: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  percentProfitable: number
  avgTrade: number
  avgWinningTrade: number
  avgLosingTrade: number
  largestWinner: number
  largestLoser: number
  maxConsecutiveWinners: number
  maxConsecutiveLosers: number
  avgBarsInTrade: number
  maxDrawdown: number
  maxDrawdownPercent: number
  sharpeRatio: number | null
  sortinoRatio: number | null
}

export interface DataQualityReport {
  score: number // 0-100
  issues: DataQualityIssue[]
  warnings: DataQualityWarning[]
  passed: DataQualityCheck[]
}

export interface DataQualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  code: string
  title: string
  description: string
  affectedTrades?: number[]
  recommendation: string
}

export interface DataQualityWarning {
  code: string
  title: string
  description: string
  value?: number | string
}

export interface DataQualityCheck {
  code: string
  title: string
  status: 'passed'
}

// NinjaTrader CSV Column Mappings (NT8 format)
const NT8_COLUMN_MAPPINGS: Record<string, string> = {
  'Trade #': 'id',
  'Trade Number': 'id',
  'Instrument': 'instrument',
  'Symbol': 'instrument',
  'Market pos.': 'action',
  'Market Position': 'action',
  'Action': 'action',
  'Qty': 'quantity',
  'Quantity': 'quantity',
  'Entry time': 'entryTime',
  'Entry Time': 'entryTime',
  'Entry price': 'entryPrice',
  'Entry Price': 'entryPrice',
  'Exit time': 'exitTime',
  'Exit Time': 'exitTime',
  'Exit price': 'exitPrice',
  'Exit Price': 'exitPrice',
  'Profit': 'profit',
  'P/L': 'profit',
  'Net P/L': 'profit',
  'Cum. profit': 'cumProfit',
  'Cumulative Profit': 'cumProfit',
  'Cum. P/L': 'cumProfit',
  'Commission': 'commission',
  'Comm': 'commission',
  'MAE': 'mae',
  'Max. Adverse Excursion': 'mae',
  'MFE': 'mfe',
  'Max. Favorable Excursion': 'mfe',
  'ETD': 'etd',
  'End Trade Drawdown': 'etd',
  'Bars': 'bars',
  'Bars in Trade': 'bars',
  'Duration': 'bars',
}

// Session time detection (ES futures example)
const RTH_START = 9 * 60 + 30 // 9:30 AM ET
const RTH_END = 16 * 60 // 4:00 PM ET

function detectSession(time: Date): 'RTH' | 'ETH' | 'FULL' {
  const minutes = time.getHours() * 60 + time.getMinutes()
  if (minutes >= RTH_START && minutes < RTH_END) {
    return 'RTH'
  }
  return 'ETH'
}

// Parse NT8 date formats
function parseNTDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '' || dateStr === '-') return null
  
  // Try multiple formats
  const formats = [
    // MM/DD/YYYY HH:MM:SS AM/PM
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    // MM/DD/YYYY HH:MM
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/,
  ]
  
  // Try native parsing first
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  
  return null
}

// Parse currency/number values
function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value
  if (!value || value === '' || value === '-') return 0
  
  // Remove currency symbols and commas
  const cleaned = value.toString()
    .replace(/[$,()]/g, '')
    .replace(/^\((.+)\)$/, '-$1') // Handle (negative) format
    .trim()
  
  return parseFloat(cleaned) || 0
}

// Main parser function
export function parseNinjaTraderCSV(csvContent: string): {
  report: NTPerformanceReport | null
  quality: DataQualityReport
  error?: string
} {
  const issues: DataQualityIssue[] = []
  const warnings: DataQualityWarning[] = []
  const passed: DataQualityCheck[] = []
  
  try {
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Normalize header to our internal format
        const trimmed = header.trim()
        return NT8_COLUMN_MAPPINGS[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '_')
      },
    })
    
    if (parsed.errors.length > 0) {
      issues.push({
        severity: 'high',
        code: 'PARSE_ERROR',
        title: 'CSV Parsing Errors',
        description: `Found ${parsed.errors.length} parsing errors in the CSV file`,
        recommendation: 'Check CSV format and ensure proper column delimiters',
      })
    }
    
    const rows = parsed.data as Record<string, string>[]
    
    if (rows.length === 0) {
      return {
        report: null,
        quality: { score: 0, issues: [{ 
          severity: 'critical', 
          code: 'NO_DATA', 
          title: 'No Data Found',
          description: 'The CSV file contains no trade data',
          recommendation: 'Upload a valid NinjaTrader performance report CSV',
        }], warnings: [], passed: [] },
        error: 'No data found in CSV',
      }
    }
    
    // Detect columns
    const firstRow = rows[0]
    const hasMAE = 'mae' in firstRow
    const hasMFE = 'mfe' in firstRow
    const hasCommission = 'commission' in firstRow
    
    if (!hasMAE || !hasMFE) {
      warnings.push({
        code: 'MISSING_MAE_MFE',
        title: 'Missing MAE/MFE Data',
        description: 'Trade execution quality metrics (MAE/MFE) not available',
      })
    } else {
      passed.push({
        code: 'HAS_MAE_MFE',
        title: 'MAE/MFE Data Present',
        status: 'passed',
      })
    }
    
    // Parse trades
    const trades: NTTrade[] = []
    const tradeIds = new Set<string>()
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      const entryTime = parseNTDate(row.entryTime || row.entry_time || '')
      const exitTime = parseNTDate(row.exitTime || row.exit_time || '')
      
      if (!entryTime) {
        issues.push({
          severity: 'medium',
          code: 'INVALID_ENTRY_TIME',
          title: 'Invalid Entry Time',
          description: `Trade at row ${i + 2} has invalid entry time`,
          affectedTrades: [i],
          recommendation: 'Check date format in CSV',
        })
        continue
      }
      
      const tradeId = row.id || `trade_${i}`
      
      // Check for duplicates
      if (tradeIds.has(tradeId)) {
        warnings.push({
          code: 'DUPLICATE_TRADE',
          title: 'Duplicate Trade ID',
          description: `Trade ID ${tradeId} appears multiple times`,
          value: tradeId,
        })
      }
      tradeIds.add(tradeId)
      
      const entryPrice = parseNumber(row.entryPrice || row.entry_price || 0)
      const exitPrice = parseNumber(row.exitPrice || row.exit_price || 0)
      const profit = parseNumber(row.profit || row.p_l || row.net_p_l || 0)
      
      // Calculate holding period
      let holdingPeriodMinutes = 0
      if (exitTime) {
        holdingPeriodMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60)
      }
      
      // Detect session
      const session = detectSession(entryTime)
      
      // Calculate slippage estimate (if we have tick data context)
      const slippage = 0 // Would need tick-level data
      
      // Calculate R-Multiple (if we have stop loss info)
      const rMultiple = null // Would need strategy parameters
      
      const trade: NTTrade = {
        id: tradeId,
        instrument: row.instrument || row.symbol || 'UNKNOWN',
        action: (row.action || row.market_pos || 'Buy') as NTTrade['action'],
        quantity: parseNumber(row.quantity || row.qty || 1),
        entryTime,
        entryPrice,
        exitTime,
        exitPrice: exitPrice || null,
        profit,
        cumProfit: parseNumber(row.cumProfit || row.cum_profit || row.cum_p_l || 0),
        commission: parseNumber(row.commission || row.comm || 0),
        mae: parseNumber(row.mae || 0),
        mfe: parseNumber(row.mfe || 0),
        etd: parseNumber(row.etd || 0),
        bars: parseNumber(row.bars || row.bars_in_trade || row.duration || 0),
        session,
        holdingPeriodMinutes,
        rMultiple,
        slippage,
      }
      
      trades.push(trade)
    }
    
    if (trades.length === 0) {
      return {
        report: null,
        quality: { score: 0, issues: [{ 
          severity: 'critical', 
          code: 'NO_VALID_TRADES', 
          title: 'No Valid Trades',
          description: 'Could not parse any valid trades from the CSV',
          recommendation: 'Ensure CSV follows NinjaTrader 8 export format',
        }], warnings, passed },
        error: 'No valid trades parsed',
      }
    }
    
    passed.push({
      code: 'TRADES_PARSED',
      title: `${trades.length} Trades Parsed`,
      status: 'passed',
    })
    
    // Calculate summary statistics
    const winningTrades = trades.filter(t => t.profit > 0)
    const losingTrades = trades.filter(t => t.profit < 0)
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0))
    
    // Calculate drawdown
    let maxDrawdown = 0
    let peak = 0
    let currentDD = 0
    
    for (const trade of trades) {
      if (trade.cumProfit > peak) {
        peak = trade.cumProfit
      }
      currentDD = peak - trade.cumProfit
      if (currentDD > maxDrawdown) {
        maxDrawdown = currentDD
      }
    }
    
    // Detect instrument from trades
    const instruments = [...new Set(trades.map(t => t.instrument))]
    const primaryInstrument = instruments[0] || 'UNKNOWN'
    
    // Build report
    const report: NTPerformanceReport = {
      strategyName: 'Imported Strategy',
      instrument: primaryInstrument,
      dataSource: 'NinjaTrader 8',
      dateRange: {
        start: trades[0].entryTime,
        end: trades[trades.length - 1].exitTime || trades[trades.length - 1].entryTime,
      },
      trades,
      parameters: {},
      
      totalNetProfit: trades[trades.length - 1]?.cumProfit || trades.reduce((sum, t) => sum + t.profit, 0),
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      percentProfitable: (winningTrades.length / trades.length) * 100,
      avgTrade: trades.reduce((sum, t) => sum + t.profit, 0) / trades.length,
      avgWinningTrade: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      avgLosingTrade: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
      largestWinner: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit)) : 0,
      largestLoser: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit)) : 0,
      maxConsecutiveWinners: calculateMaxConsecutive(trades, true),
      maxConsecutiveLosers: calculateMaxConsecutive(trades, false),
      avgBarsInTrade: trades.reduce((sum, t) => sum + t.bars, 0) / trades.length,
      maxDrawdown,
      maxDrawdownPercent: peak > 0 ? (maxDrawdown / peak) * 100 : 0,
      sharpeRatio: null, // Calculated elsewhere with proper risk-free rate
      sortinoRatio: null,
    }
    
    // Run data quality checks
    const qualityResult = runDataQualityChecks(report, trades, issues, warnings, passed)
    
    return {
      report,
      quality: qualityResult,
    }
    
  } catch (error) {
    return {
      report: null,
      quality: { 
        score: 0, 
        issues: [{ 
          severity: 'critical', 
          code: 'PARSE_EXCEPTION', 
          title: 'Parse Error',
          description: error instanceof Error ? error.message : 'Unknown parsing error',
          recommendation: 'Check CSV file format',
        }], 
        warnings: [], 
        passed: [] 
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function calculateMaxConsecutive(trades: NTTrade[], winners: boolean): number {
  let max = 0
  let current = 0
  
  for (const trade of trades) {
    const isWinner = trade.profit > 0
    if ((winners && isWinner) || (!winners && !isWinner)) {
      current++
      max = Math.max(max, current)
    } else {
      current = 0
    }
  }
  
  return max
}

function runDataQualityChecks(
  report: NTPerformanceReport,
  trades: NTTrade[],
  issues: DataQualityIssue[],
  warnings: DataQualityWarning[],
  passed: DataQualityCheck[]
): DataQualityReport {
  
  // 1. Check for look-ahead bias indicators
  const sortedByEntry = [...trades].sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime())
  const sortedByExit = [...trades].sort((a, b) => {
    const aTime = a.exitTime?.getTime() || 0
    const bTime = b.exitTime?.getTime() || 0
    return aTime - bTime
  })
  
  let outOfOrderCount = 0
  for (let i = 1; i < sortedByEntry.length; i++) {
    const prevExit = sortedByEntry[i - 1].exitTime
    const currEntry = sortedByEntry[i].entryTime
    if (prevExit && currEntry < prevExit) {
      outOfOrderCount++
    }
  }
  
  if (outOfOrderCount > 0) {
    issues.push({
      severity: 'high',
      code: 'OVERLAPPING_TRADES',
      title: 'Overlapping Trades Detected',
      description: `Found ${outOfOrderCount} trades that overlap in time. This may indicate position sizing issues or look-ahead bias.`,
      recommendation: 'Review strategy logic for proper position management',
    })
  } else {
    passed.push({
      code: 'NO_OVERLAPPING_TRADES',
      title: 'No Overlapping Trades',
      status: 'passed',
    })
  }
  
  // 2. Check for unrealistic fills
  const zeroSlippageTrades = trades.filter(t => t.slippage === 0).length
  if (zeroSlippageTrades === trades.length && trades.length > 100) {
    warnings.push({
      code: 'PERFECT_FILLS',
      title: 'Perfect Fills Assumed',
      description: 'All trades show zero slippage - real trading will have fill variations',
      value: trades.length,
    })
  }
  
  // 3. Check for data gaps
  const gaps: { from: Date; to: Date; days: number }[] = []
  for (let i = 1; i < sortedByEntry.length; i++) {
    const prevTrade = sortedByEntry[i - 1]
    const currTrade = sortedByEntry[i]
    const prevTime = prevTrade.exitTime || prevTrade.entryTime
    const daysDiff = (currTrade.entryTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60 * 24)
    
    // Flag gaps longer than 5 trading days (7 calendar days)
    if (daysDiff > 7) {
      gaps.push({
        from: prevTime,
        to: currTrade.entryTime,
        days: Math.round(daysDiff),
      })
    }
  }
  
  if (gaps.length > 0) {
    warnings.push({
      code: 'DATA_GAPS',
      title: 'Large Data Gaps Detected',
      description: `Found ${gaps.length} gaps longer than 7 days in trading history`,
      value: gaps.length,
    })
  } else {
    passed.push({
      code: 'CONTINUOUS_DATA',
      title: 'Continuous Trading History',
      status: 'passed',
    })
  }
  
  // 4. Check for curve fitting indicators
  // High profit factor with low trade count is suspicious
  if (report.profitFactor > 3 && report.totalTrades < 100) {
    issues.push({
      severity: 'medium',
      code: 'CURVE_FIT_RISK',
      title: 'Potential Curve Fitting',
      description: `High profit factor (${report.profitFactor.toFixed(2)}) with only ${report.totalTrades} trades suggests possible over-optimization`,
      recommendation: 'Test with out-of-sample data and walk-forward analysis',
    })
  }
  
  // Very high win rate is suspicious
  if (report.percentProfitable > 80 && report.totalTrades > 50) {
    warnings.push({
      code: 'HIGH_WIN_RATE',
      title: 'Unusually High Win Rate',
      description: `${report.percentProfitable.toFixed(1)}% win rate may indicate curve fitting or asymmetric risk`,
      value: report.percentProfitable,
    })
  }
  
  // 5. Check sample size
  if (report.totalTrades < 30) {
    issues.push({
      severity: 'medium',
      code: 'LOW_SAMPLE_SIZE',
      title: 'Insufficient Sample Size',
      description: `Only ${report.totalTrades} trades - statistically insufficient for reliable conclusions`,
      recommendation: 'Gather at least 100+ trades for meaningful analysis',
    })
  } else if (report.totalTrades >= 100) {
    passed.push({
      code: 'ADEQUATE_SAMPLE',
      title: 'Adequate Sample Size',
      status: 'passed',
    })
  }
  
  // 6. Check for commission impact
  const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0)
  const commissionPercent = (totalCommissions / Math.abs(report.totalNetProfit)) * 100
  
  if (commissionPercent > 30) {
    warnings.push({
      code: 'HIGH_COMMISSION_IMPACT',
      title: 'High Commission Impact',
      description: `Commissions represent ${commissionPercent.toFixed(1)}% of net profit`,
      value: commissionPercent,
    })
  }
  
  // 7. Check for MAE/MFE analysis quality
  if (trades.some(t => t.mae > 0 || t.mfe > 0)) {
    const avgMAEtoProfit = trades
      .filter(t => t.profit > 0 && t.mae > 0)
      .map(t => t.mae / t.profit)
    
    if (avgMAEtoProfit.length > 0) {
      const avgRatio = avgMAEtoProfit.reduce((a, b) => a + b, 0) / avgMAEtoProfit.length
      if (avgRatio > 1.5) {
        warnings.push({
          code: 'HIGH_MAE_RATIO',
          title: 'High MAE to Profit Ratio',
          description: 'Winners experience significant adverse excursion before becoming profitable',
          value: avgRatio,
        })
      }
    }
    
    passed.push({
      code: 'MAE_MFE_ANALYSIS',
      title: 'MAE/MFE Data Available',
      status: 'passed',
    })
  }
  
  // 8. Check time distribution
  const hourCounts = new Map<number, number>()
  for (const trade of trades) {
    const hour = trade.entryTime.getHours()
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  }
  
  const maxHourConcentration = Math.max(...hourCounts.values()) / trades.length
  if (maxHourConcentration > 0.5) {
    warnings.push({
      code: 'TIME_CONCENTRATION',
      title: 'High Time Concentration',
      description: `Over 50% of trades occur in a single hour - may indicate time-specific edge`,
      value: maxHourConcentration * 100,
    })
  }
  
  // Calculate quality score
  let score = 100
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical': score -= 30; break
      case 'high': score -= 15; break
      case 'medium': score -= 8; break
      case 'low': score -= 3; break
    }
  }
  
  score -= warnings.length * 2
  score = Math.max(0, Math.min(100, score))
  
  return { score, issues, warnings, passed }
}

// Export analysis context for AI
export function generateAnalysisContext(report: NTPerformanceReport, quality: DataQualityReport): string {
  const lines = [
    `# Strategy Analysis Context`,
    ``,
    `## Overview`,
    `- Strategy: ${report.strategyName}`,
    `- Instrument: ${report.instrument}`,
    `- Period: ${report.dateRange.start.toLocaleDateString()} to ${report.dateRange.end.toLocaleDateString()}`,
    `- Total Trades: ${report.totalTrades}`,
    ``,
    `## Performance Metrics`,
    `- Net Profit: $${report.totalNetProfit.toFixed(2)}`,
    `- Profit Factor: ${report.profitFactor.toFixed(2)}`,
    `- Win Rate: ${report.percentProfitable.toFixed(1)}%`,
    `- Average Trade: $${report.avgTrade.toFixed(2)}`,
    `- Average Winner: $${report.avgWinningTrade.toFixed(2)}`,
    `- Average Loser: $${report.avgLosingTrade.toFixed(2)}`,
    `- Largest Winner: $${report.largestWinner.toFixed(2)}`,
    `- Largest Loser: $${report.largestLoser.toFixed(2)}`,
    `- Max Drawdown: $${report.maxDrawdown.toFixed(2)} (${report.maxDrawdownPercent.toFixed(1)}%)`,
    `- Max Consecutive Winners: ${report.maxConsecutiveWinners}`,
    `- Max Consecutive Losers: ${report.maxConsecutiveLosers}`,
    ``,
    `## Data Quality Score: ${quality.score}/100`,
    ``,
  ]
  
  if (quality.issues.length > 0) {
    lines.push(`### Issues Detected:`)
    for (const issue of quality.issues) {
      lines.push(`- [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`)
    }
    lines.push(``)
  }
  
  if (quality.warnings.length > 0) {
    lines.push(`### Warnings:`)
    for (const warning of quality.warnings) {
      lines.push(`- ${warning.title}: ${warning.description}`)
    }
    lines.push(``)
  }
  
  // Session analysis
  const rthTrades = report.trades.filter(t => t.session === 'RTH')
  const ethTrades = report.trades.filter(t => t.session === 'ETH')
  
  if (rthTrades.length > 0 || ethTrades.length > 0) {
    lines.push(`## Session Analysis`)
    lines.push(`- RTH Trades: ${rthTrades.length} (P&L: $${rthTrades.reduce((s, t) => s + t.profit, 0).toFixed(2)})`)
    lines.push(`- ETH Trades: ${ethTrades.length} (P&L: $${ethTrades.reduce((s, t) => s + t.profit, 0).toFixed(2)})`)
    lines.push(``)
  }
  
  // Time of day analysis
  const hourlyPnL = new Map<number, number>()
  for (const trade of report.trades) {
    const hour = trade.entryTime.getHours()
    hourlyPnL.set(hour, (hourlyPnL.get(hour) || 0) + trade.profit)
  }
  
  const sortedHours = [...hourlyPnL.entries()].sort((a, b) => b[1] - a[1])
  lines.push(`## Best Trading Hours (by P&L):`)
  for (const [hour, pnl] of sortedHours.slice(0, 5)) {
    lines.push(`- ${hour}:00: $${pnl.toFixed(2)}`)
  }
  lines.push(``)
  
  // Day of week analysis
  const dayPnL = new Map<number, number>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const trade of report.trades) {
    const day = trade.entryTime.getDay()
    dayPnL.set(day, (dayPnL.get(day) || 0) + trade.profit)
  }
  
  lines.push(`## Day of Week Analysis:`)
  for (let i = 0; i < 7; i++) {
    const pnl = dayPnL.get(i) || 0
    if (pnl !== 0) {
      lines.push(`- ${dayNames[i]}: $${pnl.toFixed(2)}`)
    }
  }
  
  return lines.join('\n')
}
