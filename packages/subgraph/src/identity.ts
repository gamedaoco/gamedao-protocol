import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProfileCreated,
  ProfileUpdated,
  ProfileVerified,
} from '../generated/Identity/Identity'
import {
  Profile,
  Organization,
  Member,
} from '../generated/schema'
import { getOrganizationIdString } from './utils/ids'

/**
 * Convert bytes8 profile ID to string for use as entity ID
 */
function getProfileIdString(profileIdBytes8: Bytes): string {
  // Convert bytes directly to ASCII characters
  let result = ''
  for (let i = 0; i < 8; i++) {
    const byteValue = profileIdBytes8[i]
    result += String.fromCharCode(byteValue)
  }
  return result
}

export function handleProfileCreated(event: ProfileCreated): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = new Profile(profileId)

  // Load organization
  let organizationId = getOrganizationIdString(event.params.organizationId)
  let organization = Organization.load(organizationId)
  if (!organization) {
    log.warning('Organization not found, continuing with profile creation: {}', [organizationId])
  }

  // Load member - try to find existing member or create reference
  let memberId = organizationId + '-' + event.params.owner.toHexString()
  let member = Member.load(memberId)
  if (!member) {
    log.warning('Member not found, using owner address: {}', [event.params.owner.toHexString()])
  }

  // Parse metadata (could be JSON with username, bio, etc.)
  let metadata = event.params.metadata
  let username = profileId // Use profile ID as default username

  // Try to parse metadata as JSON (if it contains structured data)
  // For now, use metadata as username if it's short enough
  if (metadata.length > 0 && metadata.length < 50) {
    username = metadata
  }

  // Set profile data according to schema
  profile.user = memberId
  profile.organization = organizationId
  profile.metadata = metadata
  profile.createdAt = event.params.timestamp
  profile.blockNumber = event.block.number
  profile.transaction = event.transaction.hash.toHex()

  profile.save()

  log.info('Profile created: {} for organization: {} by owner: {}', [
    profileId,
    organizationId,
    event.params.owner.toHexString()
  ])
}

export function handleProfileUpdated(event: ProfileUpdated): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found for update: {}', [profileId])
    return
  }

  // Update metadata
  let metadata = event.params.metadata
  profile.metadata = metadata
  profile.blockNumber = event.block.number
  profile.transaction = event.transaction.hash.toHex()
  profile.save()

  log.info('Profile updated: {}', [profileId])
}

export function handleProfileVerified(event: ProfileVerified): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found for verification: {}', [profileId])
    return
  }

  // Map verification level enum
  let verificationLevel = 'NONE'
  if (event.params.level == 0) verificationLevel = 'NONE'
  else if (event.params.level == 1) verificationLevel = 'BASIC'
  else if (event.params.level == 2) verificationLevel = 'ENHANCED'
  else if (event.params.level == 3) verificationLevel = 'PREMIUM'

  // Store verification level in metadata for now
  profile.metadata = verificationLevel
  profile.blockNumber = event.block.number
  profile.transaction = event.transaction.hash.toHex()
  profile.save()

  log.info('Profile verified: {} with level: {}', [profileId, verificationLevel])
}

// export function handleNameClaimed(event: NameClaimed): void {
//   updateIndexingStatus(event.block, 'NameClaimed')

//   // Handle name claiming logic
//   // Generic handling - actual parameters would depend on the event structure

//   // Create transaction record
//   let transaction = new Transaction(event.transaction.hash.toHex())
//   transaction.hash = event.transaction.hash
//   transaction.from = event.transaction.from
//   transaction.to = event.transaction.to
//   transaction.gasUsed = BigInt.fromI32(0) // Default value
//   transaction.gasPrice = BigInt.fromI32(0) // Default value
//   transaction.blockNumber = event.block.number
//   transaction.timestamp = event.block.timestamp
//   transaction.save()
// }

// export function handleNameReleased(event: NameReleased): void {
//   updateIndexingStatus(event.block, 'NameReleased')

//   // Handle name release logic
//   // Generic handling - actual parameters would depend on the event structure

//   // Create transaction record
//   let transaction = new Transaction(event.transaction.hash.toHex())
//   transaction.hash = event.transaction.hash
//   transaction.from = event.transaction.from
//   transaction.to = event.transaction.to
//   transaction.gasUsed = BigInt.fromI32(0) // Default value
//   transaction.gasPrice = BigInt.fromI32(0) // Default value
//   transaction.blockNumber = event.block.number
//   transaction.timestamp = event.block.timestamp
//   transaction.save()
// }
