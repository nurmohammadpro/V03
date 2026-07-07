import React, { ReactNode, ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorCount: number
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Increment error count
    this.setState((prevState) => ({
      errorCount: prevState.errorCount + 1,
    }))

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary] Caught error:", error)
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack)
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === "production" && this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error details for debugging
    console.error("[ErrorBoundary]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry)
      }

      const isDevelopment = process.env.NODE_ENV === "development"

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-foreground/70 mb-4">
                We&apos;re sorry, but something unexpected happened. Please try again.
              </p>

              {isDevelopment && (
                <details className="mb-4 text-sm bg-background/50 rounded p-3">
                  <summary className="cursor-pointer text-foreground/60 hover:text-foreground font-semibold">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto text-destructive whitespace-pre-wrap break-words">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}

              <div className="space-y-2">
                <button
                  onClick={this.retry}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 font-medium transition"
                >
                  Go Home
                </button>
              </div>

              {isDevelopment && (
                <p className="text-xs text-foreground/50 mt-4">
                  Error count: {this.state.errorCount}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for catching errors in async functions
 */
export function useAsyncError() {
  const [, setError] = React.useState()

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error
      })
    },
    [setError],
  )
}

/**
 * Wrapper for error handling in async operations
 */
export function withErrorBoundary<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: (error: Error) => void,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error("[withErrorBoundary]", error)
      if (onError && error instanceof Error) {
        onError(error)
      }
      throw error
    }
  }) as T
}
