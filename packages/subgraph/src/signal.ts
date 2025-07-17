import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProposalCreated,
  ProposalCreatedHierarchical,
  VoteCast,
  VoteCastHierarchical,
  ProposalExecuted,
  ProposalExecutedHierarchical,
  ProposalCanceled,
  ProposalCanceledHierarchical,
  VotingPowerDelegated,
  VotingPowerUndelegated,
} from '../generated/Signal/Signal'
import {
  Proposal,
  Vote,
  Delegation,
  Organization,
  Member,
  User,
} from '../generated/schema'
import { getOrganizationIdString } from './utils/ids'

// Handle hierarchical proposal creation (new format)
export function handleProposalCreatedHierarchical(event: ProposalCreatedHierarchical): void {
  let proposalId = event.params.hierarchicalId
  let proposal = new Proposal(proposalId)

  // Load organization
  let organizationId = getOrganizationIdString(event.params.organizationId)
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Load or create user
  let userId = event.params.creator.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.creator
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.totalProposals = user.totalProposals.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set proposal data
  proposal.organization = organizationId
  proposal.creator = userId
  proposal.title = event.params.title
  proposal.description = '' // Will be updated if needed
  proposal.metadataURI = ''
  proposal.proposalType = getProposalType(BigInt.fromI32(event.params.proposalType))
  proposal.votingType = getVotingType(BigInt.fromI32(event.params.votingType))
  proposal.votingPower = 'DEMOCRATIC' // Default for now
  proposal.state = 'PENDING'
  proposal.startTime = event.params.startTime
  proposal.endTime = event.params.endTime
  proposal.executionTime = event.params.endTime // Will be updated if needed
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  proposal.totalVotes = BigInt.fromI32(0)
  proposal.quorumReached = false
  proposal.createdAt = event.block.timestamp
  proposal.executedAt = BigInt.fromI32(0)
  proposal.executor = null
  proposal.blockNumber = event.block.number
  proposal.transactionHash = event.transaction.hash

  proposal.save()

  // Update organization stats
  organization.totalProposals = organization.totalProposals.plus(BigInt.fromI32(1))
  organization.updatedAt = event.block.timestamp
  organization.save()

  log.info('Hierarchical proposal created: {} for organization: {}', [proposalId, organizationId])
}

// Handle legacy proposal creation (old format)
export function handleProposalCreated(event: ProposalCreated): void {
  let proposalId = event.params.hierarchicalId
  let proposal = new Proposal(proposalId)

  // Load organization
  let organizationId = getOrganizationIdString(event.params.organizationId)
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Load or create user
  let userId = event.params.creator.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.creator
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.totalProposals = user.totalProposals.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set proposal data
  proposal.organization = organizationId
  proposal.creator = userId
  proposal.title = event.params.title
  proposal.description = '' // Will be updated if needed
  proposal.metadataURI = ''
  proposal.proposalType = getProposalType(BigInt.fromI32(event.params.proposalType))
  proposal.votingType = getVotingType(BigInt.fromI32(event.params.votingType))
  proposal.votingPower = 'DEMOCRATIC' // Default for now
  proposal.state = 'PENDING'
  proposal.startTime = event.params.startTime
  proposal.endTime = event.params.endTime
  proposal.executionTime = event.params.endTime // Will be updated if needed
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  proposal.totalVotes = BigInt.fromI32(0)
  proposal.quorumReached = false
  proposal.createdAt = event.block.timestamp
  proposal.executedAt = BigInt.fromI32(0)
  proposal.executor = null
  proposal.blockNumber = event.block.number
  proposal.transactionHash = event.transaction.hash

  proposal.save()

  // Update organization stats
  organization.totalProposals = organization.totalProposals.plus(BigInt.fromI32(1))
  organization.updatedAt = event.block.timestamp
  organization.save()

  log.info('Legacy proposal created: {} for organization: {}', [proposalId, organizationId])
}

// Handle hierarchical vote casting (new format)
export function handleVoteCastHierarchical(event: VoteCastHierarchical): void {
  let proposalId = event.params.hierarchicalId
  let voterAddress = event.params.voter.toHexString()
  let voteId = proposalId + '-' + voterAddress

  let vote = new Vote(voteId)
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found for vote: {}', [proposalId])
    return
  }

  // Load or create user
  let userId = event.params.voter.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.voter
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set vote data
  vote.proposal = proposalId
  vote.voter = userId
  vote.choice = getVoteChoice(BigInt.fromI32(event.params.choice))
  vote.votingPower = event.params.votingPower
  vote.timestamp = event.block.timestamp
  vote.reason = event.params.reason
  vote.convictionTime = BigInt.fromI32(0) // Default
  vote.convictionMultiplier = BigInt.fromI32(1) // Default
  vote.blockNumber = event.block.number
  vote.transactionHash = event.transaction.hash

  vote.save()

  // Update proposal vote counts
  if (event.params.choice == 2) { // FOR
    proposal.forVotes = proposal.forVotes.plus(event.params.votingPower)
  } else if (event.params.choice == 1) { // AGAINST
    proposal.againstVotes = proposal.againstVotes.plus(event.params.votingPower)
  } else if (event.params.choice == 3) { // ABSTAIN
    proposal.abstainVotes = proposal.abstainVotes.plus(event.params.votingPower)
  }

  proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
  proposal.save()

  log.info('Hierarchical vote cast: {} on proposal {} with power {}', [
    voterAddress,
    proposalId,
    event.params.votingPower.toString()
  ])
}

// Handle legacy vote casting (old format)
export function handleVoteCast(event: VoteCast): void {
  let proposalId = event.params.hierarchicalId
  let voterAddress = event.params.voter.toHexString()
  let voteId = proposalId + '-' + voterAddress

  let vote = new Vote(voteId)
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found for vote: {}', [proposalId])
    return
  }

  // Load or create user
  let userId = event.params.voter.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.voter
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set vote data
  vote.proposal = proposalId
  vote.voter = userId
  vote.choice = getVoteChoice(BigInt.fromI32(event.params.choice))
  vote.votingPower = event.params.votingPower
  vote.timestamp = event.block.timestamp
  vote.reason = event.params.reason
  vote.convictionTime = BigInt.fromI32(0) // Default
  vote.convictionMultiplier = BigInt.fromI32(1) // Default
  vote.blockNumber = event.block.number
  vote.transactionHash = event.transaction.hash

  vote.save()

  // Update proposal vote counts
  if (event.params.choice == 2) { // FOR
    proposal.forVotes = proposal.forVotes.plus(event.params.votingPower)
  } else if (event.params.choice == 1) { // AGAINST
    proposal.againstVotes = proposal.againstVotes.plus(event.params.votingPower)
  } else if (event.params.choice == 3) { // ABSTAIN
    proposal.abstainVotes = proposal.abstainVotes.plus(event.params.votingPower)
  }

  proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
  proposal.save()

  log.info('Legacy vote cast: {} on proposal {} with power {}', [
    voterAddress,
    proposalId,
    event.params.votingPower.toString()
  ])
}

// Handle hierarchical proposal execution (new format)
export function handleProposalExecutedHierarchical(event: ProposalExecutedHierarchical): void {
  let proposalId = event.params.hierarchicalId
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'EXECUTED'
  proposal.executedAt = event.block.timestamp
  proposal.executor = event.params.executor
  proposal.save()

  log.info('Hierarchical proposal executed: {} by {} success: {}', [
    proposalId,
    event.params.executor.toHexString(),
    event.params.success.toString()
  ])
}

// Handle legacy proposal execution (old format)
export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId = event.params.hierarchicalId
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'EXECUTED'
  proposal.executedAt = event.block.timestamp
  proposal.executor = event.params.executor
  proposal.save()

  log.info('Legacy proposal executed: {} by {} success: {}', [
    proposalId,
    event.params.executor.toHexString(),
    event.params.success.toString()
  ])
}

// Handle hierarchical proposal cancellation (new format)
export function handleProposalCanceledHierarchical(event: ProposalCanceledHierarchical): void {
  let proposalId = event.params.hierarchicalId
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'CANCELED'
  proposal.save()

  log.info('Hierarchical proposal canceled: {} by {}', [
    proposalId,
    event.params.canceler.toHexString()
  ])
}

// Handle legacy proposal cancellation (old format)
export function handleProposalCanceled(event: ProposalCanceled): void {
  let proposalId = event.params.hierarchicalId
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'CANCELED'
  proposal.save()

  log.info('Legacy proposal canceled: {} by {}', [
    proposalId,
    event.params.canceler.toHexString()
  ])
}

export function handleVotingPowerDelegated(event: VotingPowerDelegated): void {
  let delegationId = event.params.delegator.toHexString() + '-' + event.params.delegatee.toHexString()
  let delegation = new Delegation(delegationId)

  // Load or create users
  let delegatorId = event.params.delegator.toHexString()
  let delegateeId = event.params.delegatee.toHexString()

  let delegator = User.load(delegatorId)
  if (!delegator) {
    delegator = new User(delegatorId)
    delegator.address = event.params.delegator
    delegator.totalOrganizations = BigInt.fromI32(0)
    delegator.totalMemberships = BigInt.fromI32(0)
    delegator.totalContributions = BigInt.fromI32(0)
    delegator.totalProposals = BigInt.fromI32(0)
    delegator.totalVotes = BigInt.fromI32(0)
    delegator.firstSeenAt = event.block.timestamp
    delegator.lastActiveAt = event.block.timestamp
    delegator.save()
  }

  let delegatee = User.load(delegateeId)
  if (!delegatee) {
    delegatee = new User(delegateeId)
    delegatee.address = event.params.delegatee
    delegatee.totalOrganizations = BigInt.fromI32(0)
    delegatee.totalMemberships = BigInt.fromI32(0)
    delegatee.totalContributions = BigInt.fromI32(0)
    delegatee.totalProposals = BigInt.fromI32(0)
    delegatee.totalVotes = BigInt.fromI32(0)
    delegatee.firstSeenAt = event.block.timestamp
    delegatee.lastActiveAt = event.block.timestamp
    delegatee.save()
  }

  delegation.delegator = delegatorId
  delegation.delegatee = delegateeId
  delegation.amount = event.params.amount
  delegation.timestamp = event.block.timestamp
  delegation.blockNumber = event.block.number
  delegation.transactionHash = event.transaction.hash

  delegation.save()

  log.info('Voting power delegated: {} to {} amount: {}', [
    delegatorId,
    delegateeId,
    event.params.amount.toString()
  ])
}

export function handleVotingPowerUndelegated(event: VotingPowerUndelegated): void {
  let delegationId = event.params.delegator.toHexString() + '-' + event.params.delegatee.toHexString()
  let delegation = Delegation.load(delegationId)

  if (delegation) {
    // Remove the delegation
    // Note: In AssemblyScript, we can't actually delete entities, so we could mark it as inactive
    // For now, we'll just log it
    log.info('Voting power undelegated: {} from {} amount: {}', [
      event.params.delegator.toHexString(),
      event.params.delegatee.toHexString(),
      event.params.amount.toString()
    ])
  }
}

// Helper functions
function getProposalType(proposalType: BigInt): string {
  if (proposalType.equals(BigInt.fromI32(0))) return 'SIMPLE'
  if (proposalType.equals(BigInt.fromI32(1))) return 'PARAMETRIC'
  if (proposalType.equals(BigInt.fromI32(2))) return 'TREASURY'
  if (proposalType.equals(BigInt.fromI32(3))) return 'MEMBER'
  if (proposalType.equals(BigInt.fromI32(4))) return 'CONSTITUTIONAL'
  return 'SIMPLE'
}

function getVotingType(votingType: BigInt): string {
  if (votingType.equals(BigInt.fromI32(0))) return 'RELATIVE'
  if (votingType.equals(BigInt.fromI32(1))) return 'ABSOLUTE'
  if (votingType.equals(BigInt.fromI32(2))) return 'SUPERMAJORITY'
  if (votingType.equals(BigInt.fromI32(3))) return 'UNANIMOUS'
  return 'RELATIVE'
}

function getVoteChoice(choice: BigInt): string {
  if (choice.equals(BigInt.fromI32(0))) return 'NONE'
  if (choice.equals(BigInt.fromI32(1))) return 'AGAINST'
  if (choice.equals(BigInt.fromI32(2))) return 'FOR'
  if (choice.equals(BigInt.fromI32(3))) return 'ABSTAIN'
  return 'NONE'
}
