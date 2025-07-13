'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { Logger, LogLevel, LogCategory, createLogger, dev, performanceLogger, setUserContext } from '@/lib/logger'

export interface UseLoggerOptions {
  category?: LogCategory
  enableLifecycleLogging?: boolean
  enableStateChangeLogging?: boolean
  enablePerformanceLogging?: boolean
}

export interface LoggerHook {
  logger: Logger
  logStateChange: (stateName: string, oldValue: any, newValue: any) => void
  logUserAction: (action: string, data?: any) => void
  logError: (message: string, error?: Error | any, data?: any) => void
  logPerformance: (operation: string, duration: number, data?: any) => void
  startTimer: (label: string) => void
  endTimer: (label: string) => void
  group: (label: string) => void
  groupEnd: () => void
}

/**
 * React hook for component-specific logging
 */
export function useLogger(
  componentName: string,
  options: UseLoggerOptions = {}
): LoggerHook {
  const {
    category = 'ui',
    enableLifecycleLogging = process.env.NODE_ENV === 'development',
    enableStateChangeLogging = process.env.NODE_ENV === 'development',
    enablePerformanceLogging = true
  } = options

  // Create logger instance (memoized)
  const logger = useMemo(() => createLogger(componentName, category), [componentName, category])

  // Track component lifecycle
  const mountTimeRef = useRef<number>(Date.now())
  const renderCountRef = useRef<number>(0)

  // Component mount/unmount logging
  useEffect(() => {
    if (enableLifecycleLogging) {
      dev.lifecycle(componentName, 'mount', {
        timestamp: mountTimeRef.current
      })
    }

    if (enablePerformanceLogging) {
      performanceLogger.markStart(`${componentName}-mount`)
      performanceLogger.markEnd(`${componentName}-mount`)
    }

    return () => {
      if (enableLifecycleLogging) {
        dev.lifecycle(componentName, 'unmount', {
          mountTime: mountTimeRef.current,
          lifespan: Date.now() - mountTimeRef.current,
          renderCount: renderCountRef.current
        })
      }
    }
  }, [componentName, enableLifecycleLogging, enablePerformanceLogging])

  // Track renders
  useEffect(() => {
    renderCountRef.current++

    if (enableLifecycleLogging && renderCountRef.current > 1) {
      dev.lifecycle(componentName, 'update', {
        renderCount: renderCountRef.current,
        timestamp: Date.now()
      })
    }
  })

  // Log state changes
  const logStateChange = useCallback((stateName: string, oldValue: any, newValue: any) => {
    if (enableStateChangeLogging) {
      dev.stateChange(componentName, stateName, oldValue, newValue)
    }
  }, [componentName, enableStateChangeLogging])

  // Log user actions
  const logUserAction = useCallback((action: string, data?: any) => {
    logger.user('info', `User action: ${action}`, {
      action,
      data,
      timestamp: Date.now(),
      component: componentName
    })
  }, [logger, componentName])

  // Log errors with context
  const logError = useCallback((message: string, error?: Error | any, data?: any) => {
    logger.error(message, error, {
      ...data,
      component: componentName,
      renderCount: renderCountRef.current,
      mountTime: mountTimeRef.current
    })
  }, [logger, componentName])

  // Log performance metrics
  const logPerformance = useCallback((operation: string, duration: number, data?: any) => {
    performanceLogger.logRenderTime(`${componentName}.${operation}`, duration)
    logger.performance('info', `Performance: ${operation}`, {
      duration,
      operation,
      ...data
    })
  }, [logger, componentName])

  // Timer utilities
  const startTimer = useCallback((label: string) => {
    logger.time(label)
    if (enablePerformanceLogging) {
      performanceLogger.markStart(`${componentName}-${label}`)
    }
  }, [logger, componentName, enablePerformanceLogging])

  const endTimer = useCallback((label: string) => {
    logger.timeEnd(label)
    if (enablePerformanceLogging) {
      performanceLogger.markEnd(`${componentName}-${label}`)
    }
  }, [logger, componentName, enablePerformanceLogging])

  // Group utilities
  const group = useCallback((label: string) => {
    logger.group(label)
  }, [logger])

  const groupEnd = useCallback(() => {
    logger.groupEnd()
  }, [logger])

  return {
    logger,
    logStateChange,
    logUserAction,
    logError,
    logPerformance,
    startTimer,
    endTimer,
    group,
    groupEnd
  }
}

/**
 * Hook for authentication-related logging
 */
export function useAuthLogger(componentName: string) {
  const logger = useMemo(() => createLogger(componentName, 'auth'), [componentName])

  const logLogin = useCallback((method: string, success: boolean, data?: any) => {
    logger.info(`Login attempt: ${method}`, {
      method,
      success,
      timestamp: Date.now(),
      ...data
    })
  }, [logger])

  const logLogout = useCallback((data?: any) => {
    logger.info('User logout', {
      timestamp: Date.now(),
      ...data
    })
  }, [logger])

  const logWalletConnection = useCallback((address: string, chainId?: number) => {
    logger.info('Wallet connected', {
      address,
      chainId,
      timestamp: Date.now()
    })

    // Set user context for all logs
    setUserContext({ address })
  }, [logger])

  const logWalletDisconnection = useCallback(() => {
    logger.info('Wallet disconnected', {
      timestamp: Date.now()
    })

    // Clear user context
    setUserContext({})
  }, [logger])

  return {
    logger,
    logLogin,
    logLogout,
    logWalletConnection,
    logWalletDisconnection
  }
}

/**
 * Hook for IPFS-related logging
 */
export function useIPFSLogger(componentName: string) {
  const logger = useMemo(() => createLogger(componentName, 'ipfs'), [componentName])

  const logUpload = useCallback((hash: string, fileSize?: number, duration?: number) => {
    logger.info('IPFS upload completed', {
      hash,
      fileSize,
      duration,
      timestamp: Date.now()
    })
  }, [logger])

  const logDownload = useCallback((hash: string, success: boolean, duration?: number, error?: Error) => {
    if (success) {
      logger.info('IPFS download completed', {
        hash,
        duration,
        timestamp: Date.now()
      })
    } else {
      logger.error('IPFS download failed', error, {
        hash,
        duration,
        timestamp: Date.now()
      })
    }
  }, [logger])

  const logRateLimit = useCallback((hash: string, retryAfter?: number) => {
    logger.warn('IPFS rate limit encountered', {
      hash,
      retryAfter,
      timestamp: Date.now()
    })
  }, [logger])

  const logCacheHit = useCallback((hash: string) => {
    logger.debug('IPFS cache hit', {
      hash,
      timestamp: Date.now()
    })
  }, [logger])

  const logCacheMiss = useCallback((hash: string) => {
    logger.debug('IPFS cache miss', {
      hash,
      timestamp: Date.now()
    })
  }, [logger])

  return {
    logger,
    logUpload,
    logDownload,
    logRateLimit,
    logCacheHit,
    logCacheMiss
  }
}

/**
 * Hook for blockchain-related logging
 */
export function useBlockchainLogger(componentName: string) {
  const logger = useMemo(() => createLogger(componentName, 'blockchain'), [componentName])

  const logTransaction = useCallback((
    txHash: string,
    method: string,
    status: 'pending' | 'success' | 'failed',
    gasUsed?: number,
    gasPrice?: string,
    error?: Error
  ) => {
    const level: LogLevel = status === 'failed' ? 'error' : 'info'
    logger[level](`Transaction ${status}: ${method}`, error, {
      txHash,
      method,
      status,
      gasUsed,
      gasPrice,
      timestamp: Date.now()
    })
  }, [logger])

  const logContractCall = useCallback((
    contractAddress: string,
    method: string,
    args?: any[],
    result?: any,
    error?: Error
  ) => {
    if (error) {
      logger.error(`Contract call failed: ${method}`, error, {
        contractAddress,
        method,
        args,
        timestamp: Date.now()
      })
    } else {
      logger.info(`Contract call: ${method}`, {
        contractAddress,
        method,
        args,
        result,
        timestamp: Date.now()
      })
    }
  }, [logger])

  const logNetworkChange = useCallback((chainId: number, chainName?: string) => {
    logger.info('Network changed', {
      chainId,
      chainName,
      timestamp: Date.now()
    })
  }, [logger])

  return {
    logger,
    logTransaction,
    logContractCall,
    logNetworkChange
  }
}

/**
 * Hook for API-related logging
 */
export function useAPILogger(componentName: string) {
  const logger = useMemo(() => createLogger(componentName, 'api'), [componentName])

  const logRequest = useCallback((
    url: string,
    method: string,
    headers?: Record<string, string>,
    body?: any
  ) => {
    logger.debug(`API request: ${method} ${url}`, {
      url,
      method,
      headers,
      body,
      timestamp: Date.now()
    })
  }, [logger])

  const logResponse = useCallback((
    url: string,
    method: string,
    status: number,
    duration: number,
    data?: any,
    error?: Error
  ) => {
    const level: LogLevel = status >= 400 ? 'error' : 'info'
    logger[level](`API response: ${method} ${url}`, error, {
      url,
      method,
      status,
      duration,
      data,
      timestamp: Date.now()
    })

    // Log to performance logger
    performanceLogger.logAPICall(url, method, duration, status)
  }, [logger])

  const logGraphQLQuery = useCallback((
    query: string,
    variables?: any,
    operationName?: string,
    duration?: number,
    error?: Error
  ) => {
    if (error) {
      logger.error(`GraphQL query failed: ${operationName || 'unnamed'}`, error, {
        query,
        variables,
        operationName,
        duration,
        timestamp: Date.now()
      })
    } else {
      logger.info(`GraphQL query: ${operationName || 'unnamed'}`, {
        query,
        variables,
        operationName,
        duration,
        timestamp: Date.now()
      })
    }
  }, [logger])

  return {
    logger,
    logRequest,
    logResponse,
    logGraphQLQuery
  }
}

/**
 * Hook for performance logging with React-specific metrics
 */
export function usePerformanceLogger(componentName: string) {
  const logger = useMemo(() => createLogger(componentName, 'performance'), [componentName])
  const renderStartTime = useRef<number>(0)

  // Track render performance
  useEffect(() => {
    renderStartTime.current = performance.now()
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current
    performanceLogger.logRenderTime(componentName, renderTime)
  })

  const logCustomMetric = useCallback((name: string, value: number, unit?: string) => {
    logger.info(`Custom metric: ${name}`, {
      name,
      value,
      unit,
      timestamp: Date.now()
    })
  }, [logger])

  const logResourceTiming = useCallback((resourceName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      const entries = window.performance.getEntriesByName(resourceName)
      if (entries.length > 0) {
        const entry = entries[0]
        logger.info(`Resource timing: ${resourceName}`, {
          resourceName,
          duration: entry.duration,
          startTime: entry.startTime,
          timestamp: Date.now()
        })
      }
    }
  }, [logger])

  return {
    logger,
    logCustomMetric,
    logResourceTiming,
    performanceLogger
  }
}

/**
 * Development-only hook for debugging
 */
export function useDebugLogger(componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  const logger = useMemo(() => createLogger(componentName, 'dev'), [componentName])

  const logRender = useCallback((props?: any, state?: any) => {
    if (enabled) {
      logger.debug('Component render', {
        props,
        state,
        timestamp: Date.now()
      })
    }
  }, [logger, enabled])

  const logEffect = useCallback((effectName: string, dependencies?: any[]) => {
    if (enabled) {
      logger.debug(`Effect: ${effectName}`, {
        effectName,
        dependencies,
        timestamp: Date.now()
      })
    }
  }, [logger, enabled])

  const logCallback = useCallback((callbackName: string, args?: any[]) => {
    if (enabled) {
      logger.debug(`Callback: ${callbackName}`, {
        callbackName,
        args,
        timestamp: Date.now()
      })
    }
  }, [logger, enabled])

  return {
    logger,
    logRender,
    logEffect,
    logCallback
  }
}
