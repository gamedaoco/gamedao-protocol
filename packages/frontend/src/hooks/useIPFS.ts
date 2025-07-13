'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFromIPFS, getIPFSUrl, uploadFileToIPFS, uploadJSONToIPFS, type IPFSUploadResult } from '@/lib/ipfs'

// Types
interface IPFSLoadState {
  data: any
  isLoading: boolean
  error: string | null
  retryCount: number
  lastAttempt: number
}

interface IPFSUploadState {
  isUploading: boolean
  progress: string
  error: string | null
  result: IPFSUploadResult | null
}

interface UseIPFSOptions {
  retryAttempts?: number
  retryDelay?: number
  cacheTimeout?: number
  autoRetry?: boolean
  enabled?: boolean
}

interface UseIPFSImageOptions extends UseIPFSOptions {
  fallbackUrl?: string
  preload?: boolean
}

// Cache for IPFS data
const ipfsCache = new Map<string, { data: any; timestamp: number; error?: string }>()
const loadingPromises = new Map<string, Promise<any>>()

// Default options
const DEFAULT_OPTIONS: Required<UseIPFSOptions> = {
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  autoRetry: true,
  enabled: true
}

/**
 * Main IPFS data fetching hook
 */
export function useIPFS(hashOrUrl: string | undefined, options: UseIPFSOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [state, setState] = useState<IPFSLoadState>({
    data: null,
    isLoading: false,
    error: null,
    retryCount: 0,
    lastAttempt: 0
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  const fetchData = useCallback(async (url: string, attempt: number = 0): Promise<any> => {
    const cacheKey = url.replace('ipfs://', '')

    // Check cache first
    const cached = ipfsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < opts.cacheTimeout) {
      if (cached.error) {
        throw new Error(cached.error)
      }
      return cached.data
    }

    // Check if already loading
    const existingPromise = loadingPromises.get(cacheKey)
    if (existingPromise) {
      return existingPromise
    }

    // Create new loading promise
    const loadingPromise = (async () => {
      try {
        console.log(`📤 Fetching IPFS data (attempt ${attempt + 1}):`, url)
        const data = await getFromIPFS(url)

        // Cache successful result
        ipfsCache.set(cacheKey, { data, timestamp: Date.now() })
        console.log('✅ IPFS data fetched successfully:', cacheKey)

        return data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch IPFS data'
        console.error(`❌ IPFS fetch failed (attempt ${attempt + 1}):`, errorMessage)

        // Cache error for a shorter time
        ipfsCache.set(cacheKey, {
          data: null,
          timestamp: Date.now(),
          error: errorMessage
        })

        throw error
      } finally {
        loadingPromises.delete(cacheKey)
      }
    })()

    loadingPromises.set(cacheKey, loadingPromise)
    return loadingPromise
  }, [opts.cacheTimeout])

  const loadData = useCallback(async (attempt: number = 0) => {
    if (!hashOrUrl || !opts.enabled) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: attempt,
      lastAttempt: Date.now()
    }))

    try {
      const data = await fetchData(hashOrUrl, attempt)
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch IPFS data'

      if (attempt < opts.retryAttempts && opts.autoRetry) {
        console.log(`🔄 Retrying IPFS fetch in ${opts.retryDelay}ms...`)
        retryTimeoutRef.current = setTimeout(() => {
          loadData(attempt + 1)
        }, opts.retryDelay * Math.pow(2, attempt)) // Exponential backoff
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }))
      }
    }
  }, [hashOrUrl, opts.enabled, opts.retryAttempts, opts.autoRetry, opts.retryDelay, fetchData])

  const retry = useCallback(() => {
    loadData(0)
  }, [loadData])

  const clearCache = useCallback(() => {
    if (hashOrUrl) {
      const cacheKey = hashOrUrl.replace('ipfs://', '')
      ipfsCache.delete(cacheKey)
      loadingPromises.delete(cacheKey)
    }
  }, [hashOrUrl])

  useEffect(() => {
    loadData(0)

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [loadData])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    lastAttempt: state.lastAttempt,
    retry,
    clearCache
  }
}

/**
 * Specialized hook for IPFS images with additional image-specific features
 */
export function useIPFSImage(hashOrUrl: string | undefined, options: UseIPFSImageOptions = {}) {
  const { fallbackUrl, preload, ...ipfsOptions } = options
  const [imageState, setImageState] = useState({
    isImageLoaded: false,
    imageError: false,
    naturalWidth: 0,
    naturalHeight: 0
  })

  const { data, isLoading, error, retry, clearCache } = useIPFS(hashOrUrl, ipfsOptions)

  // Convert IPFS URL to HTTP URL
  const imageUrl = hashOrUrl ? getIPFSUrl(hashOrUrl) : fallbackUrl

  // Preload image if requested
  useEffect(() => {
    if (imageUrl && (preload || !isLoading)) {
      const img = new Image()

      img.onload = () => {
        setImageState(prev => ({
          ...prev,
          isImageLoaded: true,
          imageError: false,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        }))
      }

      img.onerror = () => {
        setImageState(prev => ({
          ...prev,
          isImageLoaded: false,
          imageError: true
        }))
      }

      img.src = imageUrl
    }
  }, [imageUrl, preload, isLoading])

  return {
    // IPFS data
    data,
    isLoading,
    error,
    retry,
    clearCache,

    // Image-specific
    imageUrl: imageUrl || fallbackUrl,
    isImageLoaded: imageState.isImageLoaded,
    imageError: imageState.imageError,
    naturalWidth: imageState.naturalWidth,
    naturalHeight: imageState.naturalHeight,

    // Combined loading state
    isFullyLoaded: !isLoading && imageState.isImageLoaded,
    hasError: !!error || imageState.imageError
  }
}

/**
 * Hook for uploading files to IPFS
 */
export function useIPFSUpload() {
  const [uploadState, setUploadState] = useState<IPFSUploadState>({
    isUploading: false,
    progress: '',
    error: null,
    result: null
  })

  const uploadFile = useCallback(async (
    file: File,
    metadata?: { name?: string; description?: string }
  ): Promise<IPFSUploadResult> => {
    setUploadState({
      isUploading: true,
      progress: 'Preparing upload...',
      error: null,
      result: null
    })

    try {
      setUploadState(prev => ({ ...prev, progress: 'Uploading to IPFS...' }))

      const result = await uploadFileToIPFS(file, metadata)

      setUploadState({
        isUploading: false,
        progress: 'Upload complete',
        error: null,
        result
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({
        isUploading: false,
        progress: '',
        error: errorMessage,
        result: null
      })
      throw error
    }
  }, [])

  const uploadJSON = useCallback(async (
    data: any,
    metadata?: { name?: string; description?: string }
  ): Promise<IPFSUploadResult> => {
    setUploadState({
      isUploading: true,
      progress: 'Preparing JSON upload...',
      error: null,
      result: null
    })

    try {
      setUploadState(prev => ({ ...prev, progress: 'Uploading JSON to IPFS...' }))

      const result = await uploadJSONToIPFS(data, metadata)

      setUploadState({
        isUploading: false,
        progress: 'Upload complete',
        error: null,
        result
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'JSON upload failed'
      setUploadState({
        isUploading: false,
        progress: '',
        error: errorMessage,
        result: null
      })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: '',
      error: null,
      result: null
    })
  }, [])

  return {
    ...uploadState,
    uploadFile,
    uploadJSON,
    reset
  }
}

/**
 * Hook for multiple IPFS URLs with batch loading
 */
export function useIPFSBatch(urls: string[], options: UseIPFSOptions = {}) {
  const [results, setResults] = useState<Record<string, IPFSLoadState>>({})
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const loadBatch = useCallback(async () => {
    if (!urls.length || !opts.enabled) return

    // Initialize loading states
    const initialStates: Record<string, IPFSLoadState> = {}
    urls.forEach(url => {
      initialStates[url] = {
        data: null,
        isLoading: true,
        error: null,
        retryCount: 0,
        lastAttempt: Date.now()
      }
    })
    setResults(initialStates)

    // Load all URLs in parallel
    const promises = urls.map(async (url) => {
      try {
        const data = await getFromIPFS(url)
        setResults(prev => ({
          ...prev,
          [url]: {
            data,
            isLoading: false,
            error: null,
            retryCount: 0,
            lastAttempt: Date.now()
          }
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch'
        setResults(prev => ({
          ...prev,
          [url]: {
            data: null,
            isLoading: false,
            error: errorMessage,
            retryCount: 0,
            lastAttempt: Date.now()
          }
        }))
      }
    })

    await Promise.allSettled(promises)
  }, [urls, opts.enabled])

  useEffect(() => {
    loadBatch()
  }, [loadBatch])

  const isLoading = Object.values(results).some(result => result.isLoading)
  const hasErrors = Object.values(results).some(result => result.error)
  const allLoaded = urls.length > 0 && Object.keys(results).length === urls.length && !isLoading

  return {
    results,
    isLoading,
    hasErrors,
    allLoaded,
    retry: loadBatch
  }
}

/**
 * Utility function to clear all IPFS cache
 */
export function clearIPFSCache() {
  ipfsCache.clear()
  loadingPromises.clear()
}

/**
 * Utility function to get cache stats
 */
export function getIPFSCacheStats() {
  return {
    size: ipfsCache.size,
    activeLoads: loadingPromises.size,
    entries: Array.from(ipfsCache.entries()).map(([key, value]) => ({
      key,
      hasData: !!value.data,
      hasError: !!value.error,
      age: Date.now() - value.timestamp
    }))
  }
}
