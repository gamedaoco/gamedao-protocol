'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  LogLevel,
  LogCategory,
  LogEntry,
  getLoggerConfig,
  configureLogger,
  setLogLevel,
  setEnabledCategories,
  enableCategory,
  disableCategory,
  getLogEntries,
  getFilteredLogEntries,
  clearLogEntries,
  exportLogs,
  exportLogsAsCSV,
  clearUserContext,
  setUserContext
} from '@/lib/logger'
import { useLogger } from '@/hooks/useLogger'
import { Download, Trash2, Filter, Eye, EyeOff, RefreshCw } from 'lucide-react'

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']
const LOG_CATEGORIES: LogCategory[] = [
  'app', 'auth', 'ipfs', 'blockchain', 'ui', 'api', 'performance', 'user', 'system', 'dev'
]

const LEVEL_COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: 'bg-gray-100 text-gray-800',
  info: 'bg-blue-100 text-blue-800',
  warn: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800'
}

const CATEGORY_COLORS = {
  app: 'bg-purple-100 text-purple-800',
  auth: 'bg-green-100 text-green-800',
  ipfs: 'bg-orange-100 text-orange-800',
  blockchain: 'bg-indigo-100 text-indigo-800',
  ui: 'bg-pink-100 text-pink-800',
  api: 'bg-teal-100 text-teal-800',
  performance: 'bg-yellow-100 text-yellow-800',
  user: 'bg-blue-100 text-blue-800',
  system: 'bg-red-100 text-red-800',
  dev: 'bg-gray-100 text-gray-800'
}

interface LoggerManagerProps {
  className?: string
}

export function LoggerManager({ className }: LoggerManagerProps) {
  const { logger } = useLogger('LoggerManager', { category: 'dev' })

  const [config, setConfig] = useState(getLoggerConfig())
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    level: '' as LogLevel | '',
    category: '' as LogCategory | '',
    component: '',
    search: '',
    since: ''
  })

  // User context
  const [userContext, setUserContextState] = useState({ userId: '', address: '' })

  // Refresh logs
  const refreshLogs = () => {
    const allLogs = getLogEntries()
    setLogs(allLogs)
    logger.debug('Logs refreshed', { count: allLogs.length })
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Filter logs
  useEffect(() => {
    const filtered = getFilteredLogEntries({
      level: filters.level || undefined,
      category: filters.category || undefined,
      component: filters.component || undefined,
      search: filters.search || undefined,
      since: filters.since ? new Date(filters.since) : undefined
    })
    setFilteredLogs(filtered)
  }, [logs, filters])

  // Initial load
  useEffect(() => {
    refreshLogs()
  }, [])

  // Configuration handlers
  const handleLevelChange = (level: LogLevel) => {
    setLogLevel(level)
    setConfig(getLoggerConfig())
    logger.info('Log level changed', { level })
  }

  const handleCategoryToggle = (category: LogCategory, enabled: boolean) => {
    if (enabled) {
      enableCategory(category)
    } else {
      disableCategory(category)
    }
    setConfig(getLoggerConfig())
    logger.info('Category toggled', { category, enabled })
  }

  const handleConfigChange = (key: string, value: any) => {
    configureLogger({ [key]: value })
    setConfig(getLoggerConfig())
    logger.info('Configuration changed', { key, value })
  }

  const handleClearLogs = () => {
    clearLogEntries()
    refreshLogs()
    logger.info('Logs cleared')
  }

  const handleExportJSON = () => {
    const data = exportLogs()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    logger.info('Logs exported as JSON')
  }

  const handleExportCSV = () => {
    const data = exportLogsAsCSV()
    const blob = new Blob([data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    logger.info('Logs exported as CSV')
  }

  const handleUserContextChange = () => {
    setUserContext(userContext)
    logger.info('User context updated', userContext)
  }

  const handleClearUserContext = () => {
    clearUserContext()
    setUserContextState({ userId: '', address: '' })
    logger.info('User context cleared')
  }

  const stats = useMemo(() => {
    const total = logs.length
    const byLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {} as Record<LogLevel, number>)
    const byCategory = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1
      return acc
    }, {} as Record<LogCategory, number>)

    return { total, byLevel, byCategory }
  }, [logs])

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-background border-2 shadow-lg"
        >
          <Eye className="h-4 w-4 mr-2" />
          Logger ({stats.total})
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed inset-4 z-50 bg-background border-2 rounded-lg shadow-xl ${className}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Logger Manager</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button
              onClick={() => setIsExpanded(false)}
              variant="outline"
              size="sm"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Configuration Panel */}
          <div className="w-80 border-r p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Logs</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stats.byLevel).map(([level, count]) => {
                      const allowedLevels = ['debug','info','warn','error'] as const
                      const safeLevel = allowedLevels.includes(level as any)
                        ? (level as typeof allowedLevels[number])
                        : 'debug'
                      return (
                        <Badge key={level} className={LEVEL_COLORS[safeLevel]}>
                          {level}: {count}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Log Level */}
              <div className="space-y-2">
                <Label>Log Level</Label>
                <Select value={config.level} onValueChange={handleLevelChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label>Enabled Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  {LOG_CATEGORIES.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={category}
                        checked={config.enabledCategories.includes(category)}
                        onChange={(e) => handleCategoryToggle(category, e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={category} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-2">
                <Label>Configuration</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableConsole"
                      checked={config.enableConsole}
                      onChange={(e) => handleConfigChange('enableConsole', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="enableConsole" className="text-sm">
                      Console Logging
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableStorage"
                      checked={config.enableStorage}
                      onChange={(e) => handleConfigChange('enableStorage', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="enableStorage" className="text-sm">
                      Storage Logging
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeStackTrace"
                      checked={config.includeStackTrace}
                      onChange={(e) => handleConfigChange('includeStackTrace', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeStackTrace" className="text-sm">
                      Stack Traces
                    </Label>
                  </div>
                </div>
              </div>

              {/* User Context */}
              <div className="space-y-2">
                <Label>User Context</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="User ID"
                    value={userContext.userId}
                    onChange={(e) => setUserContextState(prev => ({ ...prev, userId: e.target.value }))}
                  />
                  <Input
                    placeholder="Wallet Address"
                    value={userContext.address}
                    onChange={(e) => setUserContextState(prev => ({ ...prev, address: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleUserContextChange} size="sm">
                      Set Context
                    </Button>
                    <Button onClick={handleClearUserContext} variant="outline" size="sm">
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleExportJSON} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={handleExportCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={handleClearLogs} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Logs
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="flex-1 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b">
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4" />
                <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value as LogLevel }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    {LOG_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>
                        {level.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value as LogCategory }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {LOG_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Component"
                  value={filters.component}
                  onChange={(e) => setFilters(prev => ({ ...prev, component: e.target.value }))}
                  className="w-32"
                />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <Badge className={LEVEL_COLORS[(['debug','info','warn','error'] as const).includes(log.level as any) ? (log.level as 'debug'|'info'|'warn'|'error') : 'debug']}>
                        {log.level}
                      </Badge>
                      <Badge className={CATEGORY_COLORS[log.category]}>
                        {log.category}
                      </Badge>
                      {log.component && (
                        <Badge variant="outline">
                          {log.component}
                        </Badge>
                      )}
                      {log.userId && (
                        <Badge variant="secondary">
                          {log.userId}
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium">{log.message}</div>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground">
                          Data
                        </summary>
                        <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.error && (
                      <div className="mt-2 text-red-600">
                        <div className="font-medium">Error: {log.error.message}</div>
                        {log.error.stack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer">Stack Trace</summary>
                            <pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">
                              {log.error.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No logs match the current filters
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Development-only wrapper
export function LoggerManagerWrapper() {
  const [isEnabled, setIsEnabled] = useState(false)

  // Only enable in development
  useEffect(() => {
    setIsEnabled(process.env.NODE_ENV === 'development')
  }, [])

  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        setIsEnabled(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isEnabled) return null

  return <LoggerManager />
}
