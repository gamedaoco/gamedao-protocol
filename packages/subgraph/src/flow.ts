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
  Reward,
  ProtocolFee,
  Organization,
  Member,
  GlobalStats
} from "../generated/schema"
import { getOrganizationIdString } from "./utils/ids"

export function handleCampaignCreated(event: CampaignCreated): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = new Campaign(campaignId)

  campaign.organization = getOrganizationIdString(event.params.organizationId)
  campaign.creator = event.params.creator
  campaign.title = event.params.title
  campaign.flowType = getFlowTypeString(event.params.flowType)
  campaign.target = event.params.target.toBigDecimal()
  campaign.deposit = BigDecimal.fromString("0")
  campaign.expiry = event.params.endTime
  campaign.raised = BigDecimal.fromString("0")
  campaign.state = "CREATED"
  campaign.contributorCount = BigInt.fromI32(0)
  campaign.protocolFee = BigDecimal.fromString("0")
  campaign.totalRewards = BigDecimal.fromString("0")
  campaign.rewardsDistributed = BigDecimal.fromString("0")
  campaign.createdAt = event.params.timestamp
  campaign.updatedAt = event.params.timestamp
  campaign.description = ""

  campaign.save()

  // Update organization campaign count
  let organization = Organization.load(campaign.organization)
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
    campaign.expiry = event.params.endTime
    campaign.updatedAt = event.params.timestamp
    campaign.save()
  }
}

export function handleCampaignStateChanged(event: CampaignStateChanged): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign != null) {
    campaign.state = getCampaignStateString(event.params.newState)
    campaign.updatedAt = event.params.timestamp
    campaign.save()
  }

  updateGlobalStats()
}

export function handleContributionMade(event: ContributionMade): void {
  let campaignId = event.params.campaignId.toHex()
  let contributorAddress = event.params.contributor.toHex()
  let contributionId = campaignId + "-" + contributorAddress + "-" + event.params.timestamp.toString()

  let contribution = new Contribution(contributionId)
  contribution.campaign = campaignId
  contribution.amount = event.params.amount.toBigDecimal()
  contribution.timestamp = event.params.timestamp
  contribution.blockNumber = event.block.number
  contribution.transactionHash = event.transaction.hash
  contribution.rewardEligible = true
  contribution.rewardReceived = BigDecimal.fromString("0")
  contribution.token = Address.zero() // Default to ETH

  // Try to find the member
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    let memberId = campaign.organization + "-" + contributorAddress
    let member = Member.load(memberId)
    if (member != null) {
      contribution.contributor = memberId
    }
  }

  contribution.save()

  // Update campaign raised amount and contributor count
  if (campaign != null) {
    campaign.raised = campaign.raised.plus(event.params.amount.toBigDecimal())

    // Simple contributor count increment (in real implementation would check for duplicates)
    campaign.contributorCount = campaign.contributorCount.plus(BigInt.fromI32(1))
    campaign.updatedAt = event.params.timestamp
    campaign.save()
  }

  updateGlobalStats()
}

export function handleCampaignFinalized(event: CampaignFinalized): void {
  let campaignId = event.params.campaignId.toHex()
  let campaign = Campaign.load(campaignId)

  if (campaign != null) {
    campaign.state = getCampaignStateString(event.params.finalState)
    campaign.raised = event.params.totalRaised.toBigDecimal()
    campaign.contributorCount = event.params.contributorCount
    campaign.finalizedAt = event.params.timestamp
    campaign.updatedAt = event.params.timestamp
    campaign.save()
  }

  updateGlobalStats()
}

export function handleRewardsDistributed(event: RewardsDistributed): void {
  let campaignId = event.params.campaignId.toHex()
  let rewardId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let reward = new Reward(rewardId)
  reward.campaign = campaignId
  reward.recipient = event.params.token // Adjust based on actual event structure
  reward.token = event.params.token
  reward.amount = event.params.totalAmount.toBigDecimal()
  reward.timestamp = event.params.timestamp
  reward.blockNumber = event.block.number
  reward.transactionHash = event.transaction.hash
  reward.save()

  // Update campaign rewards distributed
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    campaign.rewardsDistributed = campaign.rewardsDistributed.plus(event.params.totalAmount.toBigDecimal())
    campaign.save()
  }
}

export function handleContributionRefunded(event: ContributionRefunded): void {
  let campaignId = event.params.campaignId.toHex()
  let contributorAddress = event.params.contributor.toHex()

  // Create a refund record as a negative contribution
  let refundId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let contribution = new Contribution(refundId)
  contribution.campaign = campaignId
  contribution.amount = event.params.amount.toBigDecimal().neg()
  contribution.timestamp = event.params.timestamp
  contribution.blockNumber = event.block.number
  contribution.transactionHash = event.transaction.hash
  contribution.rewardEligible = false
  contribution.rewardReceived = BigDecimal.fromString("0")
  contribution.token = Address.zero()
  contribution.save()
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
  let campaignId = event.params.campaignId.toHex()
  let feeId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()

  let protocolFee = new ProtocolFee(feeId)
  protocolFee.campaign = campaignId
  protocolFee.amount = event.params.amount.toBigDecimal()
  protocolFee.timestamp = event.params.timestamp
  protocolFee.blockNumber = event.block.number
  protocolFee.transactionHash = event.transaction.hash
  protocolFee.save()
}

function getFlowTypeString(flowType: number): string {
  if (flowType == 0) return "GRANT"
  if (flowType == 1) return "RAISE"
  if (flowType == 2) return "LEND"
  if (flowType == 3) return "LOAN"
  if (flowType == 4) return "SHARE"
  if (flowType == 5) return "POOL"
  return "GRANT"
}

function getCampaignStateString(state: number): string {
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
    stats.totalOrganizations = BigInt.fromI32(0)
    stats.totalCampaigns = BigInt.fromI32(0)
    stats.totalProposals = BigInt.fromI32(0)
    stats.totalMembers = BigInt.fromI32(0)

  }
  stats.updatedAt = BigInt.fromI32(0)
  stats.save()
}
