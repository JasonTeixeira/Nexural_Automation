// Extended types for institutional features

// Factor Attribution (Fama-French)
export interface FactorExposure {
  factor: string
  beta: number
  t_stat: number
  p_value: number
  contribution_pct: number
  significant: boolean
}

export interface FactorAttributionResult {
  alpha: number
  alpha_annualized: number
  alpha_t_stat: number
  alpha_p_value: number
  r_squared: number
  adjusted_r_squared: number
  factors: FactorExposure[]
  residual_volatility: number
  tracking_error: number
  information_ratio: number
  interpretation: string
  model_type: 'FF3' | 'FF5' | 'CAPM' | 'Custom'
}

// Rolling Factor Analysis
export interface RollingFactorResult {
  timestamps: string[]
  rolling_alpha: number[]
  rolling_beta_market: number[]
  rolling_beta_smb: number[]
  rolling_beta_hml: number[]
  rolling_r_squared: number[]
  window_size: number
}

// Style Analysis
export interface StyleWeight {
  asset_class: string
  weight: number
  confidence: number
}

export interface StyleAnalysisResult {
  effective_style: StyleWeight[]
  style_drift: number
  style_consistency: number
  interpretation: string
}

// Custom Scenario Builder
export interface CustomScenario {
  id: string
  name: string
  description: string
  parameters: ScenarioParameter[]
  created_at: string
}

export interface ScenarioParameter {
  id: string
  label: string
  type: 'multiplier' | 'percentage' | 'absolute' | 'range'
  target: 'returns' | 'drawdown' | 'volatility' | 'correlation' | 'tail_risk'
  value: number
  min?: number
  max?: number
}

export interface ScenarioResult {
  scenario_id: string
  original_metrics: {
    net_profit: number
    max_drawdown: number
    sharpe: number
    win_rate: number
    profit_factor: number
  }
  stressed_metrics: {
    net_profit: number
    max_drawdown: number
    sharpe: number
    win_rate: number
    profit_factor: number
  }
  deltas: {
    net_profit_change_pct: number
    drawdown_change_pct: number
    sharpe_change_pct: number
    win_rate_change_pct: number
    profit_factor_change_pct: number
  }
  still_profitable: boolean
  risk_rating: 'low' | 'medium' | 'high' | 'critical'
  interpretation: string
}

// Linked Chart State
export interface ChartBrushState {
  startIndex: number | null
  endIndex: number | null
  startDate: string | null
  endDate: string | null
}

// Sample Data
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

// Onboarding
export interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

// Accessibility Announcements
export type AnnouncementPriority = 'polite' | 'assertive'

export interface AccessibilityState {
  announcements: string[]
  focusTarget: string | null
  reducedMotion: boolean
  highContrast: boolean
}
