import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"
import {
  CampaignCreated,
  CampaignUpdated,
  CampaignStateChanged,
  ContributionMade,
  CampaignFinalized,
  RewardsDistributed,
  ContributionRefunded,
  ProtocolFeeCollected
} from "../generated/Flow/Flow"
import {
  Campaign,
  Contribution,
  Organization,
  User,
  GlobalStats,
  Transaction
} from "../generated/schema"
import { getOrganizationIdString } from "./utils/ids"
import { updateIndexingStatus } from "./utils/indexing"

// Helper function to map FlowType enum
function getFlowTypeString(flowType: BigInt): string {
  let typeNum = flowType.toI32()
  if (typeNum == 0) return "GRANT"
  if (typeNum == 1) return "RAISE"
  if (typeNum == 2) return "LEND"
  if (typeNum == 3) return "LOAN"
  if (typeNum == 4) return "SHARE"
  if (typeNum == 5) return "POOL"
  return "RAISE" // Default
}

// Helper function to map FlowState enum
function getFlowStateString(state: BigInt): string {
  let stateNum = state.toI32()
  if (stateNum == 0) return "CREATED"
  if (stateNum == 1) return "ACTIVE"
  if (stateNum == 2) return "PAUSED"
  if (stateNum == 3) return "FINALIZED"
  if (stateNum == 4) return "CANCELLED"
  return "CREATED" // Default
}

// Helper function to create or get User entity
function getOrCreateUser(address: Address): User {
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

export function handleCampaignCreated(event: CampaignCreated): void {
  updateIndexingStatus(event.block, 'CampaignCreated')

  let campaignId = event.params.campaignId.toHex()
  let campaign = new Campaign(campaignId)

  campaign.organization = getOrganizationIdString(event.params.organizationId)
  campaign.creator = event.params.creator.toHex()
  campaign.title = event.params.title
  campaign.description = "" // Set from metadata if available
  campaign.metadataURI = "" // Set from event if available
  campaign.flowType = getFlowTypeString(BigInt.fromI32(event.params.flowType))
  campaign.state = "CREATED"
  campaign.paymentToken = Address.zero() // Default value, not available in create event
  campaign.target = event.params.target
  campaign.min = BigInt.fromI32(0) // Default value, not available in create event
  campaign.max = BigInt.fromI32(0) // Default value, not available in create event
  campaign.raised = BigInt.fromI32(0)
  campaign.contributorCount = BigInt.fromI32(0)
  campaign.startTime = event.params.startTime
  campaign.endTime = event.params.endTime
  campaign.createdAt = event.params.timestamp
  campaign.updatedAt = event.params.timestamp
  campaign.blockNumber = event.block.number
  campaign.transaction = event.transaction.hash.toHex()

  campaign.save()

  // Create or update user
  let user = getOrCreateUser(event.params.creator)
  user.lastActiveAt = event.params.timestamp
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
  stats.totalCampaigns = stats.totalCampaigns.plus(BigInt.fromI32(1))
  stats.activeCampaigns = stats.activeCampaigns.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()

  // Update organization campaign count
  let organization = Organization.load(campaign.organization)
  if (organization) {
    organization.totalCampaigns = organization.totalCampaigns.plus(BigInt.fromI32(1))
    organization.updatedAt = event.params.timestamp
    organization.save()
  }
}

export function handleCampaignUpdated(event: CampaignUpdated): void {
  updateIndexingStatus(event.block, 'CampaignUpdated')

  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign) {
    campaign.title = event.params.title
    campaign.description = event.params.description
    campaign.target = event.params.target
    campaign.min = event.params.min
    campaign.max = event.params.max
    campaign.endTime = event.params.endTime
    campaign.updatedAt = event.params.timestamp
    campaign.blockNumber = event.block.number
    campaign.transaction = event.transaction.hash.toHex()
    campaign.save()
  }
}

export function handleCampaignStateChanged(event: CampaignStateChanged): void {
  updateIndexingStatus(event.block, 'CampaignStateChanged')

  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign) {
    let oldState = campaign.state
    campaign.state = getFlowStateString(BigInt.fromI32(event.params.newState))
    campaign.updatedAt = event.params.timestamp
    campaign.blockNumber = event.block.number
    campaign.transaction = event.transaction.hash.toHex()
    campaign.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      if (oldState != "ACTIVE" && campaign.state == "ACTIVE") {
        stats.activeCampaigns = stats.activeCampaigns.plus(BigInt.fromI32(1))
      } else if (oldState == "ACTIVE" && campaign.state != "ACTIVE") {
        stats.activeCampaigns = stats.activeCampaigns.minus(BigInt.fromI32(1))
      }
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }
}

export function handleContributionMade(event: ContributionMade): void {
  updateIndexingStatus(event.block, 'ContributionMade')

  let campaignId = event.params.campaignId.toHex()
  let contributionId = campaignId + "-" + event.params.contributor.toHex() + "-" + event.transaction.hash.toHex()

  let contribution = new Contribution(contributionId)
  contribution.campaign = campaignId
  contribution.contributor = event.params.contributor.toHex()
  contribution.amount = event.params.amount
  contribution.timestamp = event.params.timestamp
  contribution.blockNumber = event.block.number
  contribution.transaction = event.transaction.hash.toHex()
  contribution.save()

  // Update campaign
  let campaign = Campaign.load(campaignId)
  if (campaign) {
    campaign.raised = campaign.raised.plus(event.params.amount)
    campaign.contributorCount = campaign.contributorCount.plus(BigInt.fromI32(1))
    campaign.updatedAt = event.params.timestamp
    campaign.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      stats.totalRaised = stats.totalRaised.plus(event.params.amount.toBigDecimal())
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }

  // Create or update user
  let user = getOrCreateUser(event.params.contributor)
  user.totalContributions = user.totalContributions.plus(BigInt.fromI32(1))
  user.lastActiveAt = event.params.timestamp
  user.save()
}

export function handleCampaignFinalized(event: CampaignFinalized): void {
  updateIndexingStatus(event.block, 'CampaignFinalized')

  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign) {
    campaign.state = "FINALIZED"
    campaign.raised = event.params.totalRaised
    campaign.updatedAt = event.params.timestamp
    campaign.blockNumber = event.block.number
    campaign.transaction = event.transaction.hash.toHex()
    campaign.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      stats.activeCampaigns = stats.activeCampaigns.minus(BigInt.fromI32(1))
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }
}

export function handleRewardsDistributed(event: RewardsDistributed): void {
  updateIndexingStatus(event.block, 'RewardsDistributed')

  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign) {
    campaign.updatedAt = event.params.timestamp
    campaign.blockNumber = event.block.number
    campaign.transaction = event.transaction.hash.toHex()
    campaign.save()
  }
}

export function handleContributionRefunded(event: ContributionRefunded): void {
  updateIndexingStatus(event.block, 'ContributionRefunded')

  let campaignId = event.params.campaignId.toHex()
  let contributionId = campaignId + "-" + event.params.contributor.toHex() + "-refund-" + event.transaction.hash.toHex()

  let contribution = new Contribution(contributionId)
  contribution.campaign = campaignId
  contribution.contributor = event.params.contributor.toHex()
  contribution.amount = event.params.amount.neg() // Negative amount for refund
  contribution.timestamp = event.params.timestamp
  contribution.blockNumber = event.block.number
  contribution.transaction = event.transaction.hash.toHex()
  contribution.save()

  // Update campaign
  let campaign = Campaign.load(campaignId)
  if (campaign) {
    campaign.raised = campaign.raised.minus(event.params.amount)
    campaign.updatedAt = event.params.timestamp
    campaign.save()

    // Update global stats
    let stats = GlobalStats.load("global")
    if (stats) {
      stats.totalRaised = stats.totalRaised.minus(event.params.amount.toBigDecimal())
      stats.updatedAt = event.block.timestamp
      stats.save()
    }
  }

  // Update user
  let user = getOrCreateUser(event.params.contributor)
  user.lastActiveAt = event.params.timestamp
  user.save()
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
  updateIndexingStatus(event.block, 'ProtocolFeeCollected')

  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign) {
    campaign.updatedAt = event.params.timestamp
    campaign.blockNumber = event.block.number
    campaign.transaction = event.transaction.hash.toHex()
    campaign.save()
  }

  // Update global stats
  let stats = GlobalStats.load("global")
  if (stats) {
    stats.totalTreasuryTransactions = stats.totalTreasuryTransactions.plus(BigInt.fromI32(1))
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}
