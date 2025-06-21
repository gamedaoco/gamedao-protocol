import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"
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
  Reward,
  Refund,
  ProtocolFee,
  Organization,
  Member,
  GlobalStats
} from "../generated/schema"

export function handleCampaignCreated(event: CampaignCreated): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = new Campaign(campaignId)

  campaign.organization = event.params.organizationId.toHex()
  campaign.creator = event.params.creator
  campaign.flowType = getFlowTypeString(event.params.flowType)
  campaign.title = ""
  campaign.description = ""
  campaign.target = event.params.target.toBigDecimal()
  // campaign.deposit = event.params.deposit.toBigDecimal() // Not available in ABI
  // campaign.expiry = event.params.expiry // Not available in ABI
  campaign.state = "CREATED"

  // Initialize financial tracking
  campaign.raised = BigDecimal.fromString("0")
  campaign.contributorCount = BigInt.fromI32(0)
  campaign.protocolFee = BigDecimal.fromString("0")
  campaign.totalRewards = BigDecimal.fromString("0")
  campaign.rewardsDistributed = BigDecimal.fromString("0")

  // Timestamps
  campaign.createdAt = event.block.timestamp
  campaign.updatedAt = event.block.timestamp

  campaign.save()

  // Update organization campaign count
  let organization = Organization.load(event.params.organizationId.toHex())
  if (organization != null) {
    organization.totalCampaigns = organization.totalCampaigns.plus(BigInt.fromI32(1))
    organization.save()
  }

  updateGlobalStats()
}

export function handleCampaignUpdated(event: CampaignUpdated): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign != null) {
    campaign.title = event.params.title
    campaign.description = event.params.description
    campaign.target = event.params.target.toBigDecimal()
    // campaign.expiry = event.params.expiry // Not available in ABI
    campaign.updatedAt = event.block.timestamp
    campaign.save()
  }
}

export function handleCampaignStateChanged(event: CampaignStateChanged): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign != null) {
    campaign.state = getCampaignStateString(event.params.newState)
    campaign.updatedAt = event.block.timestamp
    campaign.save()
  }

  updateGlobalStats()
}

export function handleContributionMade(event: ContributionMade): void {
  let campaignId = event.params.campaignId.toHex()
  let contributorAddress = event.params.contributor.toHex()
  let contributionId = campaignId + "-" + contributorAddress + "-" + event.block.timestamp.toString()

  let contribution = new Contribution(contributionId)
  contribution.campaign = campaignId
  // contribution.token = event.params.token // Not available in ABI
  contribution.amount = event.params.amount.toBigDecimal()
  contribution.timestamp = event.block.timestamp
  contribution.blockNumber = event.block.number
  contribution.transactionHash = event.transaction.hash
  contribution.rewardEligible = true
  contribution.rewardReceived = BigDecimal.fromString("0")

  // Try to find the member
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    let memberId = campaign.organization + "-" + contributorAddress
    let member = Member.load(memberId)
    if (member != null) {
      contribution.contributor = memberId

      // Update member contribution count
      member.contributionsCount = member.contributionsCount.plus(BigInt.fromI32(1))
      member.save()
    }
  }

  contribution.save()

  // Update campaign raised amount and contributor count
  if (campaign != null) {
    campaign.raised = campaign.raised.plus(event.params.amount.toBigDecimal())

    // Check if this is a new contributor
    let existingContributions = campaign.contributions.load()
    let isNewContributor = true
    for (let i = 0; i < existingContributions.length; i++) {
      if (existingContributions[i].contributor == contribution.contributor) {
        isNewContributor = false
        break
      }
    }

    if (isNewContributor) {
      campaign.contributorCount = campaign.contributorCount.plus(BigInt.fromI32(1))
    }

    campaign.save()
  }

  updateGlobalStats()
}

export function handleCampaignFinalized(event: CampaignFinalized): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign != null) {
    campaign.state = event.params.successful ? "SUCCEEDED" : "FAILED"
    campaign.raised = event.params.totalRaised.toBigDecimal()
    campaign.protocolFee = event.params.protocolFee.toBigDecimal()
    campaign.finalizedAt = event.block.timestamp
    campaign.updatedAt = event.block.timestamp
    campaign.save()
  }

  updateGlobalStats()
}

export function handleRewardDistributed(event: RewardDistributed): void {
  let campaignId = event.params.campaignId.toHex()
  let rewardId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let reward = new Reward(rewardId)
  reward.campaign = campaignId
  reward.recipient = event.params.recipient
  reward.token = event.params.token
  reward.amount = event.params.amount.toBigDecimal()
  reward.timestamp = event.block.timestamp
  reward.blockNumber = event.block.number
  reward.transactionHash = event.transaction.hash
  reward.save()

  // Update campaign rewards distributed
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    campaign.rewardsDistributed = campaign.rewardsDistributed.plus(event.params.amount.toBigDecimal())
    campaign.save()
  }
}

export function handleRefundIssued(event: RefundIssued): void {
  let campaignId = event.params.campaignId.toHex()
  let refundId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let refund = new Refund(refundId)
  refund.campaign = campaignId
  refund.recipient = event.params.recipient
  refund.token = event.params.token
  refund.amount = event.params.amount.toBigDecimal()
  refund.timestamp = event.block.timestamp
  refund.blockNumber = event.block.number
  refund.transactionHash = event.transaction.hash
  refund.save()
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
  let campaignId = event.params.campaignId.toHex()
  let feeId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let protocolFee = new ProtocolFee(feeId)
  protocolFee.campaign = campaignId
  protocolFee.amount = event.params.amount.toBigDecimal()
  protocolFee.timestamp = event.block.timestamp
  protocolFee.blockNumber = event.block.number
  protocolFee.transactionHash = event.transaction.hash
  protocolFee.save()
}

// Helper functions
function getFlowTypeString(flowType: i32): string {
  if (flowType == 0) return "GRANT"
  if (flowType == 1) return "RAISE"
  if (flowType == 2) return "LEND"
  if (flowType == 3) return "LOAN"
  if (flowType == 4) return "SHARE"
  if (flowType == 5) return "POOL"
  return "GRANT"
}

function getCampaignStateString(state: i32): string {
  if (state == 0) return "CREATED"
  if (state == 1) return "ACTIVE"
  if (state == 2) return "PAUSED"
  if (state == 3) return "SUCCEEDED"
  if (state == 4) return "FAILED"
  if (state == 5) return "FINALIZED"
  if (state == 6) return "CANCELLED"
  return "CREATED"
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
