// Currency formatting
export function formatCurrency(value: number, decimals: number = 2): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

// Compact currency (e.g., $52.3K)
export function formatCurrencyCompact(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`
  }
  return `${sign}$${absValue.toFixed(0)}`
}

// Percentage formatting
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Number formatting with optional decimals
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Format ratio (e.g., Sharpe ratio)
export function formatRatio(value: number): string {
  return value.toFixed(2)
}

// Duration formatting (seconds to human readable)
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// Date formatting
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// DateTime formatting
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format time only
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format large numbers with abbreviations
export function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`
  }
  return `${sign}${absValue.toFixed(0)}`
}

// Get color class based on value (profit/loss)
export function getProfitLossColor(value: number): string {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-muted-foreground'
}

// Get background color class based on value
export function getProfitLossBg(value: number): string {
  if (value > 0) return 'bg-profit/10'
  if (value < 0) return 'bg-loss/10'
  return 'bg-muted'
}

// Format metric value based on type
export function formatMetricValue(
  value: number,
  type: 'currency' | 'percent' | 'ratio' | 'number' | 'duration' | 'integer'
): string {
  switch (type) {
    case 'currency':
      return formatCurrency(value)
    case 'percent':
      return formatPercent(value)
    case 'ratio':
      return formatRatio(value)
    case 'duration':
      return formatDuration(value)
    case 'integer':
      return Math.round(value).toLocaleString()
    case 'number':
    default:
      return formatNumber(value)
  }
}

// Decimal formatting (alias for formatNumber)
export function formatDecimal(value: number, decimals: number = 4): string {
  return formatNumber(value, decimals)
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
