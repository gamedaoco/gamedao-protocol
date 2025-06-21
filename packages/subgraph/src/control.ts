import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"
import {
  OrganizationCreated,
  OrganizationUpdated,
  OrganizationStateChanged,
  MemberAdded,
  MemberRemoved,
  MemberStateChanged,
  MembershipFeeUpdated
} from "../generated/Control/Control"
import {
  Organization,
  Member,
  Treasury,
  StakeEvent,
  GlobalStats
} from "../generated/schema"

export function handleOrganizationCreated(event: OrganizationCreated): void {
  let orgId = event.params.organizationId.toHex()
  let organization = new Organization(orgId)

  organization.prime = event.params.prime
  organization.name = event.params.name
  organization.accessModel = getAccessModelString(event.params.accessModel)
  organization.state = "ACTIVE"
  organization.feeModel = event.params.feeModel
  organization.createdAt = event.block.timestamp
  organization.updatedAt = event.block.timestamp

  // Initialize counters
  organization.memberCount = BigInt.fromI32(0)
  organization.activeMembers = BigInt.fromI32(0)
  organization.totalCampaigns = BigInt.fromI32(0)
  organization.totalProposals = BigInt.fromI32(0)

  // Create treasury entity
  let treasuryId = event.params.treasury.toHex()
  let treasury = new Treasury(treasuryId)
  treasury.organization = orgId
  treasury.address = event.params.treasury
  treasury.ethBalance = BigDecimal.fromString("0")
  treasury.totalDeposits = BigDecimal.fromString("0")
  treasury.totalWithdrawals = BigDecimal.fromString("0")
  treasury.dailyLimit = BigDecimal.fromString("0")
  treasury.lastSpendingReset = BigInt.fromI32(0)
  treasury.todaySpent = BigDecimal.fromString("0")
  treasury.save()

  organization.treasury = treasuryId
  organization.save()

  // Add prime member
  let primeMemberId = orgId + "-" + event.params.prime.toHex()
  let primeMember = new Member(primeMemberId)
  primeMember.organization = orgId
  primeMember.address = event.params.prime
  primeMember.state = "ACTIVE"
  primeMember.joinedAt = event.block.timestamp
  primeMember.updatedAt = event.block.timestamp
  primeMember.contributionsCount = BigInt.fromI32(0)
  primeMember.proposalsCount = BigInt.fromI32(0)
  primeMember.votesCount = BigInt.fromI32(0)
  primeMember.save()

  // Update organization member count
  organization.memberCount = BigInt.fromI32(1)
  organization.activeMembers = BigInt.fromI32(1)
  organization.save()

  updateGlobalStats()
}

export function handleOrganizationUpdated(event: OrganizationUpdated): void {
  let orgId = event.params.organizationId.toHex()
  let organization = Organization.load(orgId)

  if (organization != null) {
    organization.name = event.params.name
    organization.accessModel = getAccessModelString(event.params.accessModel)
    organization.updatedAt = event.block.timestamp
    organization.save()
  }
}

export function handleOrganizationStateChanged(event: OrganizationStateChanged): void {
  let orgId = event.params.organizationId.toHex()
  let organization = Organization.load(orgId)

  if (organization != null) {
    organization.state = getOrganizationStateString(event.params.newState)
    organization.updatedAt = event.block.timestamp
    organization.save()
  }

  updateGlobalStats()
}

export function handleMemberAdded(event: MemberAdded): void {
  let orgId = event.params.organizationId.toHex()
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = new Member(memberId)
  member.organization = orgId
  member.address = event.params.member
  member.state = getMemberStateString(event.params.state)
  member.joinedAt = event.block.timestamp
  member.updatedAt = event.block.timestamp
  member.contributionsCount = BigInt.fromI32(0)
  member.proposalsCount = BigInt.fromI32(0)
  member.votesCount = BigInt.fromI32(0)
  member.save()

  // Update organization member count
  let organization = Organization.load(orgId)
  if (organization != null) {
    organization.memberCount = organization.memberCount.plus(BigInt.fromI32(1))
    if (member.state == "ACTIVE") {
      organization.activeMembers = organization.activeMembers.plus(BigInt.fromI32(1))
    }
    organization.save()
  }

  updateGlobalStats()
}

export function handleMemberRemoved(event: MemberRemoved): void {
  let orgId = event.params.organizationId.toHex()
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member != null) {
    let wasActive = member.state == "ACTIVE"
    member.state = "NONE"
    member.updatedAt = event.block.timestamp
    member.save()

    // Update organization member count
    let organization = Organization.load(orgId)
    if (organization != null) {
      organization.memberCount = organization.memberCount.minus(BigInt.fromI32(1))
      if (wasActive) {
        organization.activeMembers = organization.activeMembers.minus(BigInt.fromI32(1))
      }
      organization.save()
    }
  }

  updateGlobalStats()
}

export function handleMemberStateChanged(event: MemberStateChanged): void {
  let orgId = event.params.organizationId.toHex()
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member != null) {
    let wasActive = member.state == "ACTIVE"
    let oldState = member.state
    member.state = getMemberStateString(event.params.newState)
    member.updatedAt = event.block.timestamp
    member.save()

    // Update organization active member count
    let organization = Organization.load(orgId)
    if (organization != null) {
      if (wasActive && member.state != "ACTIVE") {
        organization.activeMembers = organization.activeMembers.minus(BigInt.fromI32(1))
      } else if (!wasActive && member.state == "ACTIVE") {
        organization.activeMembers = organization.activeMembers.plus(BigInt.fromI32(1))
      }
      organization.save()
    }
  }
}

export function handleStakeRequired(event: StakeRequired): void {
  let orgId = event.params.organizationId.toHex()
  let stakeId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let stakeEvent = new StakeEvent(stakeId)
  stakeEvent.organization = orgId
  stakeEvent.member = Address.fromString("0x0000000000000000000000000000000000000000") // System event
  stakeEvent.amount = event.params.amount.toBigDecimal()
  stakeEvent.reason = "Stake requirement updated"
  stakeEvent.timestamp = event.block.timestamp
  stakeEvent.blockNumber = event.block.number
  stakeEvent.transactionHash = event.transaction.hash
  stakeEvent.save()
}

export function handleMembershipFeeUpdated(event: MembershipFeeUpdated): void {
  let orgId = event.params.organizationId.toHex()
  let organization = Organization.load(orgId)

  if (organization != null) {
    // Update organization with new fee information
    organization.updatedAt = event.block.timestamp
    organization.save()
  }
}

// Helper functions
function getAccessModelString(accessModel: i32): string {
  if (accessModel == 0) return "OPEN"
  if (accessModel == 1) return "VOTING"
  if (accessModel == 2) return "INVITE"
  return "OPEN"
}

function getOrganizationStateString(state: i32): string {
  if (state == 0) return "INACTIVE"
  if (state == 1) return "ACTIVE"
  if (state == 2) return "LOCKED"
  return "INACTIVE"
}

function getMemberStateString(state: i32): string {
  if (state == 0) return "NONE"
  if (state == 1) return "PENDING"
  if (state == 2) return "ACTIVE"
  if (state == 3) return "INACTIVE"
  if (state == 4) return "KICKED"
  return "NONE"
}

function updateGlobalStats(): void {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalModules = BigInt.fromI32(0)
    stats.activeModules = BigInt.fromI32(0)
    stats.totalOrganizations = BigInt.fromI32(0)
    stats.activeOrganizations = BigInt.fromI32(0)
    stats.totalMembers = BigInt.fromI32(0)
    stats.totalCampaigns = BigInt.fromI32(0)
    stats.activeCampaigns = BigInt.fromI32(0)
    stats.totalRaised = BigInt.fromI32(0).toBigDecimal()
    stats.totalProposals = BigInt.fromI32(0)
    stats.activeProposals = BigInt.fromI32(0)
    stats.totalVotes = BigInt.fromI32(0)
    stats.totalProfiles = BigInt.fromI32(0)
    stats.verifiedProfiles = BigInt.fromI32(0)
    stats.totalAchievements = BigInt.fromI32(0)
  }

  stats.updatedAt = BigInt.fromI32(0) // Will be set by block timestamp
  stats.save()
}
