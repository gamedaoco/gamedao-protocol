import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import {
  ProfileCreated,
  ProfileUpdated,
  ProfileVerified,
  NameClaimed,
  NameReleased,
} from '../generated/Identity/Identity'
import {
  Profile,
  NameClaim,
  User,
  GlobalStats,
  Transaction,
} from '../generated/schema'
import { updateIndexingStatus } from './utils/indexing'

export function handleProfileCreated(event: ProfileCreated): void {
  updateIndexingStatus(event.block, 'ProfileCreated')

  let profileId = event.params.profileId.toHex()
  let profile = new Profile(profileId)

  // Get or create user
  let userId = event.params.owner.toHex()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.owner
    user.totalOrganizations = BigInt.fromI32(0)
    user.totalMemberships = BigInt.fromI32(0)
    user.totalContributions = BigInt.fromI32(0)
    user.totalProposals = BigInt.fromI32(0)
    user.totalVotes = BigInt.fromI32(0)
    user.firstSeenAt = event.block.timestamp
    user.lastActiveAt = event.block.timestamp
  }
  user.lastActiveAt = event.block.timestamp
  user.save()

  // Set profile data
  profile.profileId = event.params.profileId
  profile.owner = event.params.owner
  profile.organizationId = event.params.organizationId
  profile.metadata = event.params.metadata
  profile.createdAt = event.params.timestamp
  profile.updatedAt = event.params.timestamp
  profile.active = true
  profile.verified = false
  profile.verificationLevel = 0

  // Transaction tracking
  profile.blockNumber = event.block.number
  profile.transactionHash = event.transaction.hash

  profile.save()

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (!globalStats) {
    globalStats = new GlobalStats('global')
    globalStats.totalModules = BigInt.fromI32(0)
    globalStats.activeModules = BigInt.fromI32(0)
    globalStats.totalOrganizations = BigInt.fromI32(0)
    globalStats.activeOrganizations = BigInt.fromI32(0)
    globalStats.totalMembers = BigInt.fromI32(0)
    globalStats.totalActiveMemberships = BigInt.fromI32(0)
    globalStats.totalCampaigns = BigInt.fromI32(0)
    globalStats.activeCampaigns = BigInt.fromI32(0)
    globalStats.totalRaised = BigInt.fromI32(0).toBigDecimal()
    globalStats.totalProposals = BigInt.fromI32(0)
    globalStats.activeProposals = BigInt.fromI32(0)
    globalStats.totalVotes = BigInt.fromI32(0)
    globalStats.totalProfiles = BigInt.fromI32(0)
    globalStats.verifiedProfiles = BigInt.fromI32(0)
    globalStats.totalVotingPower = BigInt.fromI32(0)
    globalStats.totalDelegations = BigInt.fromI32(0)
    globalStats.updatedAt = event.block.timestamp
  }
  globalStats.totalProfiles = globalStats.totalProfiles.plus(BigInt.fromI32(1))
  globalStats.updatedAt = event.block.timestamp
  globalStats.save()

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = event.transaction.gasUsed
  transaction.gasPrice = event.transaction.gasPrice
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
}

export function handleProfileUpdated(event: ProfileUpdated): void {
  updateIndexingStatus(event.block, 'ProfileUpdated')

  let profileId = event.params.profileId.toHex()
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found: {}', [profileId])
    return
  }

  profile.metadata = event.params.metadata
  profile.updatedAt = event.params.timestamp
  profile.save()
}

export function handleProfileVerified(event: ProfileVerified): void {
  updateIndexingStatus(event.block, 'ProfileVerified')

  let profileId = event.params.profileId.toHex()
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found: {}', [profileId])
    return
  }

  profile.verified = true
  profile.verificationLevel = event.params.level
  profile.updatedAt = event.params.timestamp
  profile.save()

  // Update global stats
  let globalStats = GlobalStats.load('global')
  if (globalStats) {
    globalStats.verifiedProfiles = globalStats.verifiedProfiles.plus(BigInt.fromI32(1))
    globalStats.updatedAt = event.block.timestamp
    globalStats.save()
  }
}

export function handleNameClaimed(event: NameClaimed): void {
  updateIndexingStatus(event.block, 'NameClaimed')

  let nameId = event.params.name.toHex()
  let nameClaim = new NameClaim(nameId)

  // Load profile
  let profileId = event.params.profileId.toHex()
  let profile = Profile.load(profileId)

  if (!profile) {
    log.error('Profile not found: {}', [profileId])
    return
  }

  nameClaim.name = event.params.name
  nameClaim.profile = profileId
  nameClaim.owner = event.params.owner
  nameClaim.stakeAmount = event.params.stakeAmount.toBigDecimal()
  nameClaim.stakeDuration = event.params.stakeDuration
  nameClaim.claimedAt = event.params.timestamp
  nameClaim.expiresAt = event.params.timestamp.plus(event.params.stakeDuration)
  nameClaim.isActive = true
  nameClaim.nameType = event.params.nameType

  nameClaim.save()
}

export function handleNameReleased(event: NameReleased): void {
  updateIndexingStatus(event.block, 'NameReleased')

  let nameId = event.params.name.toHex()
  let nameClaim = NameClaim.load(nameId)

  if (!nameClaim) {
    log.error('NameClaim not found: {}', [nameId])
    return
  }

  nameClaim.isActive = false
  nameClaim.save()
}
