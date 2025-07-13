'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getFromIPFS, uploadFileToIPFS, uploadJSONToIPFS } from '@/lib/ipfs'
import { useIPFSLogger } from './useLogger'

// Define the upload result type locally since it's not exported
interface IPFSUploadResult {
  hash: string
  url: string
}

// Global request queue manager
class IPFSRequestQueue {
  private queue: Array<{
    id: string
    request: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: any) => void
    priority: number
  }> = []

  private activeRequests = new Set<string>()
  private maxConcurrentRequests = 3 // Limit concurrent requests
  private minRequestInterval = 100 // Minimum time between requests (ms)
  private lastRequestTime = 0
  private requestId = 0
  private isProcessing = false

  // Rate limiting tracking
  private rateLimitResetTime = 0
  private rateLimitCount = 0
  private maxRequestsPerMinute = 30 // Conservative limit

  private generateId(): string {
    return `ipfs-request-${++this.requestId}-${Date.now()}`
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      // Check rate limiting
      const now = Date.now()
      if (now < this.rateLimitResetTime) {
        // Wait until rate limit resets
        await new Promise(resolve => setTimeout(resolve, this.rateLimitResetTime - now))
        continue
      }

      // Reset rate limit counter if minute has passed
      if (now - this.lastRequestTime > 60000) {
        this.rateLimitCount = 0
      }

      // Check if we've hit the rate limit
      if (this.rateLimitCount >= this.maxRequestsPerMinute) {
        this.rateLimitResetTime = now + 60000 // Wait 1 minute
        continue
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest))
      }

      // Sort queue by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority)

      const item = this.queue.shift()
      if (!item) continue

      this.activeRequests.add(item.id)
      this.lastRequestTime = Date.now()
      this.rateLimitCount++

      // Execute request
      item.request()
        .then((result) => {
          item.resolve(result)
        })
        .catch((error) => {
          // Handle rate limiting
          if (error.status === 429 || error.message?.includes('rate limit')) {
            console.warn('IPFS rate limit detected, backing off...')
            this.rateLimitResetTime = Date.now() + 60000 // Back off for 1 minute
            // Re-queue the request with higher priority
            this.queue.unshift({ ...item, priority: item.priority + 1 })
          } else {
            item.reject(error)
          }
        })
        .finally(() => {
          this.activeRequests.delete(item.id)
          // Continue processing after a short delay
          setTimeout(() => this.processQueue(), 50)
        })
    }

    this.isProcessing = false
  }

  public async enqueue<T>(
    request: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.generateId()

      this.queue.push({
        id,
        request,
        resolve,
        reject,
        priority
      })

      // Start processing if not already running
      this.processQueue()
    })
  }

  public getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests.size,
      rateLimitCount: this.rateLimitCount,
      rateLimitResetTime: this.rateLimitResetTime,
      isRateLimited: Date.now() < this.rateLimitResetTime
    }
  }

  public clearQueue() {
    this.queue = []
    this.activeRequests.clear()
  }
}

// Global queue instance
const ipfsQueue = new IPFSRequestQueue()

// Cache for IPFS data with TTL
const ipfsCache = new Map<string, {
  data: any
  timestamp: number
  ttl: number
}>()

// Pending requests to avoid duplicate requests
const pendingRequests = new Map<string, Promise<any>>()

export interface UseIPFSOptions {
  enabled?: boolean
  retryAttempts?: number
  retryDelay?: number
  autoRetry?: boolean
  cacheTTL?: number
  priority?: number
}

export interface UseIPFSResult<T = any> {
  data: T | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

/**
 * Enhanced IPFS hook with request queue and rate limiting
 */
export function useIPFS<T = any>(
  hash?: string,
  options: UseIPFSOptions = {}
): UseIPFSResult<T> {
  const {
    enabled = true,
    retryAttempts = 3,
    retryDelay = 1000,
    autoRetry = true,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    priority = 0
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { logDownload, logCacheHit, logCacheMiss, logRateLimit } = useIPFSLogger('useIPFS')

  const fetchData = useCallback(async (): Promise<void> => {
    if (!hash || !enabled) return

    const cacheKey = hash

         // Check cache first
     const cached = ipfsCache.get(cacheKey)
     if (cached && Date.now() - cached.timestamp < cached.ttl) {
       logCacheHit(hash)
       setData(cached.data)
       setIsLoading(false)
       setError(null)
       return
     }

     logCacheMiss(hash)

    // Check if request is already pending
    const existingRequest = pendingRequests.get(cacheKey)
    if (existingRequest) {
      try {
        const result = await existingRequest
        setData(result)
        setIsLoading(false)
        setError(null)
        return
      } catch (err) {
        // Continue with new request if existing one failed
      }
    }

    setIsLoading(true)
    setError(null)

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

         const requestPromise = ipfsQueue.enqueue(
       async () => {
         const result = await getFromIPFS(hash)
         return result
       },
       priority
     )

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise)

         try {
       const startTime = Date.now()
       const result = await requestPromise
       const duration = Date.now() - startTime

       // Cache the result
       ipfsCache.set(cacheKey, {
         data: result,
         timestamp: Date.now(),
         ttl: cacheTTL
       })

       logDownload(hash, true, duration)
       setData(result)
       setError(null)
       setRetryCount(0)
     } catch (err: any) {
      if (err.name === 'AbortError') {
        return // Request was cancelled
      }

             const errorMessage = err.message || 'Failed to fetch from IPFS'

       // Check for rate limiting
       if (err.status === 429 || errorMessage.includes('rate limit')) {
         logRateLimit(hash)
       }

       logDownload(hash, false, Date.now() - (Date.now() - 1000), err)
       setError(errorMessage)
       setData(null)

       // Auto retry logic
       if (autoRetry && retryCount < retryAttempts) {
         setRetryCount(prev => prev + 1)

         // Exponential backoff with jitter
         const delay = retryDelay * Math.pow(2, retryCount) + Math.random() * 1000

         timeoutRef.current = setTimeout(() => {
           fetchData()
         }, delay)
       }
    } finally {
      setIsLoading(false)
      pendingRequests.delete(cacheKey)
    }
  }, [hash, enabled, retryAttempts, retryDelay, autoRetry, cacheTTL, priority, retryCount])

  const retry = useCallback(() => {
    setRetryCount(0)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    retry
  }
}

export interface UseIPFSImageOptions extends UseIPFSOptions {
  fallbackUrl?: string
  preload?: boolean
}

export interface UseIPFSImageResult {
  imageUrl: string | null
  isLoading: boolean
  error: string | null
  isImageLoaded: boolean
  imageError: boolean
  isFullyLoaded: boolean
  hasError: boolean
  retry: () => void
  naturalWidth: number
  naturalHeight: number
}

/**
 * Enhanced IPFS image hook with preloading and queue management
 */
export function useIPFSImage(
  hash?: string,
  options: UseIPFSImageOptions = {}
): UseIPFSImageResult {
  const { fallbackUrl, preload = false, ...ipfsOptions } = options

  const [imageState, setImageState] = useState({
    isImageLoaded: false,
    imageError: false,
    naturalWidth: 0,
    naturalHeight: 0
  })

  const { data: imageUrl, isLoading, error, retry } = useIPFS<string>(
    hash,
    { ...ipfsOptions, priority: 1 } // Higher priority for images
  )

  const finalImageUrl = useMemo(() => {
    if (imageUrl) return imageUrl
    if (fallbackUrl) return fallbackUrl
    return null
  }, [imageUrl, fallbackUrl])

  // Preload image when URL is available
  useEffect(() => {
    if (!finalImageUrl || !preload) return

    const img = new Image()

    const handleLoad = () => {
      setImageState(prev => ({
        ...prev,
        isImageLoaded: true,
        imageError: false,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }))
    }

    const handleError = () => {
      setImageState(prev => ({
        ...prev,
        isImageLoaded: false,
        imageError: true
      }))
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    img.src = finalImageUrl

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [finalImageUrl, preload])

  const isFullyLoaded = !isLoading && imageState.isImageLoaded && !imageState.imageError
  const hasError = !!error || imageState.imageError

  return {
    imageUrl: finalImageUrl,
    isLoading,
    error,
    isImageLoaded: imageState.isImageLoaded,
    imageError: imageState.imageError,
    isFullyLoaded,
    hasError,
    retry,
    naturalWidth: imageState.naturalWidth,
    naturalHeight: imageState.naturalHeight
  }
}

export interface UseIPFSUploadOptions {
  onProgress?: (progress: number) => void
  priority?: number
}

export interface UseIPFSUploadResult {
  uploadFile: (file: File) => Promise<string>
  uploadJSON: (data: any) => Promise<string>
  isUploading: boolean
  progress: number
  error: string | null
  reset: () => void
}

/**
 * Enhanced IPFS upload hook with queue management
 */
export function useIPFSUpload(options: UseIPFSUploadOptions = {}): UseIPFSUploadResult {
  const { onProgress, priority = 2 } = options // Higher priority for uploads

  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true)
    setError(null)
    setProgress(0)

    try {
             const result = await ipfsQueue.enqueue(
         async () => {
           return await uploadFileToIPFS(file)
         },
         priority
       )

       setProgress(100)
       return result.hash
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload to IPFS'
      setError(errorMessage)
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [onProgress, priority])

  const uploadJSON = useCallback(async (data: any): Promise<string> => {
    setIsUploading(true)
    setError(null)
    setProgress(0)

    try {
             const result = await ipfsQueue.enqueue(
         async () => {
           return await uploadJSONToIPFS(data)
         },
         priority
       )

       setProgress(100)
       return result.hash
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload JSON to IPFS'
      setError(errorMessage)
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [onProgress, priority])

  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  return {
    uploadFile,
    uploadJSON,
    isUploading,
    progress,
    error,
    reset
  }
}

export interface UseIPFSBatchOptions extends UseIPFSOptions {
  batchSize?: number
}

export interface UseIPFSBatchResult {
  results: Record<string, UseIPFSResult>
  isLoading: boolean
  hasErrors: boolean
  retry: () => void
}

/**
 * Enhanced batch IPFS hook with intelligent batching and queue management
 */
export function useIPFSBatch(
  hashes: string[],
  options: UseIPFSBatchOptions = {}
): UseIPFSBatchResult {
  const { batchSize = 5, ...ipfsOptions } = options

  const [results, setResults] = useState<Record<string, UseIPFSResult>>({})
  const [isLoading, setIsLoading] = useState(false)

  const processHashes = useCallback(async () => {
    if (hashes.length === 0) return

    setIsLoading(true)
    const newResults: Record<string, UseIPFSResult> = {}

    // Process hashes in batches to avoid overwhelming the queue
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize)

      const batchPromises = batch.map(async (hash) => {
        const cacheKey = hash

        // Check cache first
        const cached = ipfsCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return { hash, data: cached.data, error: null }
        }

        try {
                     const data = await ipfsQueue.enqueue(
             () => getFromIPFS(hash),
             ipfsOptions.priority || 0
           )

          // Cache the result
          ipfsCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl: ipfsOptions.cacheTTL || 5 * 60 * 1000
          })

          return { hash, data, error: null }
        } catch (err: any) {
          return { hash, data: null, error: err.message || 'Failed to fetch' }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)

      batchResults.forEach((result, index) => {
        const hash = batch[index]
        if (result.status === 'fulfilled') {
          const { data, error } = result.value
          newResults[hash] = {
            data,
            isLoading: false,
            error,
            retry: () => processHashes()
          }
        } else {
          newResults[hash] = {
            data: null,
            isLoading: false,
            error: result.reason?.message || 'Failed to fetch',
            retry: () => processHashes()
          }
        }
      })

      // Small delay between batches to avoid overwhelming the queue
      if (i + batchSize < hashes.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    setResults(newResults)
    setIsLoading(false)
  }, [hashes, batchSize, ipfsOptions])

  const retry = useCallback(() => {
    processHashes()
  }, [processHashes])

  useEffect(() => {
    processHashes()
  }, [processHashes])

  const hasErrors = useMemo(() => {
    return Object.values(results).some(result => result.error !== null)
  }, [results])

  return {
    results,
    isLoading,
    hasErrors,
    retry
  }
}

// Utility functions for cache management
export function clearIPFSCache(): void {
  ipfsCache.clear()
  pendingRequests.clear()
}

export function getIPFSCacheStats() {
  return {
    cacheSize: ipfsCache.size,
    pendingRequests: pendingRequests.size,
    queueStats: ipfsQueue.getStats()
  }
}

export function getIPFSQueueStats() {
  return ipfsQueue.getStats()
}
