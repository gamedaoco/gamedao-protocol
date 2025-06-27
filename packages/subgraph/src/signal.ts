import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProposalCreated,
  ProposalStateChanged,
  VoteCast,
  ProposalExecuted,
  ProposalCancelled,
  VotingPowerDelegated,
  VotingPowerUndelegated,
} from '../generated/Signal/Signal'
import {
  Proposal,
  Vote,
  Delegation,
  Organization,
  Member,
} from '../generated/schema'

export function handleProposalCreated(event: ProposalCreated): void {
  let proposalId = event.params.proposalId.toHexString()
  let proposal = new Proposal(proposalId)

  // Load organization
  let organizationId = event.params.organizationId.toHexString()
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Load proposer member
  let memberId = organizationId + '-' + event.params.proposer.toHexString()
  let proposer = Member.load(memberId)
  if (!proposer) {
    log.error('Proposer member not found: {}', [memberId])
    return
  }

  // Set proposal data
  proposal.organization = organizationId
  proposal.proposer = memberId
  proposal.title = event.params.title
  proposal.description = '' // Will be updated if needed
  proposal.proposalType = getProposalType(event.params.proposalType)
  proposal.votingType = getVotingType(event.params.votingType)
  proposal.votingPowerModel = getVotingPowerModel(event.params.votingPower)
  proposal.state = 'PENDING'
  proposal.startTime = event.params.startTime
  proposal.endTime = event.params.endTime
  proposal.votesFor = BigInt.fromI32(0).toBigDecimal()
  proposal.votesAgainst = BigInt.fromI32(0).toBigDecimal()
  proposal.totalVotes = BigInt.fromI32(0)
  proposal.quorum = BigInt.fromI32(0) // Will be set from contract if needed
  proposal.threshold = BigInt.fromI32(0) // Will be set from contract if needed
  proposal.executionData = new Bytes(0)
  proposal.createdAt = event.block.timestamp
  proposal.updatedAt = event.block.timestamp

  proposal.save()

  // Update organization proposal count
  organization.totalProposals = organization.totalProposals.plus(BigInt.fromI32(1))
  organization.save()

  log.info('Proposal created: {} by {}', [proposalId, event.params.proposer.toHexString()])
}

export function handleProposalStateChanged(event: ProposalStateChanged): void {
  let proposalId = event.params.proposalId.toHexString()
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = getProposalState(event.params.newState)
  proposal.updatedAt = event.block.timestamp

  proposal.save()

  log.info('Proposal state changed: {} to {}', [proposalId, proposal.state])
}

export function handleVoteCast(event: VoteCast): void {
  let proposalId = event.params.proposalId.toHexString()
  let voterAddress = event.params.voter.toHexString()
  let voteId = proposalId + '-' + voterAddress

  let vote = new Vote(voteId)
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found for vote: {}', [proposalId])
    return
  }

  // Load voter member
  let organizationId = proposal.organization
  let memberId = organizationId + '-' + voterAddress
  let voter = Member.load(memberId)
  if (!voter) {
    log.error('Voter member not found: {}', [memberId])
    return
  }

  // Set vote data
  vote.proposal = proposalId
  vote.voter = memberId
  vote.support = event.params.choice == 1 // 1 = For, 0 = Against, 2 = Abstain
  vote.votingPower = event.params.votingPower.toBigDecimal()
  vote.conviction = BigInt.fromI32(1) // Default conviction
  vote.timestamp = event.block.timestamp
  vote.blockNumber = event.block.number
  vote.transactionHash = event.transaction.hash

  vote.save()

  // Update proposal vote counts
  if (event.params.choice == 1) {
    proposal.votesFor = proposal.votesFor.plus(event.params.votingPower.toBigDecimal())
  } else if (event.params.choice == 0) {
    proposal.votesAgainst = proposal.votesAgainst.plus(event.params.votingPower.toBigDecimal())
  }

  proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
  proposal.updatedAt = event.block.timestamp

  proposal.save()

  // Vote count is tracked via the votes relationship

  log.info('Vote cast: {} on proposal {} with power {}', [
    voterAddress,
    proposalId,
    event.params.votingPower.toString()
  ])
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId = event.params.proposalId.toHexString()
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'EXECUTED'
  proposal.executedAt = event.block.timestamp
  proposal.executionSuccess = event.params.success
  proposal.updatedAt = event.block.timestamp

  proposal.save()

  log.info('Proposal executed: {} success: {}', [proposalId, event.params.success.toString()])
}

export function handleProposalCancelled(event: ProposalCancelled): void {
  let proposalId = event.params.proposalId.toHexString()
  let proposal = Proposal.load(proposalId)

  if (!proposal) {
    log.error('Proposal not found: {}', [proposalId])
    return
  }

  proposal.state = 'CANCELLED'
  proposal.updatedAt = event.block.timestamp

  proposal.save()

  log.info('Proposal cancelled: {} by {}', [proposalId, event.params.canceller.toHexString()])
}

export function handleVotingPowerDelegated(event: VotingPowerDelegated): void {
  // For now, we'll create a simple delegation tracking
  // This could be expanded to track delegation chains
  let delegationId = event.params.delegator.toHexString() + '-' + event.params.delegatee.toHexString()
  let delegation = new Delegation(delegationId)

  delegation.organization = '' // Will need to be determined from context
  delegation.delegator = event.params.delegator
  delegation.delegatee = event.params.delegatee
  delegation.votingPower = event.params.amount.toBigDecimal()
  delegation.timestamp = event.block.timestamp
  delegation.active = true

  delegation.save()

  log.info('Voting power delegated: {} to {} amount: {}', [
    event.params.delegator.toHexString(),
    event.params.delegatee.toHexString(),
    event.params.amount.toString()
  ])
}

export function handleVotingPowerUndelegated(event: VotingPowerUndelegated): void {
  let delegationId = event.params.delegator.toHexString() + '-' + event.params.delegatee.toHexString()
  let delegation = Delegation.load(delegationId)

  if (delegation) {
    delegation.active = false
    delegation.save()
  }

  log.info('Voting power undelegated: {} from {} amount: {}', [
    event.params.delegator.toHexString(),
    event.params.delegatee.toHexString(),
    event.params.amount.toString()
  ])
}

// Helper functions
function getProposalType(type: i32): string {
  switch (type) {
    case 0: return 'SIMPLE'
    case 1: return 'PARAMETRIC'
    case 2: return 'TREASURY'
    case 3: return 'MEMBER'
    case 4: return 'CONSTITUTIONAL'
    default: return 'SIMPLE'
  }
}

function getVotingType(type: i32): string {
  switch (type) {
    case 0: return 'RELATIVE'
    case 1: return 'ABSOLUTE'
    case 2: return 'SUPERMAJORITY'
    case 3: return 'UNANIMOUS'
    default: return 'RELATIVE'
  }
}

function getVotingPowerModel(model: i32): string {
  switch (model) {
    case 0: return 'DEMOCRATIC'
    case 1: return 'TOKEN_WEIGHTED'
    case 2: return 'QUADRATIC'
    case 3: return 'CONVICTION'
    default: return 'DEMOCRATIC'
  }
}

function getProposalState(state: i32): string {
  switch (state) {
    case 0: return 'PENDING'
    case 1: return 'ACTIVE'
    case 2: return 'QUEUED'
    case 3: return 'EXECUTED'
    case 4: return 'DEFEATED'
    case 5: return 'CANCELLED'
    case 6: return 'EXPIRED'
    default: return 'PENDING'
  }
}
