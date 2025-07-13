/**
 * Frontend Logging Library
 * Provides structured logging with filtering, levels, and global configuration
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
export type LogCategory =
  | 'app'          // General application logs
  | 'auth'         // Authentication related
  | 'ipfs'         // IPFS operations
  | 'blockchain'   // Blockchain interactions
  | 'ui'           // UI components and interactions
  | 'api'          // API calls and responses
  | 'performance'  // Performance metrics
  | 'user'         // User actions and events
  | 'system'       // System events and errors
  | 'dev'          // Development/debugging logs

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  category: LogCategory
  message: string
  data?: any
  error?: Error
  component?: string
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
}

export interface LoggerConfig {
  level: LogLevel
  enabledCategories: LogCategory[]
  enableConsole: boolean
  enableStorage: boolean
  maxStorageEntries: number
  enableRemoteLogging: boolean
  remoteEndpoint?: string
  includeStackTrace: boolean
  includeUserContext: boolean
  formatters: {
    console: (entry: LogEntry) => void
    storage: (entry: LogEntry) => string
  }
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enabledCategories: ['app', 'auth', 'ipfs', 'blockchain', 'ui', 'api', 'performance', 'user', 'system', 'dev'],
  enableConsole: true,
  enableStorage: true,
  maxStorageEntries: 1000,
  enableRemoteLogging: false,
  includeStackTrace: true,
  includeUserContext: true,
  formatters: {
    console: defaultConsoleFormatter,
    storage: defaultStorageFormatter
  }
}

// Global configuration
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG }

// In-memory log storage
let logStorage: LogEntry[] = []

// Session ID for tracking
let sessionId: string = generateSessionId()

// User context
let userContext: { userId?: string; address?: string } = {}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get current user context
 */
function getUserContext(): { userId?: string; address?: string } {
  return userContext
}

/**
 * Set user context for logging
 */
export function setUserContext(context: { userId?: string; address?: string }): void {
  userContext = { ...userContext, ...context }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  userContext = {}
}

/**
 * Default console formatter
 */
function defaultConsoleFormatter(entry: LogEntry): void {
  const { timestamp, level, category, message, data, error, component } = entry

  // Style based on log level
  const styles = {
    debug: 'color: #6B7280; font-weight: normal;',
    info: 'color: #3B82F6; font-weight: normal;',
    warn: 'color: #F59E0B; font-weight: bold;',
    error: 'color: #EF4444; font-weight: bold;'
  }

  const style = styles[level as keyof typeof styles] || styles.info
  const time = timestamp.toISOString().substr(11, 12)
  const prefix = `%c[${time}] ${level.toUpperCase()} [${category}]${component ? ` <${component}>` : ''}`

  if (error) {
    console.group(prefix, style)
    console.log(message)
    if (data) console.log('Data:', data)
    console.error('Error:', error)
    if (globalConfig.includeStackTrace && error.stack) {
      console.log('Stack:', error.stack)
    }
    console.groupEnd()
  } else {
    console.log(prefix, style, message, data || '')
  }
}

/**
 * Default storage formatter
 */
function defaultStorageFormatter(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    category: entry.category,
    message: entry.message,
    data: entry.data,
    error: entry.error ? {
      name: entry.error.name,
      message: entry.error.message,
      stack: entry.error.stack
    } : undefined,
    component: entry.component,
    userId: entry.userId,
    sessionId: entry.sessionId,
    url: entry.url,
    userAgent: entry.userAgent
  })
}

/**
 * Check if log should be processed based on level and category
 */
function shouldLog(level: LogLevel, category: LogCategory): boolean {
  return (
    LOG_LEVELS[level] >= LOG_LEVELS[globalConfig.level] &&
    globalConfig.enabledCategories.includes(category)
  )
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: any,
  error?: Error,
  component?: string
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    category,
    message,
    data,
    error,
    component,
    sessionId,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  }

  // Add user context if enabled
  if (globalConfig.includeUserContext) {
    const context = getUserContext()
    entry.userId = context.userId || context.address
  }

  return entry
}

/**
 * Process a log entry
 */
function processLogEntry(entry: LogEntry): void {
  // Console logging
  if (globalConfig.enableConsole) {
    globalConfig.formatters.console(entry)
  }

  // Storage logging
  if (globalConfig.enableStorage) {
    logStorage.push(entry)

    // Maintain max storage entries
    if (logStorage.length > globalConfig.maxStorageEntries) {
      logStorage = logStorage.slice(-globalConfig.maxStorageEntries)
    }
  }

  // Remote logging
  if (globalConfig.enableRemoteLogging && globalConfig.remoteEndpoint) {
    sendToRemote(entry).catch(err => {
      console.error('Failed to send log to remote:', err)
    })
  }
}

/**
 * Send log entry to remote endpoint
 */
async function sendToRemote(entry: LogEntry): Promise<void> {
  if (!globalConfig.remoteEndpoint) return

  try {
    await fetch(globalConfig.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: globalConfig.formatters.storage(entry)
    })
  } catch (error) {
    // Silently fail remote logging to avoid infinite loops
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: any,
  error?: Error,
  component?: string
): void {
  if (!shouldLog(level, category)) return

  const entry = createLogEntry(level, category, message, data, error, component)
  processLogEntry(entry)
}

/**
 * Logger class for component-specific logging
 */
export class Logger {
  private component: string
  private category: LogCategory

  constructor(component: string, category: LogCategory = 'app') {
    this.component = component
    this.category = category
  }

  debug(message: string, data?: any): void {
    log('debug', this.category, message, data, undefined, this.component)
  }

  info(message: string, data?: any): void {
    log('info', this.category, message, data, undefined, this.component)
  }

  warn(message: string, data?: any): void {
    log('warn', this.category, message, data, undefined, this.component)
  }

  error(message: string, error?: Error | any, data?: any): void {
    const errorObj = error instanceof Error ? error :
                     error ? new Error(JSON.stringify(error)) : undefined
    log('error', this.category, message, data, errorObj, this.component)
  }

  // Convenience methods for specific categories
  auth(level: LogLevel, message: string, data?: any): void {
    log(level, 'auth', message, data, undefined, this.component)
  }

  ipfs(level: LogLevel, message: string, data?: any): void {
    log(level, 'ipfs', message, data, undefined, this.component)
  }

  blockchain(level: LogLevel, message: string, data?: any): void {
    log(level, 'blockchain', message, data, undefined, this.component)
  }

  ui(level: LogLevel, message: string, data?: any): void {
    log(level, 'ui', message, data, undefined, this.component)
  }

  api(level: LogLevel, message: string, data?: any): void {
    log(level, 'api', message, data, undefined, this.component)
  }

  performance(level: LogLevel, message: string, data?: any): void {
    log(level, 'performance', message, data, undefined, this.component)
  }

  user(level: LogLevel, message: string, data?: any): void {
    log(level, 'user', message, data, undefined, this.component)
  }

  // Timing utilities
  time(label: string): void {
    this.debug(`Timer started: ${label}`)
    if (typeof window !== 'undefined') {
      console.time(`${this.component}: ${label}`)
    }
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`)
    if (typeof window !== 'undefined') {
      console.timeEnd(`${this.component}: ${label}`)
    }
  }

  // Group utilities
  group(label: string): void {
    this.debug(`Group started: ${label}`)
    if (typeof window !== 'undefined') {
      console.group(`${this.component}: ${label}`)
    }
  }

  groupEnd(): void {
    if (typeof window !== 'undefined') {
      console.groupEnd()
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger('Global', 'app')

/**
 * Create a logger for a specific component
 */
export function createLogger(component: string, category: LogCategory = 'app'): Logger {
  return new Logger(component, category)
}

/**
 * Configure global logging settings
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config }
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...globalConfig }
}

/**
 * Set log level globally
 */
export function setLogLevel(level: LogLevel): void {
  globalConfig.level = level
}

/**
 * Enable/disable categories
 */
export function setEnabledCategories(categories: LogCategory[]): void {
  globalConfig.enabledCategories = [...categories]
}

/**
 * Add category to enabled list
 */
export function enableCategory(category: LogCategory): void {
  if (!globalConfig.enabledCategories.includes(category)) {
    globalConfig.enabledCategories.push(category)
  }
}

/**
 * Remove category from enabled list
 */
export function disableCategory(category: LogCategory): void {
  globalConfig.enabledCategories = globalConfig.enabledCategories.filter(c => c !== category)
}

/**
 * Get all stored log entries
 */
export function getLogEntries(): LogEntry[] {
  return [...logStorage]
}

/**
 * Get log entries filtered by criteria
 */
export function getFilteredLogEntries(filters: {
  level?: LogLevel
  category?: LogCategory
  component?: string
  since?: Date
  search?: string
}): LogEntry[] {
  return logStorage.filter(entry => {
    if (filters.level && LOG_LEVELS[entry.level] < LOG_LEVELS[filters.level]) {
      return false
    }
    if (filters.category && entry.category !== filters.category) {
      return false
    }
    if (filters.component && entry.component !== filters.component) {
      return false
    }
    if (filters.since && entry.timestamp < filters.since) {
      return false
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        entry.message.toLowerCase().includes(searchTerm) ||
        (entry.component && entry.component.toLowerCase().includes(searchTerm)) ||
        (entry.data && JSON.stringify(entry.data).toLowerCase().includes(searchTerm))
      )
    }
    return true
  })
}

/**
 * Clear all stored log entries
 */
export function clearLogEntries(): void {
  logStorage = []
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify(logStorage, null, 2)
}

/**
 * Export logs as CSV
 */
export function exportLogsAsCSV(): string {
  const headers = ['timestamp', 'level', 'category', 'component', 'message', 'data', 'error']
  const rows = logStorage.map(entry => [
    entry.timestamp.toISOString(),
    entry.level,
    entry.category,
    entry.component || '',
    entry.message,
    entry.data ? JSON.stringify(entry.data) : '',
    entry.error ? entry.error.message : ''
  ])

  return [headers, ...rows].map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n')
}

/**
 * Performance monitoring utilities
 */
export class PerformanceLogger {
  private static instance: PerformanceLogger
  private logger: Logger

  private constructor() {
    this.logger = createLogger('Performance', 'performance')
  }

  static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger()
    }
    return PerformanceLogger.instance
  }

  markStart(name: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`)
    }
    this.logger.debug(`Performance mark start: ${name}`)
  }

  markEnd(name: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-end`)
      try {
        window.performance.measure(name, `${name}-start`, `${name}-end`)
        const measure = window.performance.getEntriesByName(name)[0]
        this.logger.info(`Performance measure: ${name}`, {
          duration: measure.duration,
          startTime: measure.startTime
        })
      } catch (error) {
        this.logger.error(`Failed to measure performance: ${name}`, error)
      }
    }
  }

  logRenderTime(componentName: string, renderTime: number): void {
    this.logger.info(`Render time: ${componentName}`, {
      duration: renderTime,
      timestamp: Date.now()
    })
  }

  logAPICall(endpoint: string, method: string, duration: number, status?: number): void {
    this.logger.info(`API call: ${method} ${endpoint}`, {
      duration,
      status,
      timestamp: Date.now()
    })
  }
}

/**
 * Get performance logger instance
 */
export const performanceLogger = PerformanceLogger.getInstance()

/**
 * Development utilities
 */
export const dev = {
  /**
   * Log component lifecycle events
   */
  lifecycle(component: string, event: 'mount' | 'unmount' | 'update', data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      log('debug', 'dev', `${component} ${event}`, data, undefined, component)
    }
  },

  /**
   * Log state changes
   */
  stateChange(component: string, stateName: string, oldValue: any, newValue: any): void {
    if (process.env.NODE_ENV === 'development') {
      log('debug', 'dev', `State change: ${stateName}`, {
        component,
        oldValue,
        newValue,
        timestamp: Date.now()
      }, undefined, component)
    }
  },

  /**
   * Log prop changes
   */
  propChange(component: string, propName: string, oldValue: any, newValue: any): void {
    if (process.env.NODE_ENV === 'development') {
      log('debug', 'dev', `Prop change: ${propName}`, {
        component,
        oldValue,
        newValue,
        timestamp: Date.now()
      }, undefined, component)
    }
  }
}

// Initialize logger on import
if (typeof window !== 'undefined') {
  // Set up global error handler
  window.addEventListener('error', (event) => {
    logger.error('Global error caught', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  // Set up unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason)
  })
}
