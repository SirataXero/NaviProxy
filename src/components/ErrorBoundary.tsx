import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-8 font-sans">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            <h1 className="text-3xl font-bold text-red-500 flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Application Crash
            </h1>
            
            <p className="text-zinc-400 text-lg">
              The React application encountered an unexpected error during rendering or data fetching.
            </p>

            <div className="bg-zinc-900 border border-red-900/50 rounded-xl overflow-hidden">
              <div className="bg-red-900/20 px-4 py-2 border-b border-red-900/50">
                <h2 className="font-mono text-sm text-red-400">Error Message</h2>
              </div>
              <div className="p-4 overflow-auto max-h-32">
                <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap">
                  {this.state.error && this.state.error.toString()}
                </pre>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800">
                <h2 className="font-mono text-sm text-zinc-400">Component Stack Trace</h2>
              </div>
              <div className="p-4 overflow-auto max-h-96">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
