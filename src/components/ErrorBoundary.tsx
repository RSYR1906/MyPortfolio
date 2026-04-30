"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Custom fallback UI. If omitted a default error card is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <p className="text-sm font-semibold text-gray-300">
            Something went wrong
          </p>
          <p className="text-xs text-gray-500 max-w-xs">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
