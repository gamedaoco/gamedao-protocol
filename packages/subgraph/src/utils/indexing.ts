import { BigInt, BigDecimal, ethereum, log } from '@graphprotocol/graph-ts'
import { SubgraphIndexingStatus, BlockInfo } from '../../generated/schema'

// Constants
const INDEXING_STATUS_ID = 'indexing-status'
const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const HUNDRED_BD = BigDecimal.fromString('100')

/**
 * Update the subgraph indexing status with current block information
 * Call this from every event handler to track progress
 */
export function updateIndexingStatus(block: ethereum.Block, eventType: string = 'unknown'): void {
  let status = SubgraphIndexingStatus.load(INDEXING_STATUS_ID)

  if (status == null) {
    status = new SubgraphIndexingStatus(INDEXING_STATUS_ID)
    status.currentBlock = ZERO_BI
    status.latestBlock = ZERO_BI
    status.isFullySynced = false
    status.totalBlocks = ZERO_BI
    status.blocksRemaining = ZERO_BI
    status.syncPercentage = BigDecimal.fromString('0')
    status.blocksPerSecond = BigDecimal.fromString('0')
    status.estimatedTimeToSync = ZERO_BI
    status.lastUpdatedAt = ZERO_BI
    status.lastUpdatedBlock = ZERO_BI
    status.hasErrors = false
    status.lastError = null
    status.errorCount = ZERO_BI
  }

  // Update current block (always use the latest block we've seen)
  if (block.number.gt(status.currentBlock)) {
    status.currentBlock = block.number
  }

  // For local development, we can estimate the latest block
  // In production, this would need to be updated by an external service
  // For now, assume we're close to being synced if we're processing recent blocks
  status.latestBlock = status.currentBlock.plus(BigInt.fromI32(10)) // Assume 10 blocks ahead

  // Calculate sync progress
  if (status.latestBlock.gt(ZERO_BI)) {
    status.totalBlocks = status.latestBlock
    status.blocksRemaining = status.latestBlock.minus(status.currentBlock)

    if (status.blocksRemaining.le(BigInt.fromI32(5))) {
      status.isFullySynced = true
      status.syncPercentage = HUNDRED_BD
      status.blocksRemaining = ZERO_BI
      status.estimatedTimeToSync = ZERO_BI
    } else {
      status.isFullySynced = false
      // Calculate percentage: (currentBlock / latestBlock) * 100
      let percentage = status.currentBlock.toBigDecimal()
        .div(status.latestBlock.toBigDecimal())
        .times(HUNDRED_BD)
      status.syncPercentage = percentage

      // Estimate time to sync (simplified calculation)
      // If we have previous timing data, we could calculate blocks per second
      if (status.blocksPerSecond.gt(BigDecimal.fromString('0'))) {
        status.estimatedTimeToSync = status.blocksRemaining.toBigDecimal()
          .div(status.blocksPerSecond)
          .truncate(0).digits
      }
    }
  }

  // Update timestamps
  status.lastUpdatedAt = block.timestamp
  status.lastUpdatedBlock = block.number

  status.save()

  // Also track individual block info
  updateBlockInfo(block, eventType)

  log.info('Indexing status updated - Block: {}, Synced: {}%, Event: {}', [
    block.number.toString(),
    status.syncPercentage.toString(),
    eventType
  ])
}

/**
 * Track information about individual blocks
 */
export function updateBlockInfo(block: ethereum.Block, eventType: string): void {
  let blockId = block.number.toString()
  let blockInfo = BlockInfo.load(blockId)

  if (blockInfo == null) {
    blockInfo = new BlockInfo(blockId)
    blockInfo.number = block.number
    blockInfo.timestamp = block.timestamp
    blockInfo.hash = block.hash
    blockInfo.processedAt = block.timestamp
    blockInfo.transactionCount = ZERO_BI // Would need to get from block
    blockInfo.eventCount = ZERO_BI
    blockInfo.organizationEvents = ZERO_BI
    blockInfo.campaignEvents = ZERO_BI
    blockInfo.proposalEvents = ZERO_BI
    blockInfo.profileEvents = ZERO_BI
    blockInfo.stakingEvents = ZERO_BI
  }

  // Increment event counters based on event type
  blockInfo.eventCount = blockInfo.eventCount.plus(ONE_BI)

  if (eventType.includes('Organization') || eventType.includes('Member')) {
    blockInfo.organizationEvents = blockInfo.organizationEvents.plus(ONE_BI)
  } else if (eventType.includes('Campaign') || eventType.includes('Contribution')) {
    blockInfo.campaignEvents = blockInfo.campaignEvents.plus(ONE_BI)
  } else if (eventType.includes('Proposal') || eventType.includes('Vote')) {
    blockInfo.proposalEvents = blockInfo.proposalEvents.plus(ONE_BI)
  } else if (eventType.includes('Profile') || eventType.includes('Achievement')) {
    blockInfo.profileEvents = blockInfo.profileEvents.plus(ONE_BI)
  } else if (eventType.includes('Stake') || eventType.includes('Reward')) {
    blockInfo.stakingEvents = blockInfo.stakingEvents.plus(ONE_BI)
  }

  blockInfo.save()
}

/**
 * Mark an error in the indexing status
 */
export function recordIndexingError(error: string, block: ethereum.Block): void {
  let status = SubgraphIndexingStatus.load(INDEXING_STATUS_ID)

  if (status == null) {
    // Initialize if it doesn't exist
    updateIndexingStatus(block, 'error')
    status = SubgraphIndexingStatus.load(INDEXING_STATUS_ID)!
  }

  status.hasErrors = true
  status.lastError = error
  status.errorCount = status.errorCount.plus(ONE_BI)
  status.lastUpdatedAt = block.timestamp
  status.lastUpdatedBlock = block.number

  status.save()

  log.error('Indexing error recorded: {} at block {}', [error, block.number.toString()])
}

/**
 * Get a human-readable sync status
 */
export function getSyncStatusString(status: SubgraphIndexingStatus): string {
  if (status.isFullySynced) {
    return 'Fully Synced'
  } else if (status.syncPercentage.gt(BigDecimal.fromString('95'))) {
    return 'Nearly Synced'
  } else if (status.syncPercentage.gt(BigDecimal.fromString('50'))) {
    return 'Syncing'
  } else {
    return 'Initial Sync'
  }
}
