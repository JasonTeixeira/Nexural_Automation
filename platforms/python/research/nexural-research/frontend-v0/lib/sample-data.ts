// Sample strategies for demo mode
export interface SampleStrategy {
  id: string
  name: string
  description: string
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'mixed'
  characteristics: {
    expected_sharpe: number
    expected_win_rate: number
    expected_max_dd: number
    trade_frequency: string
  }
}

export const sampleStrategies: SampleStrategy[] = [
  {
    id: 'trend-following-es',
    name: 'ES Trend Following',
    description: 'Long-term trend following strategy on E-mini S&P 500 futures using 20/50 EMA crossover with ATR-based stops',
    type: 'trend_following',
    characteristics: {
      expected_sharpe: 1.45,
      expected_win_rate: 42,
      expected_max_dd: 18.5,
      trade_frequency: '8-12 trades/month',
    },
  },
  {
    id: 'mean-reversion-nq',
    name: 'NQ Mean Reversion',
    description: 'Intraday mean reversion on NASDAQ futures targeting oversold/overbought RSI conditions with tight risk management',
    type: 'mean_reversion',
    characteristics: {
      expected_sharpe: 1.82,
      expected_win_rate: 65,
      expected_max_dd: 12.3,
      trade_frequency: '25-40 trades/month',
    },
  },
  {
    id: 'momentum-cl',
    name: 'CL Momentum Breakout',
    description: 'Crude oil breakout strategy capturing momentum from consolidation patterns with pyramiding',
    type: 'momentum',
    characteristics: {
      expected_sharpe: 1.15,
      expected_win_rate: 38,
      expected_max_dd: 24.2,
      trade_frequency: '15-20 trades/month',
    },
  },
  {
    id: 'stat-arb-spreads',
    name: 'Index Spreads Arb',
    description: 'Statistical arbitrage between correlated index futures (ES/NQ/YM) exploiting mean-reverting spreads',
    type: 'arbitrage',
    characteristics: {
      expected_sharpe: 2.10,
      expected_win_rate: 58,
      expected_max_dd: 8.5,
      trade_frequency: '60-80 trades/month',
    },
  },
]

// Generate sample trade data
export function generateSampleTrades(strategyId: string, count: number = 500) {
  const strategy = sampleStrategies.find(s => s.id === strategyId) || sampleStrategies[0]
  const trades = []
  
  const baseDate = new Date()
  baseDate.setFullYear(baseDate.getFullYear() - 2)
  
  let cumulativePnL = 0
  const winRate = strategy.characteristics.expected_win_rate / 100
  const avgWinMultiple = strategy.type === 'trend_following' ? 2.5 : 
                         strategy.type === 'mean_reversion' ? 1.3 :
                         strategy.type === 'momentum' ? 3.0 : 1.5
  
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() < winRate
    const baseAmount = 250 + Math.random() * 500
    const pnl = isWin 
      ? baseAmount * avgWinMultiple * (0.8 + Math.random() * 0.4)
      : -baseAmount * (0.8 + Math.random() * 0.4)
    
    cumulativePnL += pnl
    
    const entryDate = new Date(baseDate.getTime() + i * (24 * 60 * 60 * 1000 * (730 / count)))
    const holdingPeriod = strategy.type === 'mean_reversion' 
      ? 1 + Math.random() * 4 
      : strategy.type === 'trend_following'
      ? 24 + Math.random() * 168
      : 4 + Math.random() * 24
    
    const exitDate = new Date(entryDate.getTime() + holdingPeriod * 60 * 60 * 1000)
    
    trades.push({
      id: i + 1,
      entry_time: entryDate.toISOString(),
      exit_time: exitDate.toISOString(),
      symbol: strategy.id.includes('es') ? 'ES' : 
              strategy.id.includes('nq') ? 'NQ' :
              strategy.id.includes('cl') ? 'CL' : 'ES',
      side: Math.random() > 0.5 ? 'Long' : 'Short',
      quantity: Math.floor(1 + Math.random() * 3),
      entry_price: 4500 + Math.random() * 500,
      exit_price: 4500 + Math.random() * 500,
      profit: pnl,
      commission: 4.50,
      mae: isWin ? -baseAmount * 0.3 * Math.random() : -baseAmount * (1 + Math.random()),
      mfe: isWin ? pnl * (1 + Math.random() * 0.3) : baseAmount * 0.2 * Math.random(),
      duration_seconds: holdingPeriod * 3600,
    })
  }
  
  return trades
}

// Generate sample equity curve
export function generateSampleEquityCurve(trades: ReturnType<typeof generateSampleTrades>) {
  const equity: number[] = [100000]
  const drawdown: number[] = [0]
  const timestamps: string[] = [trades[0]?.entry_time || new Date().toISOString()]
  
  let peak = 100000
  
  for (const trade of trades) {
    const newEquity = equity[equity.length - 1] + trade.profit
    equity.push(newEquity)
    
    if (newEquity > peak) peak = newEquity
    const dd = ((peak - newEquity) / peak) * 100
    drawdown.push(dd)
    timestamps.push(trade.exit_time)
  }
  
  return { equity, drawdown, timestamps, trade_pnl: trades.map(t => t.profit) }
}

// Generate sample metrics
export function generateSampleMetrics(trades: ReturnType<typeof generateSampleTrades>, strategy: SampleStrategy) {
  const winners = trades.filter(t => t.profit > 0)
  const losers = trades.filter(t => t.profit <= 0)
  
  const grossProfit = winners.reduce((sum, t) => sum + t.profit, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.profit, 0))
  const netProfit = grossProfit - grossLoss
  
  const avgWinner = grossProfit / (winners.length || 1)
  const avgLoser = grossLoss / (losers.length || 1)
  
  return {
    basic: {
      total_trades: trades.length,
      winning_trades: winners.length,
      losing_trades: losers.length,
      win_rate: (winners.length / trades.length) * 100,
      gross_profit: grossProfit,
      gross_loss: grossLoss,
      net_profit: netProfit,
      profit_factor: grossProfit / (grossLoss || 1),
      max_drawdown: strategy.characteristics.expected_max_dd * 1000,
      max_drawdown_pct: strategy.characteristics.expected_max_dd,
      avg_winner: avgWinner,
      avg_loser: avgLoser,
      largest_winner: Math.max(...winners.map(t => t.profit)),
      largest_loser: Math.min(...losers.map(t => t.profit)),
      avg_trade: netProfit / trades.length,
      avg_bars_in_trade: 12,
    },
    risk_return: {
      sharpe_ratio: strategy.characteristics.expected_sharpe,
      sortino_ratio: strategy.characteristics.expected_sharpe * 1.3,
      calmar_ratio: (netProfit / (strategy.characteristics.expected_max_dd * 1000)) || 0,
      omega_ratio: 1.5 + Math.random() * 0.5,
      mar_ratio: 0.8 + Math.random() * 0.4,
      tail_ratio: 1.2 + Math.random() * 0.3,
      gain_to_pain_ratio: 1.3 + Math.random() * 0.4,
      common_sense_ratio: 2.1 + Math.random() * 0.5,
      cpc_ratio: 1.1 + Math.random() * 0.2,
      risk_of_ruin: 0.001 + Math.random() * 0.005,
    },
    expectancy: {
      expectancy: avgWinner * (winners.length / trades.length) - avgLoser * (losers.length / trades.length),
      expectancy_ratio: avgWinner / avgLoser,
      payoff_ratio: avgWinner / avgLoser,
      edge_ratio: ((winners.length / trades.length) * avgWinner) / ((losers.length / trades.length) * avgLoser),
      kelly_pct: 0.15 + Math.random() * 0.1,
      half_kelly_pct: 0.075 + Math.random() * 0.05,
      optimal_f: 0.12 + Math.random() * 0.08,
    },
  }
}

// Sample session for demo mode
export function createSampleSession(strategyId: string = 'trend-following-es') {
  const strategy = sampleStrategies.find(s => s.id === strategyId) || sampleStrategies[0]
  const trades = generateSampleTrades(strategyId, 500)
  const equityCurve = generateSampleEquityCurve(trades)
  const metrics = generateSampleMetrics(trades, strategy)
  
  return {
    session: {
      session_id: `demo-${strategyId}`,
      kind: 'trades' as const,
      filename: `${strategy.name.replace(/\s+/g, '_')}_backtest.csv`,
      n_rows: trades.length,
      columns: ['entry_time', 'exit_time', 'symbol', 'side', 'quantity', 'entry_price', 'exit_price', 'profit'],
      created_at: new Date().toISOString(),
    },
    trades,
    equityCurve,
    metrics,
    strategy,
  }
}

// Check if in demo mode
export function isDemoMode(sessionId: string | null): boolean {
  return sessionId?.startsWith('demo-') ?? false
}
