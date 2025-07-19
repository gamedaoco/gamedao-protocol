import { BigInt, BigDecimal, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProposalCreated,
  VoteCast,
  ConvictionVoteCast,
  ProposalExecuted,
  ProposalCanceled,
  VotingPowerDelegated,
  VotingPowerUndelegated,
} from '../generated/Signal/Signal'
import {
  Proposal,
  Vote,
  Delegation,
  Organization,
  User,
  GlobalStats,
  Transaction
} from '../generated/schema'
import { getOrganizationIdString } from './utils/ids'
import { updateIndexingStatus } from './utils/indexing'

// Helper function to map ProposalType enum
function mapProposalType(proposalType: number): string {
  if (proposalType == 0) return "SIMPLE"
  if (proposalType == 1) return "PARAMETRIC"
  if (proposalType == 2) return "TREASURY"
  if (proposalType == 3) return "MEMBER"
  if (proposalType == 4) return "CONSTITUTIONAL"
  return "SIMPLE" // Default
}

// Helper function to map VotingType enum
function mapVotingType(votingType: number): string {
  if (votingType == 0) return "RELATIVE"
  if (votingType == 1) return "ABSOLUTE"
  if (votingType == 2) return "SUPERMAJORITY"
  if (votingType == 3) return "UNANIMOUS"
  return "RELATIVE" // Default
}

// Helper function to map VoteChoice enum
function mapVoteChoice(choice: number): string {
  if (choice == 0) return "NONE"
  if (choice == 1) return "AGAINST"
  if (choice == 2) return "FOR"
  if (choice == 3) return "ABSTAIN"
  return "NONE" // Default
}

// Helper function to create or get User entity
function getOrCreateUser(address: Bytes): User {
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
    user.firstSeenAt = BigInt.fromI32(0)
    user.lastActiveAt = BigInt.fromI32(0)
    user.save()
  }

  return user
}

export function handleProposalCreated(event: ProposalCreated): void {
  updateIndexingStatus(event.block, 'ProposalCreated')

      // Use transaction hash + log index for clean, unique proposal ID
  // Store original corrupted hierarchicalId for event correlation
  let proposalId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let originalHierarchicalId = event.params.hierarchicalId
  let proposal = new Proposal(proposalId)

  // Store original hierarchicalId for event correlation
  proposal.hierarchicalId = originalHierarchicalId
  proposal.organization = getOrganizationIdString(event.params.organizationId)
  proposal.creator = event.params.creator.toHex()
  proposal.title = event.params.title
  proposal.description = "" // Not available in this event
  proposal.metadataURI = "" // Not available in this event
  proposal.proposalType = mapProposalType(event.params.proposalType)
  proposal.votingType = mapVotingType(event.params.votingType)
  proposal.votingPower = "DEMOCRATIC" // Default value
  proposal.state = "PENDING"
  proposal.startTime = event.params.startTime
  proposal.endTime = event.params.endTime
  proposal.executionTime = event.params.endTime // Use endTime as default
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  proposal.totalVotes = BigInt.fromI32(0)
  proposal.quorumReached = false
  proposal.createdAt = event.block.timestamp
  proposal.executedAt = BigInt.fromI32(0)
  proposal.executor = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
  proposal.blockNumber = event.block.number
  proposal.transaction = event.transaction.hash.toHex()

  proposal.save()

  // Create or update user
  let user = getOrCreateUser(event.params.creator)
  user.totalProposals = user.totalProposals.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

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
  stats.totalProposals = stats.totalProposals.plus(BigInt.fromI32(1))
  stats.activeProposals = stats.activeProposals.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()

  // Update organization proposal count
  let organization = Organization.load(proposal.organization)
  if (organization) {
    organization.totalProposals = organization.totalProposals.plus(BigInt.fromI32(1))
    organization.updatedAt = event.block.timestamp
    organization.save()
  }
}

export function handleVoteCast(event: VoteCast): void {
  updateIndexingStatus(event.block, 'VoteCast')

  let proposalId = event.params.hierarchicalId
  let voteId = proposalId + "-" + event.params.voter.toHex()

  let vote = new Vote(voteId)
  vote.proposal = proposalId
  vote.voter = event.params.voter.toHex()
  vote.choice = mapVoteChoice(event.params.choice)
  vote.votingPower = event.params.votingPower
  vote.timestamp = event.block.timestamp
  vote.reason = event.params.reason
  vote.convictionTime = BigInt.fromI32(0) // Default value
  vote.convictionMultiplier = BigInt.fromI32(1) // Default value
  vote.blockNumber = event.block.number
  vote.transaction = event.transaction.hash.toHex()

  vote.save()

  // Update proposal vote counts
  let proposal = Proposal.load(proposalId)
  if (proposal) {
    if (vote.choice == "FOR") {
      proposal.forVotes = proposal.forVotes.plus(event.params.votingPower)
    } else if (vote.choice == "AGAINST") {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.votingPower)
    } else if (vote.choice == "ABSTAIN") {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.votingPower)
    }
    proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
    proposal.save()
  }

  // Create or update user
  let user = getOrCreateUser(event.params.voter)
  user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Update global stats
  let stats = GlobalStats.load("global")
  if (stats) {
    stats.totalVotes = stats.totalVotes.plus(BigInt.fromI32(1))
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  updateIndexingStatus(event.block, 'ProposalExecuted')

  let proposalId = event.params.hierarchicalId.toHexString()
  let proposal = Proposal.load(proposalId)

  if (proposal) {
    proposal.state = "EXECUTED"
    proposal.executedAt = event.block.timestamp
    proposal.executor = event.params.executor
    proposal.blockNumber = event.block.number
    proposal.transaction = event.transaction.hash.toHex()
    proposal.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      stats.activeProposals = stats.activeProposals.minus(BigInt.fromI32(1))
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  } else {
    log.error('Proposal not found: {}', [proposalId])
  }
}

export function handleProposalCanceled(event: ProposalCanceled): void {
  updateIndexingStatus(event.block, 'ProposalCanceled')

  let proposalId = event.params.hierarchicalId.toHexString()
  let proposal = Proposal.load(proposalId)

  if (proposal) {
    proposal.state = "CANCELED"
    proposal.blockNumber = event.block.number
    proposal.transaction = event.transaction.hash.toHex()
    proposal.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      stats.activeProposals = stats.activeProposals.minus(BigInt.fromI32(1))
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  } else {
    log.error('Proposal not found: {}', [proposalId])
  }
}

export function handleVotingPowerDelegated(event: VotingPowerDelegated): void {
  updateIndexingStatus(event.block, 'VotingPowerDelegated')

  let delegationId = event.params.delegator.toHex() + "-" + event.params.delegatee.toHex() + "-" + event.block.timestamp.toString()

  let delegation = new Delegation(delegationId)
  delegation.delegator = event.params.delegator.toHex()
  delegation.delegatee = event.params.delegatee.toHex()
  delegation.amount = event.params.amount
  delegation.timestamp = event.block.timestamp
  delegation.blockNumber = event.block.number
  delegation.transaction = event.transaction.hash.toHex()

  delegation.save()

  // Create or update users
  let delegatorUser = getOrCreateUser(event.params.delegator)
  delegatorUser.lastActiveAt = event.block.timestamp
  delegatorUser.save()

  let delegateeUser = getOrCreateUser(event.params.delegatee)
  delegateeUser.lastActiveAt = event.block.timestamp
  delegateeUser.save()
}

export function handleVotingPowerUndelegated(event: VotingPowerUndelegated): void {
  updateIndexingStatus(event.block, 'VotingPowerUndelegated')

  // Find and remove the delegation
  let delegationId = event.params.delegator.toHex() + "-" + event.params.delegatee.toHex() + "-" + event.block.timestamp.toString()
  let delegation = Delegation.load(delegationId)

  if (delegation) {
    delegation.blockNumber = event.block.number
    delegation.transaction = event.transaction.hash.toHex()
    delegation.save()
  }

  // Update users
  let delegatorUser = getOrCreateUser(event.params.delegator)
  delegatorUser.lastActiveAt = event.block.timestamp
  delegatorUser.save()

  let delegateeUser = getOrCreateUser(event.params.delegatee)
  delegateeUser.lastActiveAt = event.block.timestamp
  delegateeUser.save()
}

export function handleConvictionVoteCast(event: ConvictionVoteCast): void {
  updateIndexingStatus(event.block, 'ConvictionVoteCast')

  let proposalId = event.params.hierarchicalId.toHexString()
  let voteId = proposalId + "-" + event.params.voter.toHex()

  let vote = new Vote(voteId)
  vote.proposal = proposalId
  vote.voter = event.params.voter.toHex()
  vote.choice = mapVoteChoice(event.params.choice)
  vote.votingPower = event.params.votingPower
  vote.timestamp = event.block.timestamp
  vote.reason = event.params.reason
  vote.convictionTime = event.params.convictionTime
  vote.convictionMultiplier = event.params.convictionMultiplier
  vote.blockNumber = event.block.number
  vote.transaction = event.transaction.hash.toHex()

  vote.save()

  // Update proposal vote counts
  let proposal = Proposal.load(proposalId)
  if (proposal) {
    if (vote.choice == "FOR") {
      proposal.forVotes = proposal.forVotes.plus(event.params.votingPower)
    } else if (vote.choice == "AGAINST") {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.votingPower)
    } else if (vote.choice == "ABSTAIN") {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.votingPower)
    }
    proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
    proposal.save()
  }

  // Create or update user
  let user = getOrCreateUser(event.params.voter)
  user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Update global stats
  let stats = GlobalStats.load("global")
  if (stats) {
    stats.totalVotes = stats.totalVotes.plus(BigInt.fromI32(1))
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}
