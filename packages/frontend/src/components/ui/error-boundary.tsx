'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  showDetails?: boolean
  className?: string
}

// Contract error messages mapping
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  'execution reverted': 'Transaction failed. Please check your inputs and try again.',
  'insufficient funds': 'Insufficient funds to complete this transaction.',
  'user rejected': 'Transaction was cancelled by user.',
  'network error': 'Network connection issue. Please check your connection.',
  'timeout': 'Transaction timed out. Please try again.',
  'nonce too low': 'Transaction nonce error. Please refresh and try again.',
  'gas limit': 'Transaction requires more gas than available.',
  'contract not found': 'Smart contract not found. Please check the network.',
  'method not found': 'Contract method not available.',
  'unauthorized': 'You are not authorized to perform this action.'
}

// Get user-friendly error message
function getUserFriendlyMessage(error: Error): string {
  const message = error.message.toLowerCase()

  for (const [key, friendlyMessage] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return friendlyMessage
    }
  }

  // Default message for unknown errors
  return 'An unexpected error occurred. Please try again or contact support if the issue persists.'
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  retryCount: number
  maxRetries: number
  showDetails: boolean
  className?: string
}

function ErrorFallback({
  error,
  resetError,
  retryCount,
  maxRetries,
  showDetails,
  className
}: ErrorFallbackProps) {
  const userMessage = getUserFriendlyMessage(error)
  const canRetry = retryCount < maxRetries

  const handleReportError = () => {
    // In a real app, this would send error to logging service
    console.error('Error reported by user:', error)

    // Could integrate with services like Sentry, LogRocket, etc.
    if (typeof window !== 'undefined') {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }

      // Example: Send to error reporting service
      // errorReportingService.report(errorReport)
      console.log('Error report:', errorReport)
    }
  }

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-destructive">Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground">
          {userMessage}
        </p>

        {showDetails && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono">
              <div className="text-destructive font-semibold">{error.name}</div>
              <div className="text-muted-foreground break-all">{error.message}</div>
              {error.stack && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="font-semibold">Stack Trace:</div>
                  <pre className="whitespace-pre-wrap break-all">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {canRetry && (
            <Button
              onClick={resetError}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
              {retryCount > 0 && (
                <span className="text-xs opacity-75">({retryCount}/{maxRetries})</span>
              )}
            </Button>
          )}

          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>

          <Button
            onClick={handleReportError}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Bug className="h-4 w-4" />
            Report Issue
          </Button>
        </div>

        {!canRetry && retryCount >= maxRetries && (
          <p className="text-sm text-muted-foreground">
            Maximum retry attempts reached. Please refresh the page or contact support.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Main ErrorBoundary class component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  resetError = () => {
    const { maxRetries = 3 } = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount <= maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newRetryCount
      })

      // Add a small delay before retry to prevent immediate re-error
      this.retryTimeoutId = setTimeout(() => {
        // Force a re-render of children
        this.forceUpdate()
      }, 100)
    }
  }

  render() {
    const { children, fallback, maxRetries = 3, showDetails = false, className } = this.props
    const { hasError, error, retryCount } = this.state

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use default error fallback
      return (
        <ErrorFallback
          error={error}
          resetError={this.resetError}
          retryCount={retryCount}
          maxRetries={maxRetries}
          showDetails={showDetails}
          className={className}
        />
      )
    }

    return children
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // In a real app, this would integrate with error reporting
    console.error('Error caught by useErrorHandler:', error, errorInfo)

    // Could throw to trigger parent ErrorBoundary
    throw error
  }
}

// Simple error state component for inline errors
interface ErrorStateProps {
  error: Error | string
  retry?: () => void
  className?: string
  variant?: 'default' | 'minimal' | 'inline'
}

export function ErrorState({ error, retry, className, variant = 'default' }: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : getUserFriendlyMessage(error)

  if (variant === 'minimal') {
    return (
      <div className={cn('text-center py-4', className)}>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        {retry && (
          <Button onClick={retry} variant="ghost" size="sm" className="mt-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{errorMessage}</span>
        {retry && (
          <Button onClick={retry} variant="ghost" size="sm">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardContent className="flex items-center gap-3 py-4">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-foreground">{errorMessage}</p>
        </div>
        {retry && (
          <Button onClick={retry} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Export types
export type { ErrorBoundaryProps, ErrorStateProps }
