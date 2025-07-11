import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { GET_INDEXING_STATUS, GET_INDEXING_METRICS } from '../lib/queries'

export interface IndexingStatus {
  currentBlock: number
  latestBlock: number
  isFullySynced: boolean
  totalBlocks: number
  blocksRemaining: number
  syncPercentage: number
  blocksPerSecond: number
  estimatedTimeToSync: number
  lastUpdatedAt: number
  lastUpdatedBlock: number
  hasErrors: boolean
  lastError?: string
  errorCount: number
}

export interface IndexingMetrics {
  status: IndexingStatus
  recentBlocks: Array<{
    number: number
    timestamp: number
    eventCount: number
    organizationEvents: number
    campaignEvents: number
    proposalEvents: number
    profileEvents: number
    stakingEvents: number
  }>
  isLoading: boolean
  error: any
}

export function useIndexingStatus() {
  const { data, loading, error, refetch } = useQuery(GET_INDEXING_STATUS, {
    pollInterval: 5000, // Poll every 5 seconds for real-time updates
    errorPolicy: 'ignore',
  })

  const indexingStatus: IndexingStatus = {
    currentBlock: parseInt(data?.subgraphIndexingStatus?.currentBlock || '0'),
    latestBlock: parseInt(data?.subgraphIndexingStatus?.latestBlock || '0'),
    isFullySynced: data?.subgraphIndexingStatus?.isFullySynced || false,
    totalBlocks: parseInt(data?.subgraphIndexingStatus?.totalBlocks || '0'),
    blocksRemaining: parseInt(data?.subgraphIndexingStatus?.blocksRemaining || '0'),
    syncPercentage: parseFloat(data?.subgraphIndexingStatus?.syncPercentage || '0'),
    blocksPerSecond: parseFloat(data?.subgraphIndexingStatus?.blocksPerSecond || '0'),
    estimatedTimeToSync: parseInt(data?.subgraphIndexingStatus?.estimatedTimeToSync || '0'),
    lastUpdatedAt: parseInt(data?.subgraphIndexingStatus?.lastUpdatedAt || '0'),
    lastUpdatedBlock: parseInt(data?.subgraphIndexingStatus?.lastUpdatedBlock || '0'),
    hasErrors: data?.subgraphIndexingStatus?.hasErrors || false,
    lastError: data?.subgraphIndexingStatus?.lastError || undefined,
    errorCount: parseInt(data?.subgraphIndexingStatus?.errorCount || '0'),
  }

  return {
    indexingStatus,
    isLoading: loading,
    error,
    refetch,
  }
}

export function useIndexingMetrics(): IndexingMetrics {
  const { data, loading, error, refetch } = useQuery(GET_INDEXING_METRICS, {
    pollInterval: 10000, // Poll every 10 seconds
    errorPolicy: 'ignore',
  })

  const status: IndexingStatus = {
    currentBlock: parseInt(data?.subgraphIndexingStatus?.currentBlock || '0'),
    latestBlock: parseInt(data?.subgraphIndexingStatus?.latestBlock || '0'),
    isFullySynced: data?.subgraphIndexingStatus?.isFullySynced || false,
    totalBlocks: 0,
    blocksRemaining: parseInt(data?.subgraphIndexingStatus?.latestBlock || '0') - parseInt(data?.subgraphIndexingStatus?.currentBlock || '0'),
    syncPercentage: parseFloat(data?.subgraphIndexingStatus?.syncPercentage || '0'),
    blocksPerSecond: parseFloat(data?.subgraphIndexingStatus?.blocksPerSecond || '0'),
    estimatedTimeToSync: parseInt(data?.subgraphIndexingStatus?.estimatedTimeToSync || '0'),
    lastUpdatedAt: parseInt(data?.subgraphIndexingStatus?.lastUpdatedAt || '0'),
    lastUpdatedBlock: parseInt(data?.subgraphIndexingStatus?.lastUpdatedBlock || '0'),
    hasErrors: data?.subgraphIndexingStatus?.hasErrors || false,
    lastError: data?.subgraphIndexingStatus?.lastError || undefined,
    errorCount: 0,
  }

  const recentBlocks = data?.blockInfos?.map((block: any) => ({
    number: parseInt(block.number),
    timestamp: parseInt(block.timestamp),
    eventCount: parseInt(block.eventCount),
    organizationEvents: parseInt(block.organizationEvents),
    campaignEvents: parseInt(block.campaignEvents),
    proposalEvents: parseInt(block.proposalEvents),
    profileEvents: parseInt(block.profileEvents),
    stakingEvents: parseInt(block.stakingEvents),
  })) || []

  return {
    status,
    recentBlocks,
    isLoading: loading,
    error,
  }
}

/**
 * Helper function to format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Synced'

  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  } else {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }
}

/**
 * Helper function to get sync status color
 */
export function getSyncStatusColor(percentage: number, hasErrors: boolean): string {
  if (hasErrors) return 'text-red-500'
  if (percentage >= 99) return 'text-green-500'
  if (percentage >= 90) return 'text-yellow-500'
  return 'text-blue-500'
}

/**
 * Helper function to get sync status text
 */
export function getSyncStatusText(status: IndexingStatus): string {
  if (status.hasErrors) return 'Error'
  if (status.isFullySynced) return 'Synced'
  if (status.syncPercentage >= 99) return 'Almost Synced'
  if (status.syncPercentage >= 90) return 'Nearly Synced'
  if (status.syncPercentage >= 50) return 'Syncing'
  return 'Initial Sync'
}
