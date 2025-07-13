'use client'

import { useState, forwardRef } from 'react'
import { useIPFSImage } from '@/hooks/useIPFS'
import { cn } from '@/lib/utils'
import { ImageIcon, RefreshCw, AlertCircle } from 'lucide-react'

interface IPFSImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  hash?: string
  fallbackUrl?: string
  showLoading?: boolean
  showError?: boolean
  retryButton?: boolean
  loadingClassName?: string
  errorClassName?: string
  aspectRatio?: 'square' | '16:9' | '4:3' | '3:2' | 'auto'
}

export const IPFSImage = forwardRef<HTMLImageElement, IPFSImageProps>(({
  hash,
  fallbackUrl,
  showLoading = true,
  showError = true,
  retryButton = true,
  loadingClassName,
  errorClassName,
  aspectRatio = 'auto',
  className,
  alt = '',
  ...props
}, ref) => {
  const [imageLoadError, setImageLoadError] = useState(false)

  const {
    imageUrl,
    isLoading,
    error,
    isImageLoaded,
    imageError,
    isFullyLoaded,
    hasError,
    retry,
    naturalWidth,
    naturalHeight
  } = useIPFSImage(hash, {
    fallbackUrl,
    preload: true,
    retryAttempts: 3,
    autoRetry: true
  })

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square': return 'aspect-square'
      case '16:9': return 'aspect-video'
      case '4:3': return 'aspect-[4/3]'
      case '3:2': return 'aspect-[3/2]'
      default: return ''
    }
  }

  const handleImageLoad = () => {
    setImageLoadError(false)
  }

  const handleImageError = () => {
    setImageLoadError(true)
  }

  const handleRetry = () => {
    setImageLoadError(false)
    retry()
  }

  // Show loading state
  if ((isLoading || !isImageLoaded) && showLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted border border-border rounded-md',
        getAspectRatioClass(),
        loadingClassName,
        className
      )}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading image...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if ((hasError || imageLoadError) && showError) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted border border-border rounded-md',
        getAspectRatioClass(),
        errorClassName,
        className
      )}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <span className="text-sm text-center">
            {error || 'Failed to load image'}
          </span>
          {retryButton && (
            <button
              onClick={handleRetry}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  // Show fallback when no image URL available
  if (!imageUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted border border-border rounded-md',
        getAspectRatioClass(),
        className
      )}>
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  // Show the actual image
  return (
    <img
      ref={ref}
      src={imageUrl}
      alt={alt}
      onLoad={handleImageLoad}
      onError={handleImageError}
      className={cn(
        'object-cover',
        getAspectRatioClass(),
        className
      )}
      {...props}
    />
  )
})

IPFSImage.displayName = 'IPFSImage'

// Specialized components for common use cases
export function IPFSAvatar({
  hash,
  fallbackUrl,
  size = 'md',
  className,
  ...props
}: IPFSImageProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  }

  return (
    <IPFSImage
      hash={hash}
      fallbackUrl={fallbackUrl}
      aspectRatio="square"
      className={cn(
        'rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export function IPFSBanner({
  hash,
  fallbackUrl,
  className,
  ...props
}: IPFSImageProps) {
  return (
    <IPFSImage
      hash={hash}
      fallbackUrl={fallbackUrl}
      aspectRatio="16:9"
      className={cn(
        'w-full rounded-lg',
        className
      )}
      {...props}
    />
  )
}

export function IPFSCard({
  hash,
  fallbackUrl,
  className,
  ...props
}: IPFSImageProps) {
  return (
    <IPFSImage
      hash={hash}
      fallbackUrl={fallbackUrl}
      aspectRatio="4:3"
      className={cn(
        'w-full rounded-lg',
        className
      )}
      {...props}
    />
  )
}
