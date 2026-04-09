// Session types
export interface Session {
  session_id: string
  kind: 'trades' | 'executions' | 'optimization'
  filename: string
  n_rows: number
  columns: string[]
  created_at: string
}

export interface UploadResponse {
  session_id: string
  kind: 'trades' | 'executions' | 'optimization'
  filename: string
  n_rows: number
  columns: string[]
  preview: Record<string, unknown>[]
}

// Basic metrics
export interface BasicMetrics {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  gross_profit: number
  gross_loss: number
  net_profit: number
  profit_factor: number
  max_drawdown: number
  max_drawdown_pct: number
  avg_winner: number
  avg_loser: number
  largest_winner: number
  largest_loser: number
  avg_trade: number
  avg_bars_in_trade: number
}

// Risk return metrics
export interface RiskReturnMetrics {
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  omega_ratio: number
  mar_ratio: number
  tail_ratio: number
  gain_to_pain_ratio: number
  common_sense_ratio: number
  cpc_ratio: number
  risk_of_ruin: number
}

// Expectancy metrics
export interface ExpectancyMetrics {
  expectancy: number
  expectancy_ratio: number
  payoff_ratio: number
  edge_ratio: number
  kelly_pct: number
  half_kelly_pct: number
  optimal_f: number
}

// Dependency metrics
export interface DependencyMetrics {
  z_score: number
  z_interpretation: string
  serial_correlation: number
  serial_p_value: number
  streak_max_wins: number
  streak_max_losses: number
  streak_avg_wins: number
  streak_avg_losses: number
}

// Distribution metrics
export interface DistributionMetrics {
  mean: number
  median: number
  std: number
  skewness: number
  kurtosis: number
  jarque_bera_stat: number
  jarque_bera_p: number
  is_normal: boolean
  percentile_01: number
  percentile_05: number
  percentile_10: number
  percentile_25: number
  percentile_75: number
  percentile_90: number
  percentile_95: number
  percentile_99: number
  var_95: number
  cvar_95: number
}

// Time decay metrics
export interface TimeDecayMetrics {
  n_windows: number
  window_size: number
  sharpe_slope: number
  sharpe_r_squared: number
  pnl_slope: number
  pnl_r_squared: number
  is_decaying: boolean
  decay_interpretation: string
}

// Institutional metrics
export interface InstitutionalMetrics {
  recovery_factor: number
  time_under_water_pct: number
  max_consecutive_wins: number
  max_consecutive_losses: number
  max_consecutive_loss_amount: number
  avg_trade_duration_seconds: number
  median_trade_duration_seconds: number
  profit_per_day: number
  trade_frequency_per_day: number
  max_drawdown_duration_trades: number
}

// Comprehensive metrics (all combined)
export interface ComprehensiveMetrics {
  risk_return: RiskReturnMetrics
  expectancy: ExpectancyMetrics
  dependency: DependencyMetrics
  distribution: DistributionMetrics
  time_decay: TimeDecayMetrics
  institutional: InstitutionalMetrics
}

// Improvements/Grade
export interface Improvement {
  category: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  current_value: string
  target_value: string
  impact: string
}

export interface ImprovementsResult {
  grade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'
  score: number
  breakdown: {
    profitability: number
    risk_management: number
    consistency: number
    edge_quality: number
  }
  improvements: Improvement[]
  summary: string
}

// Desk Analytics - Hurst
export interface HurstResult {
  hurst_exponent: number
  r_squared: number
  interpretation: string
  regime: 'mean_reverting' | 'random_walk' | 'trending'
  confidence: 'high' | 'medium' | 'low'
}

// Desk Analytics - ACF
export interface ACFResult {
  lags: number[]
  autocorrelations: number[]
  confidence_bound: number
  significant_lags: number[]
  has_significant_dependency: boolean
  interpretation: string
}

// Desk Analytics - Rolling Correlation
export interface RollingCorrelationResult {
  window_size: number
  n_windows: number
  timestamps: string[]
  rolling_autocorr: number[]
  rolling_mean_pnl: number[]
  rolling_volatility: number[]
  rolling_win_rate: number[]
  regime_changes_detected: number
  current_autocorr: number
  interpretation: string
}

// Desk Analytics - Information Ratio
export interface InformationRatioResult {
  information_ratio: number
  active_return: number
  tracking_error: number
  recent_window: number
  baseline_mean: number
  recent_mean: number
  is_outperforming: boolean
  interpretation: string
}

// Stress Testing - Tail Amplification
export interface TailScenario {
  label: string
  multiplier: number
  tail_pct: number
  adjusted_net: number
  adjusted_mdd: number
  net_change_pct: number
  mdd_change_pct: number
  still_profitable: boolean
}

export interface TailAmplificationResult {
  original_net: number
  original_mdd: number
  scenarios: TailScenario[]
  interpretation: string
}

// Stress Testing - Historical
export interface HistoricalStressWindow {
  start_index: number
  end_index: number
  start_time: string
  end_time: string
  n_trades: number
  total_pnl: number
  max_drawdown: number
  win_rate: number
}

export interface HistoricalStressResult {
  n_windows_analyzed: number
  worst_windows: HistoricalStressWindow[]
  worst_n_trade_loss: number
  worst_single_day_loss: number
  worst_single_trade: number
  interpretation: string
}

// Stress Testing - Parameter Sensitivity
export interface SensitivityPoint {
  stop_multiplier: number
  size_multiplier: number
  net_profit: number
  max_drawdown: number
  profit_factor: number
  win_rate: number
  sharpe_proxy: number
}

export interface ParameterSensitivityResult {
  n_points: number
  grid: SensitivityPoint[]
  baseline_net: number
  baseline_mdd: number
  robustness_score: number
  optimal_size_mult: number
  interpretation: string
}

// Monte Carlo
export interface MonteCarloResult {
  n_simulations: number
  final_equities: number[]
  percentiles: {
    p5: number
    p25: number
    p50: number
    p75: number
    p95: number
  }
  probability_of_profit: number
  expected_final_equity: number
  equity_paths?: number[][]
  timestamps?: string[]
}

// Walk Forward
export interface WalkForwardWindow {
  window_id: number
  is_start: number
  is_end: number
  oos_start: number
  oos_end: number
  is_profit: number
  oos_profit: number
  efficiency: number
}

export interface WalkForwardResult {
  n_windows: number
  windows: WalkForwardWindow[]
  aggregate_efficiency: number
  is_total_profit: number
  oos_total_profit: number
  interpretation: string
}

// Deflated Sharpe
export interface DeflatedSharpeResult {
  observed_sharpe: number
  expected_max_sharpe: number
  deflated_sharpe: number
  n_trials: number
  var_sharpe: number
  skew_returns: number
  kurt_returns: number
  survives_deflation: boolean
  interpretation: string
}

// Regime Analysis
export interface RegimePerformance {
  regime: string
  n_trades: number
  total_pnl: number
  avg_pnl: number
  win_rate: number
  sharpe: number
  max_drawdown: number
}

export interface RegimeResult {
  regimes: RegimePerformance[]
  current_regime: string
  interpretation: string
}

// Chart data
export interface EquityChartData {
  timestamps: string[]
  equity: number[]
  drawdown: number[]
  trade_pnl: number[]
}

export interface DistributionChartData {
  bins: number[]
  counts: number[]
  var_95: number
  cvar_95: number
}

export interface HeatmapChartData {
  days: string[]
  hours: number[]
  values: number[][]
  counts: number[][]
}

export interface RollingMetricsChartData {
  timestamps: string[]
  rolling_sharpe: number[]
  rolling_win_rate: number[]
  rolling_avg_pnl: number[]
}

// Trade log
export interface Trade {
  id: number
  entry_time: string
  exit_time: string
  symbol: string
  side: 'Long' | 'Short'
  quantity: number
  entry_price: number
  exit_price: number
  profit: number
  commission: number
  mae: number
  mfe: number
  duration_seconds: number
}

// Comparison
export interface ComparisonResult {
  session_a: {
    session_id: string
    filename: string
    metrics: BasicMetrics & RiskReturnMetrics
  }
  session_b: {
    session_id: string
    filename: string
    metrics: BasicMetrics & RiskReturnMetrics
  }
  deltas: Record<string, { value: number; pct_change: number; improved: boolean }>
}

// AI Analysis
export interface AIAnalysisRequest {
  session_id: string
  provider: 'claude' | 'gpt-4o' | 'perplexity'
  api_key: string
  prompt?: string
}

export interface AIAnalysisResponse {
  response: string
  tokens_used: number
  model: string
}

// API Error
export interface APIError {
  detail: string
  status_code: number
}

// Grade utilities
export type Grade = 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F'

export function getGradeColor(grade: Grade): string {
  if (grade.startsWith('A')) return 'var(--grade-a)'
  if (grade.startsWith('B')) return 'var(--grade-b)'
  if (grade.startsWith('C')) return 'var(--grade-c)'
  if (grade.startsWith('D')) return 'var(--grade-d)'
  return 'var(--grade-f)'
}

export function getGradeClass(grade: Grade): string {
  if (grade.startsWith('A')) return 'badge-grade-a'
  if (grade.startsWith('B')) return 'badge-grade-b'
  if (grade.startsWith('C')) return 'badge-grade-c'
  if (grade.startsWith('D')) return 'badge-grade-d'
  return 'badge-grade-f'
}
