import { BigInt, BigDecimal, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  Staked,
  UnstakeRequested,
  Unstaked,
  RewardsClaimed,
  RewardsDistributed,
  Slashed,
  PoolUpdated
} from "../generated/GameStaking/GameStaking"
import {
  StakingPool,
  UserStake,
  UnstakeRequest,
  RewardClaim,
  RewardDistribution,
  SlashEvent,
  StakingPoolUpdate,
  StakingStats
} from "../generated/schema"

// Constants
const DECIMAL_PLACES = 18
const ZERO_BD = BigDecimal.fromString("0")
const ONE_BI = BigInt.fromI32(1)

// Helper function to convert BigInt to BigDecimal with 18 decimals
function toDecimal(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"))
}

// Helper function to get staking purpose as string
function getPurposeString(purpose: i32): string {
  if (purpose == 0) return "GOVERNANCE"
  if (purpose == 1) return "DAO_CREATION"
  if (purpose == 2) return "TREASURY_BOND"
  if (purpose == 3) return "LIQUIDITY_MINING"
  return "UNKNOWN"
}

// Helper function to get unstaking strategy as string
function getStrategyString(strategy: i32): string {
  if (strategy == 0) return "RAGE_QUIT"
  if (strategy == 1) return "STANDARD"
  if (strategy == 2) return "PATIENT"
  return "UNKNOWN"
}

// Helper function to get or create staking pool
function getOrCreateStakingPool(purpose: i32): StakingPool {
  let purposeString = getPurposeString(purpose)
  let pool = StakingPool.load(purposeString)

  if (pool == null) {
    pool = new StakingPool(purposeString)
    pool.purpose = purposeString
    pool.totalStaked = ZERO_BD
    pool.rewardRate = BigInt.fromI32(0)
    pool.totalRewardsDistributed = ZERO_BD
    pool.active = true
    pool.lastUpdateTime = BigInt.fromI32(0)
    pool.stakersCount = BigInt.fromI32(0)
    pool.averageStakeAmount = ZERO_BD
    pool.totalRewardsClaimed = ZERO_BD

    // Set default reward rates
    if (purpose == 0) pool.rewardRate = BigInt.fromI32(300) // 3% APY
    else if (purpose == 1) pool.rewardRate = BigInt.fromI32(800) // 8% APY
    else if (purpose == 2) pool.rewardRate = BigInt.fromI32(1200) // 12% APY
    else if (purpose == 3) pool.rewardRate = BigInt.fromI32(600) // 6% APY

    pool.save()
  }

  return pool
}

// Helper function to get or create user stake
function getOrCreateUserStake(user: Bytes, purpose: i32): UserStake {
  let id = user.toHex() + "-" + getPurposeString(purpose)
  let userStake = UserStake.load(id)

  if (userStake == null) {
    userStake = new UserStake(id)
    userStake.user = user
    userStake.pool = getPurposeString(purpose)
    userStake.amount = ZERO_BD
    userStake.stakedAt = BigInt.fromI32(0)
    userStake.lastClaimTime = BigInt.fromI32(0)
    userStake.preferredStrategy = "STANDARD"
    userStake.pendingRewards = ZERO_BD
    userStake.totalRewardsClaimed = ZERO_BD
    userStake.save()
  }

  return userStake
}

// Helper function to update global staking stats
function updateStakingStats(): void {
  let stats = StakingStats.load("global")
  if (stats == null) {
    stats = new StakingStats("global")
    stats.totalStaked = ZERO_BD
    stats.totalRewardsDistributed = ZERO_BD
    stats.totalRewardsClaimed = ZERO_BD
    stats.totalSlashed = ZERO_BD
    stats.activeStakers = BigInt.fromI32(0)
    stats.totalStakingPools = BigInt.fromI32(4) // We have 4 pools
  }

  // Recalculate totals from all pools
  let totalStaked = ZERO_BD
  let totalRewardsDistributed = ZERO_BD
  let totalRewardsClaimed = ZERO_BD

  let purposes = ["GOVERNANCE", "DAO_CREATION", "TREASURY_BOND", "LIQUIDITY_MINING"]
  for (let i = 0; i < purposes.length; i++) {
    let pool = StakingPool.load(purposes[i])
    if (pool != null) {
      totalStaked = totalStaked.plus(pool.totalStaked)
      totalRewardsDistributed = totalRewardsDistributed.plus(pool.totalRewardsDistributed)
      totalRewardsClaimed = totalRewardsClaimed.plus(pool.totalRewardsClaimed)
    }
  }

  stats.totalStaked = totalStaked
  stats.totalRewardsDistributed = totalRewardsDistributed
  stats.totalRewardsClaimed = totalRewardsClaimed
  stats.lastUpdated = BigInt.fromI32(0) // Will be set by caller
  stats.save()
}

export function handleStaked(event: Staked): void {
  let pool = getOrCreateStakingPool(event.params.purpose)
  let userStake = getOrCreateUserStake(event.params.user, event.params.purpose)

  let amount = toDecimal(event.params.amount)
  let strategy = getStrategyString(event.params.strategy)

  // Update user stake
  userStake.amount = userStake.amount.plus(amount)
  userStake.stakedAt = event.block.timestamp
  userStake.lastClaimTime = event.block.timestamp
  userStake.preferredStrategy = strategy
  userStake.save()

  // Update pool
  let wasNewStaker = userStake.amount.equals(amount) // First time staking
  pool.totalStaked = pool.totalStaked.plus(amount)
  pool.lastUpdateTime = event.block.timestamp

  if (wasNewStaker) {
    pool.stakersCount = pool.stakersCount.plus(ONE_BI)
  }

  // Recalculate average stake amount
  if (pool.stakersCount.gt(BigInt.fromI32(0))) {
    pool.averageStakeAmount = pool.totalStaked.div(pool.stakersCount.toBigDecimal())
  }

  pool.save()

  // Update global stats
  updateStakingStats()
  let stats = StakingStats.load("global")!
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
  let userStake = getOrCreateUserStake(event.params.user, event.params.purpose)

  let id = event.params.user.toHex() + "-" + event.params.requestId.toString()
  let request = new UnstakeRequest(id)

  request.userStake = userStake.id
  request.amount = toDecimal(event.params.amount)
  request.strategy = getStrategyString(event.params.strategy)
  request.requestTime = event.block.timestamp
  request.unlockTime = event.params.unlockTime
  request.processed = false
  request.penalty = ZERO_BD
  request.finalAmount = ZERO_BD
  request.requestTxHash = event.transaction.hash

  request.save()
}

export function handleUnstaked(event: Unstaked): void {
  let pool = getOrCreateStakingPool(event.params.purpose)
  let userStake = getOrCreateUserStake(event.params.user, event.params.purpose)

  let amount = toDecimal(event.params.amount)
  let penalty = toDecimal(event.params.penalty)
  let finalAmount = amount.minus(penalty)

  // Update user stake
  userStake.amount = userStake.amount.minus(amount)
  userStake.save()

  // Update pool
  pool.totalStaked = pool.totalStaked.minus(amount)
  pool.lastUpdateTime = event.block.timestamp

  // Check if user completely unstaked
  if (userStake.amount.equals(ZERO_BD)) {
    pool.stakersCount = pool.stakersCount.minus(ONE_BI)
  }

  // Recalculate average stake amount
  if (pool.stakersCount.gt(BigInt.fromI32(0))) {
    pool.averageStakeAmount = pool.totalStaked.div(pool.stakersCount.toBigDecimal())
  } else {
    pool.averageStakeAmount = ZERO_BD
  }

  pool.save()

  // Find and update the unstake request
  // Note: We'd need the requestId to find the exact request
  // For now, we'll update the most recent unprocessed request

  // Update global stats
  updateStakingStats()
  let stats = StakingStats.load("global")!
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let userStake = getOrCreateUserStake(event.params.user, event.params.purpose)
  let pool = getOrCreateStakingPool(event.params.purpose)

  let amount = toDecimal(event.params.amount)

  // Create reward claim record
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let claim = new RewardClaim(id)

  claim.userStake = userStake.id
  claim.amount = amount
  claim.strategyBonus = ZERO_BD // Calculate bonus if needed
  claim.totalAmount = amount
  claim.timestamp = event.block.timestamp
  claim.blockNumber = event.block.number
  claim.transactionHash = event.transaction.hash

  claim.save()

  // Update user stake
  userStake.totalRewardsClaimed = userStake.totalRewardsClaimed.plus(amount)
  userStake.lastClaimTime = event.block.timestamp
  userStake.pendingRewards = ZERO_BD // Reset pending rewards
  userStake.save()

  // Update pool
  pool.totalRewardsClaimed = pool.totalRewardsClaimed.plus(amount)
  pool.save()

  // Update global stats
  updateStakingStats()
  let stats = StakingStats.load("global")!
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleRewardsDistributed(event: RewardsDistributed): void {
  let pool = getOrCreateStakingPool(event.params.purpose)

  let amount = toDecimal(event.params.amount)

  // Create reward distribution record
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let distribution = new RewardDistribution(id)

  distribution.pool = pool.id
  distribution.amount = amount
  distribution.distributor = event.transaction.from
  distribution.timestamp = event.block.timestamp
  distribution.blockNumber = event.block.number
  distribution.transactionHash = event.transaction.hash

  distribution.save()

  // Update pool
  pool.totalRewardsDistributed = pool.totalRewardsDistributed.plus(amount)
  pool.lastUpdateTime = event.block.timestamp
  pool.save()

  // Update global stats
  updateStakingStats()
  let stats = StakingStats.load("global")!
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleSlashed(event: Slashed): void {
  let userStake = getOrCreateUserStake(event.params.user, event.params.purpose)
  let pool = getOrCreateStakingPool(event.params.purpose)

  let amount = toDecimal(event.params.amount)

  // Create slash event record
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let slashEvent = new SlashEvent(id)

  slashEvent.userStake = userStake.id
  slashEvent.amount = amount
  slashEvent.slasher = event.params.slasher
  slashEvent.reason = event.params.reason
  slashEvent.timestamp = event.block.timestamp
  slashEvent.blockNumber = event.block.number
  slashEvent.transactionHash = event.transaction.hash

  slashEvent.save()

  // Update user stake
  userStake.amount = userStake.amount.minus(amount)
  userStake.save()

  // Update pool
  pool.totalStaked = pool.totalStaked.minus(amount)
  pool.lastUpdateTime = event.block.timestamp

  // Check if user completely lost stake
  if (userStake.amount.equals(ZERO_BD)) {
    pool.stakersCount = pool.stakersCount.minus(ONE_BI)
  }

  // Recalculate average stake amount
  if (pool.stakersCount.gt(BigInt.fromI32(0))) {
    pool.averageStakeAmount = pool.totalStaked.div(pool.stakersCount.toBigDecimal())
  } else {
    pool.averageStakeAmount = ZERO_BD
  }

  pool.save()

  // Update global stats
  updateStakingStats()
  let stats = StakingStats.load("global")!
  stats.totalSlashed = stats.totalSlashed.plus(amount)
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handlePoolUpdated(event: PoolUpdated): void {
  let pool = getOrCreateStakingPool(event.params.purpose)

  // Create pool update record
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let update = new StakingPoolUpdate(id)

  update.pool = pool.id
  update.oldRewardRate = pool.rewardRate
  update.newRewardRate = event.params.newRewardRate
  update.active = event.params.active
  update.timestamp = event.block.timestamp
  update.blockNumber = event.block.number
  update.transactionHash = event.transaction.hash

  update.save()

  // Update pool
  pool.rewardRate = event.params.newRewardRate
  pool.active = event.params.active
  pool.lastUpdateTime = event.block.timestamp
  pool.save()
}
