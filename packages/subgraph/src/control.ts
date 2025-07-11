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
  Treasury
} from "../generated/schema"
import { updateIndexingStatus } from "./utils/indexing"
import { getOrganizationIdString } from "./utils/ids"

export function handleOrganizationCreated(event: OrganizationCreated): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationCreated')

  let orgId = getOrganizationIdString(event.params.orgId)

  let organization = new Organization(orgId)
  organization.creator = event.params.creator
  organization.prime = event.params.prime
  organization.name = event.params.name
  organization.orgType = "UNKNOWN"
  organization.state = "ACTIVE"
  organization.accessModel = "OPEN"
  organization.memberLimit = BigInt.fromI32(100)
  organization.membershipFee = BigInt.zero()
  organization.memberCount = BigInt.fromI32(1)
  organization.totalCampaigns = BigInt.zero()
  organization.totalProposals = BigInt.zero()
  organization.createdAt = event.params.timestamp
  organization.updatedAt = event.params.timestamp
  organization.blockNumber = event.block.number
  organization.transactionHash = event.transaction.hash

  // Create treasury
  let treasuryId = orgId + "-treasury"
  let treasury = new Treasury(treasuryId)
  treasury.organization = orgId
  treasury.address = Address.zero()
  treasury.balance = BigDecimal.zero()
  treasury.createdAt = event.params.timestamp
  treasury.updatedAt = event.params.timestamp
  treasury.blockNumber = event.block.number
  treasury.transactionHash = event.transaction.hash
  treasury.save()

  organization.treasury = treasuryId
  organization.save()

  // Create prime member
  let primeMemberId = orgId + "-" + event.params.prime.toHex()
  let primeMember = new Member(primeMemberId)
  primeMember.organization = orgId
  primeMember.address = event.params.prime
  primeMember.state = "ACTIVE"
  primeMember.role = "PRIME"
  primeMember.fee = BigInt.zero()
  primeMember.joinedAt = event.params.timestamp
  primeMember.blockNumber = event.block.number
  primeMember.transactionHash = event.transaction.hash
  primeMember.save()
}

export function handleOrganizationUpdated(event: OrganizationUpdated): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationUpdated')

  let orgId = getOrganizationIdString(event.params.orgId)
  let organization = Organization.load(orgId)

  if (organization) {
    organization.prime = event.params.prime
    organization.updatedAt = event.params.timestamp
    organization.blockNumber = event.block.number
    organization.transactionHash = event.transaction.hash
    organization.save()
  }
}

export function handleOrganizationStateChanged(event: OrganizationStateChanged): void {
  // Track indexing progress
  updateIndexingStatus(event.block, 'OrganizationStateChanged')

  let orgId = getOrganizationIdString(event.params.orgId)
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

  let orgId = getOrganizationIdString(event.params.orgId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = new Member(memberId)
  member.organization = orgId
  member.address = event.params.member
  member.state = "ACTIVE"
  member.role = "MEMBER"
  member.fee = event.params.fee
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
  let orgId = getOrganizationIdString(event.params.orgId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member) {
    member.state = "INACTIVE"
    member.removedAt = event.params.timestamp
    member.blockNumber = event.block.number
    member.transactionHash = event.transaction.hash
    member.save()

    let organization = Organization.load(orgId)
    if (organization) {
      organization.memberCount = organization.memberCount.minus(BigInt.fromI32(1))
      organization.updatedAt = event.params.timestamp
      organization.save()
    }
  }
}

export function handleMemberStateChanged(event: MemberStateChanged): void {
  let orgId = getOrganizationIdString(event.params.orgId)
  let memberId = orgId + "-" + event.params.member.toHex()

  let member = Member.load(memberId)
  if (member) {
    member.blockNumber = event.block.number
    member.transactionHash = event.transaction.hash
    member.save()

    let organization = Organization.load(orgId)
    if (organization) {
      organization.updatedAt = event.params.timestamp
      organization.save()
    }
  }
}

export function handleMembershipFeeUpdated(event: MembershipFeeUpdated): void {
  let orgId = getOrganizationIdString(event.params.orgId)
  let organization = Organization.load(orgId)

  if (organization) {
    organization.membershipFee = event.params.newFee
    organization.updatedAt = event.params.timestamp
    organization.blockNumber = event.block.number
    organization.transactionHash = event.transaction.hash
    organization.save()
  }
}
