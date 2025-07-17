import { BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  Transfer,
  Approval,
  TokensMinted,
  TokensBurned
} from '../generated/GameToken/GameToken'
import {
  User,
  TokenTransfer,
  GlobalStats,
  Transaction
} from '../generated/schema'
import { updateIndexingStatus } from './utils/indexing'

export function handleGameTokenTransfer(event: Transfer): void {
  updateIndexingStatus(event.block, 'GameTokenTransfer')

  // Skip zero transfers
  if (event.params.value.equals(BigInt.fromI32(0))) {
    return
  }

  let transferId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)

  // Get or create from user
  let fromUserId = event.params.from.toHex()
  let fromUser = User.load(fromUserId)
  if (!fromUser) {
    fromUser = new User(fromUserId)
    fromUser.address = event.params.from
    fromUser.totalOrganizations = BigInt.fromI32(0)
    fromUser.totalMemberships = BigInt.fromI32(0)
    fromUser.totalContributions = BigInt.fromI32(0)
    fromUser.totalProposals = BigInt.fromI32(0)
    fromUser.totalVotes = BigInt.fromI32(0)
    fromUser.firstSeenAt = event.block.timestamp
    fromUser.lastActiveAt = event.block.timestamp
  }
  fromUser.lastActiveAt = event.block.timestamp
  fromUser.save()

  // Get or create to user
  let toUserId = event.params.to.toHex()
  let toUser = User.load(toUserId)
  if (!toUser) {
    toUser = new User(toUserId)
    toUser.address = event.params.to
    toUser.totalOrganizations = BigInt.fromI32(0)
    toUser.totalMemberships = BigInt.fromI32(0)
    toUser.totalContributions = BigInt.fromI32(0)
    toUser.totalProposals = BigInt.fromI32(0)
    toUser.totalVotes = BigInt.fromI32(0)
    toUser.firstSeenAt = event.block.timestamp
    toUser.lastActiveAt = event.block.timestamp
  }
  toUser.lastActiveAt = event.block.timestamp
  toUser.save()

  // Create transfer record
  transfer.from = fromUserId
  transfer.to = toUserId
  transfer.token = event.address
  transfer.amount = event.params.value.toBigDecimal()
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash

  transfer.save()

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

export function handleGameTokenApproval(event: Approval): void {
  updateIndexingStatus(event.block, 'GameTokenApproval')

  // Get or create owner user
  let ownerUserId = event.params.owner.toHex()
  let ownerUser = User.load(ownerUserId)
  if (!ownerUser) {
    ownerUser = new User(ownerUserId)
    ownerUser.address = event.params.owner
    ownerUser.totalOrganizations = BigInt.fromI32(0)
    ownerUser.totalMemberships = BigInt.fromI32(0)
    ownerUser.totalContributions = BigInt.fromI32(0)
    ownerUser.totalProposals = BigInt.fromI32(0)
    ownerUser.totalVotes = BigInt.fromI32(0)
    ownerUser.firstSeenAt = event.block.timestamp
    ownerUser.lastActiveAt = event.block.timestamp
  }
  ownerUser.lastActiveAt = event.block.timestamp
  ownerUser.save()

  // Get or create spender user
  let spenderUserId = event.params.spender.toHex()
  let spenderUser = User.load(spenderUserId)
  if (!spenderUser) {
    spenderUser = new User(spenderUserId)
    spenderUser.address = event.params.spender
    spenderUser.totalOrganizations = BigInt.fromI32(0)
    spenderUser.totalMemberships = BigInt.fromI32(0)
    spenderUser.totalContributions = BigInt.fromI32(0)
    spenderUser.totalProposals = BigInt.fromI32(0)
    spenderUser.totalVotes = BigInt.fromI32(0)
    spenderUser.firstSeenAt = event.block.timestamp
    spenderUser.lastActiveAt = event.block.timestamp
  }
  spenderUser.lastActiveAt = event.block.timestamp
  spenderUser.save()
}

export function handleTokensMinted(event: TokensMinted): void {
  updateIndexingStatus(event.block, 'TokensMinted')

  // Get or create user
  let userId = event.params.to.toHex()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.to
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

  // Create mint transfer record
  let transferId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)

  transfer.from = '0x0000000000000000000000000000000000000000' // Zero address for minting
  transfer.to = userId
  transfer.token = event.address
  transfer.amount = event.params.amount.toBigDecimal()
  transfer.timestamp = event.params.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash

  transfer.save()
}

export function handleTokensBurned(event: TokensBurned): void {
  updateIndexingStatus(event.block, 'TokensBurned')

  // Get or create user
  let userId = event.params.from.toHex()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.address = event.params.from
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

  // Create burn transfer record
  let transferId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)

  transfer.from = userId
  transfer.to = '0x0000000000000000000000000000000000000000' // Zero address for burning
  transfer.token = event.address
  transfer.amount = BigInt.fromI32(0).minus(event.params.amount).toBigDecimal()
  transfer.timestamp = event.params.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash

  transfer.save()
}
