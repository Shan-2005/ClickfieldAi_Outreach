import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-2xl bg-[var(--surface)] border border-red-500/30 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Something went wrong</h3>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 font-mono break-all max-h-24 overflow-y-auto bg-[var(--surface-subtle)] p-2 rounded-lg">
            {this.state.error?.message || 'Unexpected application error'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
