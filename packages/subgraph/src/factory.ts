import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import { OrganizationCreated } from "../generated/Factory/Factory"
import { Organization, Treasury, User, GlobalStats, Transaction } from "../generated/schema"
import { Treasury as TreasuryTemplate } from "../generated/templates"
import { getOrganizationIdString } from "./utils/ids"
import { updateIndexingStatus } from "./utils/indexing"

export function handleFactoryOrganizationCreated(event: OrganizationCreated): void {
  updateIndexingStatus(event.block, 'Factory.OrganizationCreated')

  const organizationId = getOrganizationIdString(event.params.id)

  // Create basic Organization from event (Control mapping will enrich via getOrganization)
  let organization = new Organization(organizationId)
  organization.name = event.params.name
  organization.metadataURI = ""
  organization.creator = event.params.creator.toHex()
  organization.treasuryAddress = event.params.treasury
  organization.memberLimit = BigInt.fromI32(0)
  organization.memberCount = BigInt.fromI32(1)
  organization.totalCampaigns = BigInt.fromI32(0)
  organization.totalProposals = BigInt.fromI32(0)
  organization.membershipFee = BigInt.fromI32(0)
  organization.gameStakeRequired = BigInt.fromI32(0)
  organization.state = "ACTIVE"
  organization.createdAt = event.params.timestamp
  organization.updatedAt = event.params.timestamp
  organization.blockNumber = event.block.number
  organization.transaction = event.transaction.hash.toHex()
  organization.save()

  // Treasury entity and template
  const treasuryId = event.params.treasury.toHex()
  let treasury = new Treasury(treasuryId)
  treasury.organization = organizationId
  treasury.address = event.params.treasury
  treasury.createdAt = event.params.timestamp
  treasury.lastActivityAt = event.params.timestamp
  treasury.totalDeposits = BigDecimal.fromString("0")
  treasury.totalSpent = BigDecimal.fromString("0")
  treasury.save()

  organization.treasury = treasuryId
  organization.save()

  TreasuryTemplate.create(event.params.treasury)

  // User
  const userId = event.params.creator.toHex().toLowerCase()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.creator
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.params.timestamp
  }
  user.lastActiveAt = event.params.timestamp
  user.totalOrganizations = user.totalOrganizations.plus(BigInt.fromI32(1))
  user.save()

  // Tx
  let tx = new Transaction(event.transaction.hash.toHex())
  tx.hash = event.transaction.hash
  tx.from = event.transaction.from
  tx.to = event.transaction.to
  tx.gasUsed = BigInt.fromI32(0)
  tx.gasPrice = BigInt.fromI32(0)
  tx.blockNumber = event.block.number
  tx.timestamp = event.block.timestamp
  tx.save()

  // Global stats
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
    stats.totalRaised = BigInt.fromI32(0).toBigDecimal()
    stats.totalProposals = BigInt.fromI32(0)
    stats.activeProposals = BigInt.fromI32(0)
    stats.totalVotes = BigInt.fromI32(0)
    stats.totalProfiles = BigInt.fromI32(0)
    stats.verifiedProfiles = BigInt.fromI32(0)
    stats.totalAchievements = BigInt.fromI32(0)
    stats.totalTokenTransfers = BigInt.fromI32(0)
    stats.totalTreasuryTransactions = BigInt.fromI32(0)
  }
  stats.totalOrganizations = stats.totalOrganizations.plus(BigInt.fromI32(1))
  stats.activeOrganizations = stats.activeOrganizations.plus(BigInt.fromI32(1))
  stats.updatedAt = event.block.timestamp
  stats.save()
}


