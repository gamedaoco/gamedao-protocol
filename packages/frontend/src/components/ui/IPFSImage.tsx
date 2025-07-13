'use client'

import { useState, useCallback } from 'react'
import { useIPFSImage } from '@/hooks/useIPFS'
import { cn } from '@/lib/utils'

interface IPFSImageProps {
  hash?: string
  alt: string
  className?: string
  fallbackUrl?: string
  width?: number
  height?: number
  priority?: boolean
  onLoad?: () => void
  onError?: (error: string) => void
}

export function IPFSImage({
  hash,
  alt,
  className,
  fallbackUrl = '/splash.png',
  width,
  height,
  priority = false,
  onLoad,
  onError
}: IPFSImageProps) {
  const [showFallback, setShowFallback] = useState(false)

  const {
    imageUrl,
    isLoading,
    error,
    imageError,
    hasError,
    retry
  } = useIPFSImage(hash, {
    fallbackUrl,
    preload: true,
    priority: priority ? 1 : 0
  })

  const handleImageLoad = useCallback(() => {
    setShowFallback(false)
    onLoad?.()
  }, [onLoad])

  const handleImageError = useCallback(() => {
    console.warn(`🖼️ IPFSImage failed to load: ${hash}`)
    setShowFallback(true)
    onError?.(error || 'Image failed to load')
  }, [hash, error, onError])

  const handleRetry = useCallback(() => {
    setShowFallback(false)
    retry()
  }, [retry])

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'bg-muted animate-pulse flex items-center justify-center',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  // Show error state with retry option
  if (hasError && showFallback) {
    return (
      <div
        className={cn(
          'bg-muted border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-muted-foreground text-xs text-center">
          Image failed to load
        </div>
        <button
          onClick={handleRetry}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Show the image (either IPFS or fallback)
  return (
    <img
      src={imageUrl || fallbackUrl}
      alt={alt}
      className={cn('object-cover', className)}
      width={width}
      height={height}
      onLoad={handleImageLoad}
      onError={handleImageError}
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}

// Specialized components for common use cases
export function IPFSAvatar({
  hash,
  alt,
  fallbackUrl,
  size = 'md',
  className,
  ...props
}: Omit<IPFSImageProps, 'className'> & {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  }

  return (
    <IPFSImage
      hash={hash}
      alt={alt}
      fallbackUrl={fallbackUrl}
      className={cn(
        'rounded-full object-cover',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export function IPFSBanner({
  hash,
  alt,
  fallbackUrl,
  className,
  ...props
}: IPFSImageProps) {
  return (
    <IPFSImage
      hash={hash}
      alt={alt}
      fallbackUrl={fallbackUrl}
      className={cn(
        'w-full aspect-video object-cover rounded-lg',
        className
      )}
      {...props}
    />
  )
}
