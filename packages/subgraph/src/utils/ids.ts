import { Bytes } from "@graphprotocol/graph-ts"
import { User, Organization } from "../../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

/**
 * Convert bytes8 organization ID to alphanumeric string for use as entity ID
 * @param orgIdBytes8 - The bytes8 organization ID from the contract
 * @returns 8-character alphanumeric string
 */
export function getOrganizationIdString(orgIdBytes8: Bytes): string {
  // Convert bytes directly to ASCII characters
  let result = ''
  for (let i = 0; i < 8; i++) {
    const byteValue = orgIdBytes8[i]
    result += String.fromCharCode(byteValue)
  }
  return result
}

/**
 * Convert alphanumeric string back to bytes8 (if needed)
 * @param alphanumericId - 8-character alphanumeric string
 * @returns Bytes8 representation
 */
export function alphanumericStringToBytes8(alphanumericId: string): Bytes {
  if (alphanumericId.length !== 8) {
    // Invalid length, return empty bytes
    return Bytes.fromHexString("0x0000000000000000")
  }

  // Convert each character to hex
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const charCode = alphanumericId.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }

  return Bytes.fromHexString('0x' + hex)
}

/**
 * Get or create a User entity
 * @param address - User address
 * @returns User entity
 */
export function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHex())

  if (!user) {
    user = new User(address.toHex())
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

/**
 * Get or create an Organization entity
 * @param orgId - Organization ID (bytes8)
 * @returns Organization entity
 */
export function getOrCreateOrganization(orgId: Bytes): Organization {
  let orgIdString = getOrganizationIdString(orgId)
  let org = Organization.load(orgIdString)

  if (!org) {
    org = new Organization(orgIdString)
    org.name = ""
    org.metadataURI = ""
    org.creator = ""
    org.treasuryAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    org.orgType = "INDIVIDUAL"
    org.accessModel = "OPEN"
    org.feeModel = "NONE"
    org.memberLimit = BigInt.fromI32(0)
    org.memberCount = BigInt.fromI32(0)
    org.totalCampaigns = BigInt.fromI32(0)
    org.totalProposals = BigInt.fromI32(0)
    org.membershipFee = BigInt.fromI32(0)
    org.gameStakeRequired = BigInt.fromI32(0)
    org.state = "INACTIVE"
    org.createdAt = BigInt.fromI32(0)
    org.updatedAt = BigInt.fromI32(0)
    org.blockNumber = BigInt.fromI32(0)
    org.transaction = ""
    org.save()
  }

  return org
}
