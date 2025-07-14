import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ExperienceAwarded,
  ReputationUpdated,
  InteractionRecorded,
} from '../generated/Sense/Sense'
import {
  Profile,
  ReputationEvent,
} from '../generated/schema'

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

export function handleExperienceAwarded(event: ExperienceAwarded): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found for experience award: {}', [profileId])
    return
  }

  // Update experience
  profile.experience = profile.experience.plus(event.params.amount)
  profile.updatedAt = event.params.timestamp
  profile.save()

  // Create reputation event
  let eventId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let reputationEvent = new ReputationEvent(eventId)
  reputationEvent.profile = profileId
  reputationEvent.repType = 'EXPERIENCE'
  reputationEvent.delta = event.params.amount
  reputationEvent.reason = event.params.reason
  reputationEvent.updatedBy = event.params.awardedBy
  reputationEvent.timestamp = event.params.timestamp
  reputationEvent.blockNumber = event.block.number
  reputationEvent.transactionHash = event.transaction.hash
  reputationEvent.save()

  log.info('Experience awarded: {} points to profile: {}', [
    event.params.amount.toString(),
    profileId
  ])
}

export function handleReputationUpdated(event: ReputationUpdated): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found for reputation update: {}', [profileId])
    return
  }

  // Map reputation type enum
  let repType = 'REPUTATION'
  if (event.params.repType == 0) repType = 'EXPERIENCE'
  else if (event.params.repType == 1) repType = 'REPUTATION'
  else if (event.params.repType == 2) repType = 'TRUST'

  // Update profile based on reputation type
  if (repType == 'EXPERIENCE') {
    profile.experience = profile.experience.plus(event.params.delta)
  } else if (repType == 'REPUTATION') {
    profile.reputation = profile.reputation.plus(event.params.delta)
  } else if (repType == 'TRUST') {
    profile.trustScore = profile.trustScore.plus(event.params.delta)
  }

  profile.updatedAt = event.params.timestamp
  profile.save()

  // Create reputation event
  let eventId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let reputationEvent = new ReputationEvent(eventId)
  reputationEvent.profile = profileId
  reputationEvent.repType = repType
  reputationEvent.delta = event.params.delta
  reputationEvent.reason = event.params.reason
  reputationEvent.updatedBy = event.params.updatedBy
  reputationEvent.timestamp = event.params.timestamp
  reputationEvent.blockNumber = event.block.number
  reputationEvent.transactionHash = event.transaction.hash
  reputationEvent.save()

  log.info('Reputation updated: {} {} for profile: {}', [
    event.params.delta.toString(),
    repType,
    profileId
  ])
}

export function handleInteractionRecorded(event: InteractionRecorded): void {
  let profileId = getProfileIdString(event.params.profileId)
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found for interaction: {}', [profileId])
    return
  }

  // Update interaction counts
  if (event.params.positive) {
    profile.positiveFeedbacks = profile.positiveFeedbacks.plus(BigInt.fromI32(1))
  } else {
    profile.negativeFeedbacks = profile.negativeFeedbacks.plus(BigInt.fromI32(1))
  }

  profile.feedbackCount = profile.positiveFeedbacks.plus(profile.negativeFeedbacks)
  profile.updatedAt = event.params.timestamp
  profile.save()

  log.info('Interaction recorded: {} for profile: {}', [
    event.params.positive ? 'positive' : 'negative',
    profileId
  ])
}
