import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProfileCreated,
} from '../generated/Sense/Sense'
import {
  Profile,
  Organization,
  Member,
} from '../generated/schema'

export function handleProfileCreated(event: ProfileCreated): void {
  let profileId = event.params.profileId.toHexString()
  let profile = new Profile(profileId)

  // Load organization
  let organizationId = event.params.organizationId.toHexString()
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
  let username = 'User-' + event.params.profileId.toHexString().slice(0, 8)

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
  profile.createdAt = event.block.timestamp
  profile.updatedAt = event.block.timestamp

  profile.save()

  log.info('Profile created: {} for user {}', [profileId, event.params.owner.toHexString()])
}
