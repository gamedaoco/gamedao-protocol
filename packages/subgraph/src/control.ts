import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"
import {
  OrganizationCreated,
  OrganizationStateChanged,
  StakeWithdrawn,
  Control
} from "../generated/Control/Control"
import {
  Organization,
  OrganizationStake,
  Treasury,
  User,
  GlobalStats,
  Transaction
} from "../generated/schema"
import { Treasury as TreasuryTemplate } from "../generated/templates"
import { updateIndexingStatus } from "./utils/indexing"
import { getOrganizationIdString } from "./utils/ids"

// Helper functions to map enum values
function mapOrgType(orgType: number): string {
  if (orgType == 0) return "INDIVIDUAL"
  if (orgType == 1) return "COMPANY"
  if (orgType == 2) return "DAO"
  if (orgType == 3) return "HYBRID"
  return "DAO" // Default
}

function mapOrgState(state: number): string {
  if (state == 0) return "INACTIVE"
  if (state == 1) return "ACTIVE"
  if (state == 2) return "LOCKED"
  if (state == 3) return "DISSOLVED"
  return "ACTIVE" // Default
}

function mapAccessModel(accessModel: number): string {
  if (accessModel == 0) return "OPEN"
  if (accessModel == 1) return "VOTING"
  if (accessModel == 2) return "INVITE"
  return "OPEN" // Default
}

function mapFeeModel(feeModel: number): string {
  if (feeModel == 0) return "NONE"
  if (feeModel == 1) return "FIXED"
  if (feeModel == 2) return "PERCENTAGE"
  return "NONE" // Default
}

// Helper function to create or update User entity
function createOrUpdateUser(address: Address, timestamp: BigInt): void {
  let userId = address.toHex().toLowerCase()
  let user = User.load(userId)

  if (!user) {
    user = new User(userId)
    user.address = address
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = timestamp
    user.lastActiveAt = timestamp
  } else {
    user.lastActiveAt = timestamp
  }
  user.save()
}

export function handleOrganizationCreated(event: OrganizationCreated): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationCreated')

  let organizationId = getOrganizationIdString(event.params.id)
  let organization = new Organization(organizationId)

  // Set organization properties
  organization.name = event.params.name
  organization.metadataURI = ""
  organization.creator = event.params.creator.toHex()
  organization.treasuryAddress = event.params.treasury
  organization.orgType = mapOrgType(0) // Default to INDIVIDUAL
  organization.accessModel = mapAccessModel(0) // Default to OPEN
  organization.feeModel = mapFeeModel(0) // Default to NONE
  organization.memberLimit = BigInt.fromI32(0)
  organization.memberCount = BigInt.fromI32(0)
  organization.totalCampaigns = BigInt.fromI32(0)
  organization.totalProposals = BigInt.fromI32(0)
  organization.membershipFee = BigInt.fromI32(0)
  organization.gameStakeRequired = BigInt.fromI32(0)
  organization.state = "ACTIVE" // Default
  organization.createdAt = event.params.timestamp
  organization.updatedAt = event.params.timestamp
  organization.blockNumber = event.block.number
  organization.transaction = event.transaction.hash.toHex()

  organization.save()

  // Create Treasury entity
  let treasuryId = event.params.treasury.toHex()
  let treasury = new Treasury(treasuryId)
  treasury.organization = organizationId
  treasury.address = event.params.treasury
  treasury.createdAt = event.params.timestamp
  treasury.lastActivityAt = event.params.timestamp
  treasury.totalDeposits = BigDecimal.fromString("0")
  treasury.totalSpent = BigDecimal.fromString("0")
  treasury.save()

  // Create Treasury template instance for dynamic contract indexing
  TreasuryTemplate.create(event.params.treasury)

  // Create or update user
  createOrUpdateUser(event.params.creator, event.params.timestamp)

  // Update user's organization count
  let userId = event.params.creator.toHex().toLowerCase()
  let user = User.load(userId)
  if (user) {
    user.totalOrganizations = user.totalOrganizations.plus(BigInt.fromI32(1))
    user.save()
  }

  // Create Transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  // Update global stats
  let stats = GlobalStats.load("global")
  if (!stats) {
    stats = new GlobalStats("global")
    stats.totalModules = BigInt.fromI32(0)
    stats.activeModules = BigInt.fromI32(0)
    stats.totalOrganizations = BigInt.fromI32(0)
    stats.activeOrganizations = BigInt.fromI32(0)
    stats.totalMembers = BigInt.fromI32(0)
    stats.totalCampaigns = BigInt.fromI32(0)
    stats.activeCampaigns = BigInt.fromI32(0)
    stats.totalRaised = BigDecimal.fromString("0")
    stats.totalProposals = BigInt.fromI32(0)
    stats.activeProposals = BigInt.fromI32(0)
    stats.totalVotes = BigInt.fromI32(0)
    stats.totalProfiles = BigInt.fromI32(0)
    stats.verifiedProfiles = BigInt.fromI32(0)
    stats.totalAchievements = BigInt.fromI32(0)
    stats.totalTokenTransfers = BigInt.fromI32(0)
    stats.totalTreasuryTransactions = BigInt.fromI32(0)
    stats.updatedAt = event.block.timestamp
  }
  stats.totalOrganizations = stats.totalOrganizations.plus(BigInt.fromI32(1))
  stats.activeOrganizations = stats.activeOrganizations.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleOrganizationStateChanged(event: OrganizationStateChanged): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationStateChanged')

  let organizationId = getOrganizationIdString(event.params.id)
  let organization = Organization.load(organizationId)

  if (organization) {
    let oldState = organization.state
    organization.state = mapOrgState(event.params.newState)
    organization.updatedAt = event.params.timestamp
    organization.blockNumber = event.block.number
    organization.transaction = event.transaction.hash.toHex()
    organization.save()

    // Update global stats if state changed from/to ACTIVE
    let stats = GlobalStats.load("global")
    if (stats) {
      if (oldState != "ACTIVE" && organization.state == "ACTIVE") {
        stats.activeOrganizations = stats.activeOrganizations.plus(BigInt.fromI32(1))
      } else if (oldState == "ACTIVE" && organization.state != "ACTIVE") {
        stats.activeOrganizations = stats.activeOrganizations.minus(BigInt.fromI32(1))
      }
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }
}

export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'StakeWithdrawn')

  let organizationId = getOrganizationIdString(event.params.organizationId)
  let stakerId = event.params.staker.toHex().toLowerCase()

  // Create or update user
  createOrUpdateUser(event.params.staker, event.block.timestamp)

  // Update user's last activity
  let staker = User.load(stakerId)
  if (staker) {
    staker.lastActiveAt = event.block.timestamp
    staker.save()
  }

  // Update organization stake if it exists
  let organizationStake = OrganizationStake.load(organizationId)
  if (organizationStake) {
    organizationStake.active = false
    organizationStake.blockNumber = event.block.number
    organizationStake.transaction = event.transaction.hash.toHex()
    organizationStake.save()
  }
}
