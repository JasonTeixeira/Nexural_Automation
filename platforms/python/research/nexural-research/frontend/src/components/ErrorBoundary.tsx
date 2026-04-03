import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="panel text-center py-10">
          <div className="text-red-400 text-sm font-medium mb-2">Something went wrong</div>
          <div className="text-xs text-gray-500 max-w-md mx-auto mb-4">
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-secondary text-xs"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
