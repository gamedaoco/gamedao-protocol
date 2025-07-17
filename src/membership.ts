import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  MemberAdded,
  MemberRemoved,
  MemberStateUpdated,
  MemberTierUpdated,
  VotingPowerUpdated,
  VotingDelegated,
  VotingUndelegated,
} from '../generated/Membership/Membership'
import {
  Member,
  Organization,
  VotingDelegation,
  User,
  GlobalStats,
  Transaction,
} from '../generated/schema'
import { updateIndexingStatus } from './utils/indexing'

export function handleMemberAdded(event: MemberAdded): void {
  updateIndexingStatus(event.block, 'MemberAdded')

  let memberId = event.params.organizationId.toHex() + '-' + event.params.memberAddress.toHex()
  let member = new Member(memberId)

  // Load organization
  let organizationId = event.params.organizationId.toHex()
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Get or create user
  let userId = event.params.memberAddress.toHex()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.memberAddress
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.totalMemberships = user.totalMemberships.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set member data
  member.organization = organizationId
  member.user = userId
  member.state = event.params.state
  member.joinedAt = event.params.joinedAt
  member.reputation = event.params.reputation
  member.stake = BigInt.fromI32(0)

  // Transaction tracking
  member.blockNumber = event.block.number
  member.transactionHash = event.transaction.hash

  member.save()

  // Update organization member count
  organization.memberCount = organization.memberCount.plus(BigInt.fromI32(1))
  organization.save()

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (!globalStats) {
    globalStats = new GlobalStats('global')
    globalStats.totalModules = BigInt.fromI32(0)
    globalStats.activeModules = BigInt.fromI32(0)
    globalStats.totalOrganizations = BigInt.fromI32(0)
    globalStats.activeOrganizations = BigInt.fromI32(0)
    globalStats.totalMembers = BigInt.fromI32(0)
    globalStats.totalActiveMemberships = BigInt.fromI32(0)
    globalStats.totalCampaigns = BigInt.fromI32(0)
    globalStats.activeCampaigns = BigInt.fromI32(0)
    globalStats.totalRaised = BigInt.fromI32(0).toBigDecimal()
    globalStats.totalProposals = BigInt.fromI32(0)
    globalStats.activeProposals = BigInt.fromI32(0)
    globalStats.totalVotes = BigInt.fromI32(0)
    globalStats.totalProfiles = BigInt.fromI32(0)
    globalStats.verifiedProfiles = BigInt.fromI32(0)
    globalStats.totalVotingPower = BigInt.fromI32(0)
    globalStats.totalDelegations = BigInt.fromI32(0)
    globalStats.updatedAt = event.block.timestamp
  }
  globalStats.totalMembers = globalStats.totalMembers.plus(BigInt.fromI32(1))
  if (event.params.state == 1) { // ACTIVE
    globalStats.totalActiveMemberships = globalStats.totalActiveMemberships.plus(BigInt.fromI32(1))
  }
  globalStats.updatedAt = event.block.timestamp
  globalStats.save()

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = event.transaction.gasUsed
  transaction.gasPrice = event.transaction.gasPrice
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
}

export function handleMemberRemoved(event: MemberRemoved): void {
  updateIndexingStatus(event.block, 'MemberRemoved')

  let memberId = event.params.organizationId.toHex() + '-' + event.params.memberAddress.toHex()
  let member = Member.load(memberId)

  if (!member) {
    log.error('Member not found: {}', [memberId])
    return
  }

  // Update organization member count
  let organization = Organization.load(member.organization)
  if (organization) {
    organization.memberCount = organization.memberCount.minus(BigInt.fromI32(1))
    organization.save()
  }

  // Update user
  let user = User.load(member.user)
  if (user) {
    user.totalMemberships = user.totalMemberships.minus(BigInt.fromI32(1))
    user.save()
  }

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    globalStats.totalMembers = globalStats.totalMembers.minus(BigInt.fromI32(1))
    if (member.state == 1) { // ACTIVE
      globalStats.totalActiveMemberships = globalStats.totalActiveMemberships.minus(BigInt.fromI32(1))
    }
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }

  // Remove member entity
  // Note: In practice, you might want to keep the entity but mark it as removed
  // store.remove('Member', memberId)
}

export function handleMemberStateUpdated(event: MemberStateUpdated): void {
  updateIndexingStatus(event.block, 'MemberStateUpdated')

  let memberId = event.params.organizationId.toHex() + '-' + event.params.memberAddress.toHex()
  let member = Member.load(memberId)

  if (!member) {
    log.error('Member not found: {}', [memberId])
    return
  }

  let oldState = member.state
  member.state = event.params.newState
  member.save()

  // Update global stats for active membership changes
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    if (oldState != 1 && event.params.newState == 1) { // Became active
      globalStats.totalActiveMemberships = globalStats.totalActiveMemberships.plus(BigInt.fromI32(1))
    } else if (oldState == 1 && event.params.newState != 1) { // No longer active
      globalStats.totalActiveMemberships = globalStats.totalActiveMemberships.minus(BigInt.fromI32(1))
    }
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }
}

export function handleMemberTierUpdated(event: MemberTierUpdated): void {
  updateIndexingStatus(event.block, 'MemberTierUpdated')

  let memberId = event.params.organizationId.toHex() + '-' + event.params.memberAddress.toHex()
  let member = Member.load(memberId)

  if (!member) {
    log.error('Member not found: {}', [memberId])
    return
  }

  // Member tier changes would be tracked if we had tier field in schema
  // For now, just update the member entity
  member.save()
}

export function handleVotingPowerUpdated(event: VotingPowerUpdated): void {
  updateIndexingStatus(event.block, 'VotingPowerUpdated')

  let memberId = event.params.organizationId.toHex() + '-' + event.params.memberAddress.toHex()
  let member = Member.load(memberId)

  if (!member) {
    log.error('Member not found: {}', [memberId])
    return
  }

  // Update global voting power stats
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    globalStats.totalVotingPower = globalStats.totalVotingPower.plus(event.params.newVotingPower.minus(event.params.oldVotingPower))
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }
}

export function handleVotingDelegated(event: VotingDelegated): void {
  updateIndexingStatus(event.block, 'VotingDelegated')

  let delegationId = event.params.organizationId.toHex() + '-' + event.params.delegator.toHex() + '-' + event.params.delegatee.toHex() + '-' + event.params.timestamp.toString()
  let delegation = new VotingDelegation(delegationId)

  // Load organization
  let organizationId = event.params.organizationId.toHex()
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Load delegator member
  let delegatorId = organizationId + '-' + event.params.delegator.toHex()
  let delegator = Member.load(delegatorId)
  if (!delegator) {
    log.error('Delegator member not found: {}', [delegatorId])
    return
  }

  // Load delegatee member
  let delegateeId = organizationId + '-' + event.params.delegatee.toHex()
  let delegatee = Member.load(delegateeId)
  if (!delegatee) {
    log.error('Delegatee member not found: {}', [delegateeId])
    return
  }

  delegation.organization = organizationId
  delegation.delegator = delegatorId
  delegation.delegatee = delegateeId
  delegation.amount = event.params.amount
  delegation.timestamp = event.params.timestamp
  delegation.active = true
  delegation.blockNumber = event.block.number
  delegation.transactionHash = event.transaction.hash

  delegation.save()

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    globalStats.totalDelegations = globalStats.totalDelegations.plus(BigInt.fromI32(1))
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }
}

export function handleVotingUndelegated(event: VotingUndelegated): void {
  updateIndexingStatus(event.block, 'VotingUndelegated')

  // Find and deactivate the delegation
  // This would require querying existing delegations, which is more complex
  // For now, we'll create a new delegation record with negative amount
  let delegationId = event.params.organizationId.toHex() + '-' + event.params.delegator.toHex() + '-' + event.params.delegatee.toHex() + '-' + event.params.timestamp.toString()
  let delegation = new VotingDelegation(delegationId)

  delegation.organization = event.params.organizationId.toHex()
  delegation.delegator = event.params.organizationId.toHex() + '-' + event.params.delegator.toHex()
  delegation.delegatee = event.params.organizationId.toHex() + '-' + event.params.delegatee.toHex()
  delegation.amount = BigInt.fromI32(0).minus(event.params.amount)
  delegation.timestamp = event.params.timestamp
  delegation.active = false
  delegation.blockNumber = event.block.number
  delegation.transactionHash = event.transaction.hash

  delegation.save()
}
