import { BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  Transfer,
  Approval
} from '../generated/MockUSDC/MockUSDC'
import {
  User,
  TokenTransfer,
  GlobalStats,
  Transaction
} from '../generated/schema'
import { updateIndexingStatus } from './utils/indexing'

export function handleUSDCTransfer(event: Transfer): void {
  updateIndexingStatus(event.block, 'USDCTransfer')

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
  transfer.transaction = event.transaction.hash.toHex()

  transfer.save()

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()
}

export function handleUSDCApproval(event: Approval): void {
  updateIndexingStatus(event.block, 'USDCApproval')

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
