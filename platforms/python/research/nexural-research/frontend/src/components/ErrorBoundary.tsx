import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; errorCount: number; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorCount: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error("[ErrorBoundary] Caught error:", error.message);
    if (errorInfo.componentStack) {
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState((prev) => ({
      error: null,
      errorCount: prev.errorCount + 1,
    }));
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const tooManyRetries = this.state.errorCount >= 3;

      return (
        <div className="panel text-center py-10" role="alert">
          <div className="text-red-400 text-sm font-medium mb-2">Something went wrong</div>
          <div className="text-xs text-gray-500 max-w-md mx-auto mb-4">
            {this.state.error.message}
          </div>
          {tooManyRetries ? (
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-xs"
            >
              Reload Page
            </button>
          ) : (
            <button
              onClick={this.handleRetry}
              className="btn-secondary text-xs"
            >
              Try Again ({3 - this.state.errorCount} attempts left)
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
