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

  // Set profile data
  profile.organization = organizationId
  profile.owner = memberId
  profile.username = username
  profile.bio = ''
  profile.avatar = ''
  profile.website = ''
  profile.verificationLevel = 'NONE'
  profile.experience = BigInt.fromI32(0)
  profile.reputation = BigInt.fromI32(1000) // Default reputation
  profile.trustScore = BigInt.fromI32(0)
  profile.convictionScore = BigInt.fromI32(0)
  profile.achievementCount = BigInt.fromI32(0)
  profile.feedbackCount = BigInt.fromI32(0)
  profile.positiveFeedbacks = BigInt.fromI32(0)
  profile.negativeFeedbacks = BigInt.fromI32(0)
  profile.createdAt = event.params.timestamp
  profile.updatedAt = event.params.timestamp

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
  if (metadata.length > 0 && metadata.length < 50) {
    profile.username = metadata
  }

  profile.updatedAt = event.params.timestamp
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

  profile.verificationLevel = verificationLevel
  profile.updatedAt = event.block.timestamp
  profile.save()

  log.info('Profile verified: {} with level: {}', [profileId, verificationLevel])
}
