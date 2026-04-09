'use client'

import * as React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[v0] ErrorBoundary caught error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            An unexpected error occurred while rendering this component. 
            Try refreshing or contact support if the issue persists.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="w-full max-w-lg mb-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Error Details
              </summary>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                <pre className="text-xs font-mono text-destructive overflow-auto">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-muted-foreground mt-2 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  if (error) {
    throw error
  }

  return React.useCallback((error: Error) => {
    setError(error)
  }, [])
}

// Panel-level error boundary with minimal UI
export function PanelErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4 text-center bg-destructive/5 rounded-lg border border-destructive/20">
          <Bug className="h-6 w-6 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load this component</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 text-xs"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Chart-specific error boundary
export function ChartErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-[300px] bg-muted/20 rounded-lg border border-dashed border-border">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Chart failed to render</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try refreshing the page</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
