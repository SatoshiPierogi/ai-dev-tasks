/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * Also handles graceful error reporting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to external service (Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
      this.reportError(error, errorInfo);
    }
  }

  /**
   * Report error to backend
   */
  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const errorReport = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };

      // Send to backend error logging endpoint
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await fetch(`${apiUrl}/errors/frontend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport),
      }).catch(() => {
        // Silently fail if reporting fails
      });
    } catch {
      // Ignore errors during error reporting
    }
  }

  /**
   * Reset error state
   */
  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

// ============================================================================
// ERROR FALLBACK UI
// ============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '1px solid #f5222d',
        borderRadius: '4px',
        backgroundColor: '#fff2f0',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h2 style={{ color: '#f5222d', marginTop: 0 }}>Something went wrong</h2>

      <p>
        We're sorry for the inconvenience. An unexpected error has occurred. Please try refreshing
        the page or contact support if the problem persists.
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <details style={{ marginTop: '20px', marginBottom: '20px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details (Dev Only)</summary>
          <pre
            style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '10px',
            }}
          >
            {error.name}: {error.message}
            {'\n'}
            {error.stack}
          </pre>
        </details>
      )}

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Try Again
        </button>

        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffffff',
            color: '#1890ff',
            border: '1px solid #1890ff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ASYNC ERROR BOUNDARY
// ============================================================================

/**
 * Hook to handle async errors in functional components
 * Throws error to nearest error boundary
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

/**
 * Hook wrapper for async functions to catch errors
 */
export function useAsyncError() {
  const setError = useErrorHandler();

  return React.useCallback((error: any) => {
    const appError = error instanceof Error ? error : new Error(String(error));
    setError(appError);
  }, [setError]);
}

// ============================================================================
// SAFE COMPONENT WRAPPER
// ============================================================================

/**
 * Wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return Wrapped;
}
