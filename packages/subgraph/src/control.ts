import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts"
import {
  OrganizationCreated,
  OrganizationStateChanged,
  MemberAdded,
  MemberRemoved,
  MemberStateChanged,
  Control
} from "../generated/Control/Control"
import {
  Organization,
  Member,
  Treasury
} from "../generated/schema"
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
  return "ACTIVE" // Default
}

function mapAccessModel(accessModel: number): string {
  if (accessModel == 0) return "OPEN"
  if (accessModel == 1) return "VOTING"
  if (accessModel == 2) return "INVITE"
  return "OPEN" // Default
}

export function handleOrganizationCreated(event: OrganizationCreated): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationCreated')

  // Get organization ID as alphanumeric string
  let orgId = getOrganizationIdString(event.params.id)

  let organization = new Organization(orgId)
  organization.creator = event.params.creator
  organization.prime = event.params.creator // Creator is the prime initially
  organization.name = event.params.name
  organization.createdAt = event.params.timestamp
  organization.updatedAt = event.params.timestamp
  organization.blockNumber = event.block.number
  organization.transactionHash = event.transaction.hash

  // Read the full organization data from the contract
  let controlContract = Control.bind(event.address)
  let orgData = controlContract.getOrganization(event.params.id)

  // Map the organization data from contract
  organization.orgType = mapOrgType(orgData.orgType)
  organization.state = mapOrgState(orgData.state)
  organization.accessModel = mapAccessModel(orgData.accessModel)
  organization.memberLimit = orgData.memberLimit
  organization.membershipFee = orgData.membershipFee
  organization.memberCount = orgData.memberCount
  organization.totalCampaigns = orgData.totalCampaigns
  organization.totalProposals = orgData.totalProposals

  // Create treasury
  let treasuryId = orgId + "-treasury"
  let treasury = new Treasury(treasuryId)
  treasury.organization = orgId
  treasury.address = event.params.treasury
  treasury.balance = BigDecimal.zero()
  treasury.createdAt = event.params.timestamp
  treasury.updatedAt = event.params.timestamp
  treasury.blockNumber = event.block.number
  treasury.transactionHash = event.transaction.hash
  treasury.save()

  organization.treasury = treasuryId
  organization.save()

  // Create prime member
  let primeMemberId = orgId + "-" + event.params.creator.toHex()
  let primeMember = new Member(primeMemberId)
  primeMember.organization = orgId
  primeMember.address = event.params.creator
  primeMember.state = "ACTIVE"
  primeMember.role = "PRIME"
  primeMember.fee = BigInt.zero()
  primeMember.joinedAt = event.params.timestamp
  primeMember.blockNumber = event.block.number
  primeMember.transactionHash = event.transaction.hash
  primeMember.save()
}

export function handleOrganizationStateChanged(event: OrganizationStateChanged): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationStateChanged')

  let orgId = getOrganizationIdString(event.params.id)
  let organization = Organization.load(orgId)

  if (organization) {
    organization.updatedAt = event.params.timestamp
    organization.blockNumber = event.block.number
    organization.transactionHash = event.transaction.hash
    organization.save()
  }
}

export function handleMemberAdded(event: MemberAdded): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'MemberAdded')

  let orgId = getOrganizationIdString(event.params.organizationId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = new Member(memberId)
  member.organization = orgId
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
