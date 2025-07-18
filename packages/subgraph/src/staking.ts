import { BigInt, Address } from "@graphprotocol/graph-ts"
import { updateIndexingStatus } from './utils/indexing'
import {
  OrganizationStaked,
  OrganizationStakeWithdrawn,
  Staked,
  UnstakeRequested,
  Unstaked,
  RewardsClaimed,
  Slashed,
  GameStaking,
  RewardsDistributed,
  PoolUpdated
} from "../generated/GameStaking/GameStaking"
import {
  OrganizationStake,
  UserStake,
  UnstakeRequest,
  StakingPool,
  User,
  Organization,
  Transaction
} from "../generated/schema"

// Helper functions for staking purposes
function mapStakingPurpose(purpose: number): string {
  if (purpose == 0) return "GOVERNANCE"
  if (purpose == 1) return "DAO_CREATION"
  if (purpose == 2) return "TREASURY_BOND"
  if (purpose == 3) return "LIQUIDITY_MINING"
  return "GOVERNANCE" // Default
}

function mapUnstakingStrategy(strategy: number): string {
  if (strategy == 0) return "RAGE_QUIT"
  if (strategy == 1) return "STANDARD"
  if (strategy == 2) return "PATIENT"
  return "STANDARD" // Default
}

// Helper function to create or update User entity
function createOrUpdateUser(address: Address, timestamp: BigInt): void {
  let userId = address.toHex().toLowerCase()
  let user = User.load(userId)

  if (!user) {
    user = new User(userId)
    user.address = address
    user.totalOrganizations = BigInt.zero()
    user.totalMemberships = BigInt.zero()
    user.totalContributions = BigInt.zero()
    user.totalProposals = BigInt.zero()
    user.totalVotes = BigInt.zero()
    user.firstSeenAt = timestamp
  }

  user.lastActiveAt = timestamp
  user.save()
}

// Helper function to create or update StakingPool
function createOrUpdateStakingPool(purpose: string): void {
  let pool = StakingPool.load(purpose)

  if (!pool) {
    pool = new StakingPool(purpose)
    pool.purpose = purpose
    pool.totalStaked = BigInt.zero()
    pool.rewardRate = BigInt.zero()
    pool.totalRewardsDistributed = BigInt.zero()
    pool.active = true
    pool.save()
  }
}

export function handleOrganizationStaked(event: OrganizationStaked): void {
  let organizationId = event.params.organizationId.toHex()
  let stakerId = event.params.staker.toHex().toLowerCase()

  // Create or update user
  createOrUpdateUser(event.params.staker, event.params.timestamp)

  // Create OrganizationStake entity
  let stake = new OrganizationStake(organizationId)
  stake.organizationId = event.params.organizationId
  stake.staker = stakerId
  stake.amount = event.params.amount
  stake.stakedAt = event.params.timestamp
  stake.active = true
  stake.organization = organizationId
  stake.blockNumber = event.block.number
  stake.transaction = event.transaction.hash.toHex()

  stake.save()
}

export function handleOrganizationStakeWithdrawn(event: OrganizationStakeWithdrawn): void {
  let organizationId = event.params.organizationId.toHex()
  let stakerId = event.params.staker.toHex().toLowerCase()

  // Update user
  createOrUpdateUser(event.params.staker, event.params.timestamp)

  // Update OrganizationStake entity
  let stake = OrganizationStake.load(organizationId)
  if (stake) {
    stake.active = false
    stake.save()
  }
}

export function handleStaked(event: Staked): void {
  let userId = event.params.user.toHex().toLowerCase()
  let purpose = mapStakingPurpose(event.params.purpose)
  let stakeId = userId + "-" + purpose

  // Create or update user
  createOrUpdateUser(event.params.user, event.params.timestamp)

  // Create or update staking pool
  createOrUpdateStakingPool(purpose)

  // Create or update UserStake entity
  let stake = UserStake.load(stakeId)
  if (!stake) {
    stake = new UserStake(stakeId)
    stake.user = userId
    stake.purpose = purpose
    stake.amount = BigInt.zero()
    stake.stakedAt = event.params.timestamp
    stake.lastClaimTime = event.params.timestamp
    stake.preferredStrategy = mapUnstakingStrategy(event.params.strategy)
    stake.pendingRewards = BigInt.zero()
    stake.blockNumber = event.block.number
    stake.transaction = event.transaction.hash.toHex()
  }

  stake.amount = stake.amount.plus(event.params.amount)
  stake.save()

  // Update staking pool
  let pool = StakingPool.load(purpose)
  if (pool) {
    pool.totalStaked = pool.totalStaked.plus(event.params.amount)
    pool.save()
  }
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
  let userId = event.params.user.toHex().toLowerCase()
  let purpose = mapStakingPurpose(event.params.purpose)
  let requestId = userId + "-" + event.params.requestId.toString()

  // Create or update user
  createOrUpdateUser(event.params.user, event.block.timestamp)

  // Create UnstakeRequest entity
  let request = new UnstakeRequest(requestId)
  request.user = userId
  request.purpose = purpose
  request.amount = event.params.amount
  request.requestTime = event.block.timestamp
  request.strategy = mapUnstakingStrategy(event.params.strategy)
  request.processed = false
  request.blockNumber = event.block.number
  request.transaction = event.transaction.hash.toHex()

  request.save()
}

export function handleUnstaked(event: Unstaked): void {
  let userId = event.params.user.toHex().toLowerCase()
  let purpose = mapStakingPurpose(event.params.purpose)
  let stakeId = userId + "-" + purpose

  // Update user
  createOrUpdateUser(event.params.user, event.params.timestamp)

  // Update UserStake entity
  let stake = UserStake.load(stakeId)
  if (stake) {
    stake.amount = stake.amount.minus(event.params.amount)
    stake.save()
  }

  // Update staking pool
  let pool = StakingPool.load(purpose)
  if (pool) {
    pool.totalStaked = pool.totalStaked.minus(event.params.amount)
    pool.save()
  }
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  let userId = event.params.user.toHex().toLowerCase()
  let purpose = mapStakingPurpose(event.params.purpose)
  let stakeId = userId + "-" + purpose

  // Update user
  createOrUpdateUser(event.params.user, event.params.timestamp)

  // Update UserStake entity
  let stake = UserStake.load(stakeId)
  if (stake) {
    stake.lastClaimTime = event.params.timestamp
    stake.pendingRewards = BigInt.zero()
    stake.save()
  }

  // Update staking pool
  let pool = StakingPool.load(purpose)
  if (pool) {
    pool.totalRewardsDistributed = pool.totalRewardsDistributed.plus(event.params.amount)
    pool.save()
  }
}

export function handleSlashed(event: Slashed): void {
  let userId = event.params.user.toHex().toLowerCase()
  let purpose = mapStakingPurpose(event.params.purpose)
  let stakeId = userId + "-" + purpose

  // Update user
  createOrUpdateUser(event.params.user, event.params.timestamp)

  // Update UserStake entity
  let stake = UserStake.load(stakeId)
  if (stake) {
    stake.amount = stake.amount.minus(event.params.amount)
    stake.save()
  }

  // Update staking pool
  let pool = StakingPool.load(purpose)
  if (pool) {
    pool.totalStaked = pool.totalStaked.minus(event.params.amount)
    pool.save()
  }
}

export function handleRewardsDistributed(event: RewardsDistributed): void {
  updateIndexingStatus(event.block, 'RewardsDistributed')

    // Handle rewards distribution logic
  // Generic handling - actual parameters would depend on the event structure
  // let userStakeId = event.params.user.toHex()
  // let userStake = UserStake.load(userStakeId)

  // Basic transaction recording for now

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
}

export function handlePoolUpdated(event: PoolUpdated): void {
  updateIndexingStatus(event.block, 'PoolUpdated')

  // Handle pool update logic
  // Generic handling - actual parameters would depend on the event structure
  // let poolId = event.params.poolId.toString()
  // Pool entity handling would go here if we had a Pool entity in the schema

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
}
