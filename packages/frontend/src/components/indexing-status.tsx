'use client'

import { useIndexingStatus, formatTimeRemaining, getSyncStatusColor, getSyncStatusText } from '../hooks/useIndexingStatus'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Clock, Database, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface IndexingStatusProps {
  compact?: boolean
  showDetails?: boolean
}

export function IndexingStatus({ compact = false, showDetails = false }: IndexingStatusProps) {
  const { indexingStatus, isLoading, error } = useIndexingStatus()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading indexing status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <AlertTriangle className="h-4 w-4" />
        <span>Failed to load indexing status</span>
      </div>
    )
  }

  const statusText = getSyncStatusText(indexingStatus)
  const statusColor = getSyncStatusColor(indexingStatus.syncPercentage, indexingStatus.hasErrors)

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {indexingStatus.isFullySynced ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : indexingStatus.hasErrors ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <Database className="h-4 w-4 text-blue-500" />
        )}
        <span className={statusColor}>{statusText}</span>
        {!indexingStatus.isFullySynced && (
          <span className="text-muted-foreground">
            ({indexingStatus.syncPercentage.toFixed(1)}%)
          </span>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subgraph Status</CardTitle>
          <Badge variant={indexingStatus.isFullySynced ? 'default' : 'secondary'}>
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sync Progress</span>
            <span className={statusColor}>
              {indexingStatus.syncPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={indexingStatus.syncPercentage}
            className="h-2"
          />
        </div>

        {/* Block Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Current Block</span>
            </div>
            <p className="text-lg font-mono">
              {indexingStatus.currentBlock.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Latest Block</span>
            </div>
            <p className="text-lg font-mono">
              {indexingStatus.latestBlock.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Additional Details */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Blocks Remaining:</span>
                <p className="font-mono">{indexingStatus.blocksRemaining.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Time:</span>
                <p className="font-mono">{formatTimeRemaining(indexingStatus.estimatedTimeToSync)}</p>
              </div>
            </div>

            {indexingStatus.blocksPerSecond > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Processing Speed:</span>
                <p className="font-mono text-sm">
                  {indexingStatus.blocksPerSecond.toFixed(2)} blocks/sec
                </p>
              </div>
            )}

            {indexingStatus.lastUpdatedAt > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Last Updated:</span>
                <p className="text-sm">
                  {new Date(indexingStatus.lastUpdatedAt * 1000).toLocaleString()}
                </p>
              </div>
            )}

            {indexingStatus.hasErrors && indexingStatus.lastError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Last Error
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {indexingStatus.lastError}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for headers/status bars
export function CompactIndexingStatus() {
  return <IndexingStatus compact={true} />
}

// Detailed version for debug/admin pages
export function DetailedIndexingStatus() {
  return <IndexingStatus showDetails={true} />
}
