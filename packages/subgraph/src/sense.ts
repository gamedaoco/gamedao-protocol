import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProfileCreated,
  ProfileUpdated,
  ReputationUpdated,
  AchievementGranted,
  FeedbackSubmitted,
} from '../generated/Sense/Sense'
import {
  Profile,
  Achievement,
  Feedback,
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
    log.error('Organization not found: {}', [organizationId])
    return
  }

  // Load member
  let memberId = organizationId + '-' + event.params.owner.toHexString()
  let member = Member.load(memberId)
  if (!member) {
    log.error('Member not found: {}', [memberId])
    return
  }

  // Set profile data
  profile.organization = organizationId
  profile.owner = memberId
  profile.username = event.params.username
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

export function handleProfileUpdated(event: ProfileUpdated): void {
  let profileId = event.params.profileId.toHexString()
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found: {}', [profileId])
    return
  }

  profile.username = event.params.username
  profile.bio = event.params.bio
  profile.updatedAt = event.block.timestamp

  profile.save()

  log.info('Profile updated: {}', [profileId])
}

export function handleReputationUpdated(event: ReputationUpdated): void {
  // Find profile by user address and organization
  let organizationId = event.params.organizationId.toHexString()
  let userAddress = event.params.user.toHexString()

  // We need to find the profile for this user in this organization
  // For now, we'll use a simple approach - in a real implementation,
  // we might need to query the contract or maintain a mapping
  let profileId = organizationId + '-' + userAddress + '-profile'
  let profile = Profile.load(profileId)

  if (!profile) {
    log.warning('Profile not found for reputation update: user {} org {}', [userAddress, organizationId])
    return
  }

  profile.experience = event.params.experience
  profile.reputation = event.params.reputation
  profile.trustScore = event.params.trust
  profile.updatedAt = event.block.timestamp

  profile.save()

  log.info('Reputation updated for user {} - XP: {} REP: {} TRUST: {}', [
    userAddress,
    event.params.experience.toString(),
    event.params.reputation.toString(),
    event.params.trust.toString()
  ])
}

export function handleAchievementGranted(event: AchievementGranted): void {
  let organizationId = event.params.organizationId.toHexString()
  let userAddress = event.params.user.toHexString()
  let achievementId = event.params.achievementId.toHexString()

  // Create achievement entity
  let id = userAddress + '-' + achievementId + '-' + event.block.timestamp.toString()
  let achievement = new Achievement(id)

  // Find profile
  let profileId = organizationId + '-' + userAddress + '-profile'
  let profile = Profile.load(profileId)

  if (!profile) {
    log.warning('Profile not found for achievement: user {} org {}', [userAddress, organizationId])
    return
  }

  achievement.profile = profileId
  achievement.achievementId = event.params.achievementId
  achievement.title = event.params.title
  achievement.description = event.params.description
  achievement.category = 'GENERAL' // Default category
  achievement.points = event.params.points
  achievement.timestamp = event.block.timestamp
  achievement.blockNumber = event.block.number
  achievement.transactionHash = event.transaction.hash

  achievement.save()

  // Update profile achievement count
  profile.achievementCount = profile.achievementCount.plus(BigInt.fromI32(1))
  profile.save()

  log.info('Achievement granted: {} to user {} - {} points', [
    event.params.title,
    userAddress,
    event.params.points.toString()
  ])
}

export function handleFeedbackSubmitted(event: FeedbackSubmitted): void {
  let feedbackId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let feedback = new Feedback(feedbackId)

  let organizationId = event.params.organizationId.toHexString()
  let targetAddress = event.params.target.toHexString()
  let authorAddress = event.params.author.toHexString()

  // Find target and author profiles
  let targetProfileId = organizationId + '-' + targetAddress + '-profile'
  let authorProfileId = organizationId + '-' + authorAddress + '-profile'

  let targetProfile = Profile.load(targetProfileId)
  let authorProfile = Profile.load(authorProfileId)

  if (!targetProfile || !authorProfile) {
    log.warning('Profiles not found for feedback: target {} author {}', [targetAddress, authorAddress])
    return
  }

  feedback.target = targetProfileId
  feedback.author = authorProfileId
  feedback.feedbackType = getFeedbackType(event.params.rating)
  feedback.rating = event.params.rating
  feedback.comment = event.params.comment
  feedback.timestamp = event.block.timestamp
  feedback.blockNumber = event.block.number
  feedback.transactionHash = event.transaction.hash

  feedback.save()

  // Update target profile feedback counts
  targetProfile.feedbackCount = targetProfile.feedbackCount.plus(BigInt.fromI32(1))

  if (event.params.rating >= 4) {
    targetProfile.positiveFeedbacks = targetProfile.positiveFeedbacks.plus(BigInt.fromI32(1))
  } else if (event.params.rating <= 2) {
    targetProfile.negativeFeedbacks = targetProfile.negativeFeedbacks.plus(BigInt.fromI32(1))
  }

  targetProfile.save()

  log.info('Feedback submitted: {} to {} rating {}', [
    authorAddress,
    targetAddress,
    event.params.rating.toString()
  ])
}

// Helper functions
function getFeedbackType(rating: BigInt): string {
  if (rating.ge(BigInt.fromI32(4))) {
    return 'POSITIVE'
  } else if (rating.le(BigInt.fromI32(2))) {
    return 'NEGATIVE'
  } else {
    return 'NEUTRAL'
  }
}
