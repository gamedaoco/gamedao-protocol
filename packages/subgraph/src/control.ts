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
  GlobalStats
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

// Helper function to create or update User entity
function createOrUpdateUser(address: Address, timestamp: BigInt): void {
  let userId = address.toHex().toLowerCase()
  let user = User.load(userId)

  if (!user) {
    user = new User(userId)
    user.address = address
    user.totalOrganizations = BigInt.zero()
    user.totalContributions = BigInt.zero()
    user.totalProposals = BigInt.zero()
    user.totalVotes = BigInt.zero()
    user.firstSeenAt = timestamp
  }

  user.lastActiveAt = timestamp
  user.save()
}

export function handleOrganizationCreated(event: OrganizationCreated): void {
  updateIndexingStatus(event.block, 'OrganizationCreated')

  let organizationId = getOrganizationIdString(event.params.id)
  let organization = new Organization(organizationId)

  // Get or create creator user
  let creatorId = event.params.creator.toHex()
  let creator = User.load(creatorId)
  if (!creator) {
    creator = new User(creatorId)
    creator.address = event.params.creator
    creator.totalOrganizations = BigInt.fromI32(0)
    creator.totalMemberships = BigInt.fromI32(0)
    creator.totalContributions = BigInt.fromI32(0)
    creator.totalProposals = BigInt.fromI32(0)
    creator.totalVotes = BigInt.fromI32(0)
    creator.firstSeenAt = event.block.timestamp
    creator.lastActiveAt = event.block.timestamp
  }
  creator.totalOrganizations = creator.totalOrganizations.plus(BigInt.fromI32(1))
  creator.lastActiveAt = event.block.timestamp
  creator.save()

  // Set organization data
  organization.name = event.params.name
  organization.metadataURI = "" // Will be set later if needed
  organization.creator = creatorId
  organization.treasuryAddress = event.params.treasury
  organization.orgType = "DAO" // Default, should be updated
  organization.accessModel = "OPEN" // Default, should be updated
  organization.feeModel = "NONE" // Default, should be updated
  organization.memberLimit = BigInt.fromI32(1000) // Default
  organization.memberCount = BigInt.fromI32(0)
  organization.totalCampaigns = BigInt.fromI32(0)
  organization.totalProposals = BigInt.fromI32(0)
  organization.membershipFee = BigInt.fromI32(0)
  organization.gameStakeRequired = BigInt.fromI32(0)
  organization.state = "ACTIVE" // Default
  organization.createdAt = event.params.timestamp
  organization.updatedAt = event.params.timestamp
  organization.blockNumber = event.block.number
  organization.transactionHash = event.transaction.hash

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

  // Link treasury to organization
  organization.treasury = treasuryId
  organization.save()

  // Start indexing the Treasury contract
  TreasuryTemplate.create(event.params.treasury)

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (!globalStats) {
    globalStats = new GlobalStats('global')
    globalStats.totalModules = BigInt.fromI32(0)
    globalStats.activeModules = BigInt.fromI32(0)
    globalStats.totalOrganizations = BigInt.fromI32(0)
    globalStats.activeOrganizations = BigInt.fromI32(0)
    globalStats.totalMembers = BigInt.fromI32(0)
    globalStats.totalCampaigns = BigInt.fromI32(0)
    globalStats.activeCampaigns = BigInt.fromI32(0)
    globalStats.totalRaised = BigDecimal.fromString("0")
    globalStats.totalProposals = BigInt.fromI32(0)
    globalStats.activeProposals = BigInt.fromI32(0)
    globalStats.totalVotes = BigInt.fromI32(0)
    globalStats.totalProfiles = BigInt.fromI32(0)
    globalStats.verifiedProfiles = BigInt.fromI32(0)
    globalStats.totalAchievements = BigInt.fromI32(0)
    globalStats.totalTokenTransfers = BigInt.fromI32(0)
    globalStats.totalTreasuryTransactions = BigInt.fromI32(0)
    globalStats.updatedAt = event.block.timestamp
  }
  globalStats.totalOrganizations = globalStats.totalOrganizations.plus(BigInt.fromI32(1))
  globalStats.activeOrganizations = globalStats.activeOrganizations.plus(BigInt.fromI32(1))
  globalStats.updatedAt = event.block.timestamp
  globalStats.save()
}

export function handleOrganizationStateChanged(event: OrganizationStateChanged): void {
  updateIndexingStatus(event.block, 'OrganizationStateChanged')

  let organizationId = getOrganizationIdString(event.params.id)
  let organization = Organization.load(organizationId)

  if (!organization) {
    return
  }

  // Update organization state
  let oldState = organization.state
  organization.state = mapOrgState(event.params.newState)
  organization.updatedAt = event.params.timestamp
  organization.save()

  // Update global stats for active organizations
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    if (oldState != "ACTIVE" && organization.state == "ACTIVE") {
      globalStats.activeOrganizations = globalStats.activeOrganizations.plus(BigInt.fromI32(1))
    } else if (oldState == "ACTIVE" && organization.state != "ACTIVE") {
      globalStats.activeOrganizations = globalStats.activeOrganizations.minus(BigInt.fromI32(1))
    }
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }
}

export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  updateIndexingStatus(event.block, 'StakeWithdrawn')

  let organizationId = getOrganizationIdString(event.params.organizationId)
  let organization = Organization.load(organizationId)

  if (!organization) {
    return
  }

  // Get or create staker user
  let stakerId = event.params.staker.toHex()
  let staker = User.load(stakerId)
  if (!staker) {
    staker = new User(stakerId)
    staker.address = event.params.staker
    staker.totalOrganizations = BigInt.fromI32(0)
    staker.totalMemberships = BigInt.fromI32(0)
    staker.totalContributions = BigInt.fromI32(0)
    staker.totalProposals = BigInt.fromI32(0)
    staker.totalVotes = BigInt.fromI32(0)
    staker.firstSeenAt = event.block.timestamp
    staker.lastActiveAt = event.block.timestamp
  }
  staker.lastActiveAt = event.block.timestamp
  staker.save()

  // Update organization stake if it exists
  let organizationStake = OrganizationStake.load(organizationId)
  if (organizationStake) {
    organizationStake.active = false
    organizationStake.save()
  }
}

export function handleMemberAdded(event: MemberAdded): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'MemberAdded')

  let orgId = getOrganizationIdString(event.params.organizationId)
  let memberId = orgId + "-" + event.params.member.toHex()

  // Create or load user
  let userId = event.params.member.toHex().toLowerCase()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.member
    user.totalOrganizations = BigInt.zero()
    user.totalContributions = BigInt.zero()
    user.totalProposals = BigInt.zero()
    user.totalVotes = BigInt.zero()
    user.firstSeenAt = event.params.timestamp
  }
  user.lastActiveAt = event.params.timestamp
  user.save()

  let member = new Member(memberId)
  member.organization = orgId
  member.user = userId
  member.address = event.params.member
  member.state = "ACTIVE"
  member.role = "MEMBER"
  member.fee = BigInt.zero()
  member.joinedAt = event.params.timestamp
  member.blockNumber = event.block.number
  member.transactionHash = event.transaction.hash
  member.save()

  // Update organization member count
  let organization = Organization.load(orgId)
  if (organization) {
    organization.memberCount = organization.memberCount.plus(BigInt.fromI32(1))
    organization.updatedAt = event.params.timestamp
    organization.save()
  }
}

export function handleMemberRemoved(event: MemberRemoved): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'MemberRemoved')

  let orgId = getOrganizationIdString(event.params.organizationId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member) {
    member.state = "INACTIVE"
    member.removedAt = event.params.timestamp
    member.save()
  }

  // Update organization member count
  let organization = Organization.load(orgId)
  if (organization) {
    organization.memberCount = organization.memberCount.minus(BigInt.fromI32(1))
    organization.updatedAt = event.params.timestamp
    organization.save()
  }
}

export function handleMemberStateChanged(event: MemberStateChanged): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'MemberStateChanged')

  let orgId = getOrganizationIdString(event.params.organizationId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member) {
    // Update member state based on newState parameter
    // Note: We'd need to map the enum values properly
    member.save()
  }
}
