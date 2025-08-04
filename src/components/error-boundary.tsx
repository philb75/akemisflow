'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import logger from '@/lib/logger-adaptive'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  errorId: string
  onRetry: () => void
  onReset: () => void
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorId, 
  onRetry, 
  onReset 
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-gray-600 mb-4">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>

            {isDevelopment && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-left">
                <p className="text-xs font-medium text-red-800 mb-1">
                  Error ID: {errorId}
                </p>
                <p className="text-xs text-red-700 font-mono">
                  {error.message}
                </p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              <button
                onClick={onRetry}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>

              <button
                onClick={onReset}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Error ID: {errorId}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error boundary class component
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = Math.random().toString(36).substring(2, 15)
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || 'unknown'
    
    // Log error to our logging system
    logger.error('React Error Boundary caught an error', {
      category: 'REACT',
      error,
      metadata: {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name
      }
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      errorInfo
    })
  }

  handleRetry = () => {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId)
    }

    // Reset error state after a short delay to allow for any cleanup
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined
      })
    }, 100)
  }

  handleReset = () => {
    // Navigate to dashboard/home page
    window.location.href = '/dashboard'
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId || 'unknown'}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    const errorId = Math.random().toString(36).substring(2, 15)
    
    logger.error('Manual error reported', {
      category: 'REACT',
      error,
      metadata: { errorId, source: 'useErrorHandler' }
    })

    setError(error)
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  // Throw error to trigger error boundary
  if (error) {
    throw error
  }

  return { handleError, resetError }
}

export default ErrorBoundary
export type { ErrorBoundaryProps, ErrorFallbackProps }