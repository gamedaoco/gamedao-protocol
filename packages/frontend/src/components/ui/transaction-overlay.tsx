'use client'

import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransactionOverlayProps {
  isVisible: boolean
  title: string
  description?: string
  progress?: string
  currentStep?: 'idle' | 'uploading' | 'approving' | 'creating' | 'confirming' | 'success' | 'error'
  error?: string | null
  onRetry?: () => void
  onClose?: () => void
  showProgressBar?: boolean
  successMessage?: string
  successAction?: {
    label: string
    onClick: () => void
  }
}

export function TransactionOverlay({
  isVisible,
  title,
  description,
  progress,
  currentStep = 'idle',
  error,
  onRetry,
  onClose,
  showProgressBar = true,
  successMessage,
  successAction
}: TransactionOverlayProps) {
  if (!isVisible) return null

  const getProgressPercentage = () => {
    if (!showProgressBar) return 0

    switch (currentStep) {
      case 'uploading': return 25
      case 'approving': return 50
      case 'creating': return 75
      case 'confirming': return 90
      case 'success': return 100
      case 'error': return 0
      default: return 10
    }
  }

  const getStepMessage = () => {
    if (progress) return progress

    switch (currentStep) {
      case 'uploading': return 'Uploading metadata...'
      case 'approving': return 'Requesting token approval...'
      case 'creating': return 'Creating transaction...'
      case 'confirming': return 'Waiting for confirmation...'
      case 'success': return successMessage || 'Transaction completed successfully!'
      case 'error': return error || 'Transaction failed'
      default: return 'Preparing transaction...'
    }
  }

  const getIcon = () => {
    if (currentStep === 'success') {
      return (
        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
      )
    }

    if (currentStep === 'error') {
      return (
        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="h-6 w-6 text-red-600" />
        </div>
      )
    }

    return <Loader2 className="h-12 w-12 animate-spin text-primary" />
  }

  const getProgressBarColor = () => {
    switch (currentStep) {
      case 'success': return 'bg-green-600'
      case 'error': return 'bg-red-600'
      default: return 'bg-primary'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mb-6">
            {getIcon()}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {currentStep === 'success' ? 'Success!' : currentStep === 'error' ? 'Error' : title}
          </h3>

          <p className="text-muted-foreground mb-6">
            {currentStep === 'success' ? (successMessage || 'Transaction completed successfully!') :
             currentStep === 'error' ? (error || 'Transaction failed') :
             description || getStepMessage()}
          </p>

          {/* Progress bar */}
          {showProgressBar && currentStep !== 'success' && currentStep !== 'error' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}

          {/* Progress text */}
          {currentStep !== 'success' && currentStep !== 'error' && (
            <p className="text-sm text-muted-foreground mb-4">
              {getStepMessage()}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            {currentStep === 'error' && onRetry && (
              <Button onClick={onRetry} variant="outline">
                Try Again
              </Button>
            )}

            {currentStep === 'success' && successAction && (
              <Button onClick={successAction.onClick}>
                {successAction.label}
              </Button>
            )}

            {(currentStep === 'error' || currentStep === 'success') && onClose && (
              <Button onClick={onClose} variant={currentStep === 'success' ? 'outline' : 'default'}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
