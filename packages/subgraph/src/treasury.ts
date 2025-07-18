import { BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import {
  FundsDeposited,
  FundsSpent,
  TokenAdded,
  TokenRemoved,
  SpendingLimitUpdated
} from '../generated/templates/Treasury/Treasury'
import {
  Organization,
  Treasury,
  TreasuryTransaction,
  User,
  GlobalStats,
  Transaction
} from '../generated/schema'
import { updateIndexingStatus } from './utils/indexing'

export function handleFundsDeposited(event: FundsDeposited): void {
  updateIndexingStatus(event.block, 'FundsDeposited')

  let treasuryId = event.address.toHex()
  let treasury = Treasury.load(treasuryId)

  if (!treasury) {
    log.error('Treasury not found: {}', [treasuryId])
    return
  }

  // Get or create depositor user
  let depositorId = event.params.from.toHex()
  let depositor = User.load(depositorId)
  if (!depositor) {
    depositor = new User(depositorId)
    depositor.address = event.params.from
    depositor.totalOrganizations = BigInt.fromI32(0)
    depositor.totalMemberships = BigInt.fromI32(0)
    depositor.totalContributions = BigInt.fromI32(0)
    depositor.totalProposals = BigInt.fromI32(0)
    depositor.totalVotes = BigInt.fromI32(0)
    depositor.firstSeenAt = event.block.timestamp
    depositor.lastActiveAt = event.block.timestamp
  }
  depositor.lastActiveAt = event.block.timestamp
  depositor.save()

  // Create treasury transaction record
  let transactionId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let treasuryTransaction = new TreasuryTransaction(transactionId)

  treasuryTransaction.treasury = treasuryId
  treasuryTransaction.token = event.params.token
  treasuryTransaction.from = depositorId
  treasuryTransaction.to = treasuryId
  treasuryTransaction.amount = event.params.amount.toBigDecimal()
  treasuryTransaction.purpose = event.params.purpose
  treasuryTransaction.timestamp = event.params.timestamp
  treasuryTransaction.transactionType = 'DEPOSIT'
  treasuryTransaction.blockNumber = event.block.number
  treasuryTransaction.transaction = event.transaction.hash.toHex()

  treasuryTransaction.save()

  // Update treasury balance (this would need to be tracked in the schema)
  // For now, we'll just update the treasury's last activity
  treasury.lastActivityAt = event.block.timestamp
  treasury.save()

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

export function handleFundsSpent(event: FundsSpent): void {
  updateIndexingStatus(event.block, 'FundsSpent')

  let treasuryId = event.address.toHex()
  let treasury = Treasury.load(treasuryId)

  if (!treasury) {
    log.error('Treasury not found: {}', [treasuryId])
    return
  }

  // Get or create recipient user
  let recipientId = event.params.to.toHex()
  let recipient = User.load(recipientId)
  if (!recipient) {
    recipient = new User(recipientId)
    recipient.address = event.params.to
    recipient.totalOrganizations = BigInt.fromI32(0)
    recipient.totalMemberships = BigInt.fromI32(0)
    recipient.totalContributions = BigInt.fromI32(0)
    recipient.totalProposals = BigInt.fromI32(0)
    recipient.totalVotes = BigInt.fromI32(0)
    recipient.firstSeenAt = event.block.timestamp
    recipient.lastActiveAt = event.block.timestamp
  }
  recipient.lastActiveAt = event.block.timestamp
  recipient.save()

  // Get or create spender user
  let spenderId = event.params.spender.toHex()
  let spender = User.load(spenderId)
  if (!spender) {
    spender = new User(spenderId)
    spender.address = event.params.spender
    spender.totalOrganizations = BigInt.fromI32(0)
    spender.totalMemberships = BigInt.fromI32(0)
    spender.totalContributions = BigInt.fromI32(0)
    spender.totalProposals = BigInt.fromI32(0)
    spender.totalVotes = BigInt.fromI32(0)
    spender.firstSeenAt = event.block.timestamp
    spender.lastActiveAt = event.block.timestamp
  }
  spender.lastActiveAt = event.block.timestamp
  spender.save()

  // Create treasury transaction record
  let transactionId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let treasuryTransaction = new TreasuryTransaction(transactionId)

  treasuryTransaction.treasury = treasuryId
  treasuryTransaction.token = event.params.token
  treasuryTransaction.from = treasuryId
  treasuryTransaction.to = recipientId
  treasuryTransaction.amount = event.params.amount.toBigDecimal()
  treasuryTransaction.purpose = event.params.purpose
  treasuryTransaction.timestamp = event.params.timestamp
  treasuryTransaction.transactionType = 'SPEND'
  treasuryTransaction.spender = spenderId
  treasuryTransaction.blockNumber = event.block.number
  treasuryTransaction.transaction = event.transaction.hash.toHex()

  treasuryTransaction.save()

  // Update treasury balance (this would need to be tracked in the schema)
  // For now, we'll just update the treasury's last activity
  treasury.lastActivityAt = event.block.timestamp
  treasury.save()
}

export function handleTokenAdded(event: TokenAdded): void {
  updateIndexingStatus(event.block, 'TokenAdded')

  let treasuryId = event.address.toHex()
  let treasury = Treasury.load(treasuryId)

  if (!treasury) {
    log.error('Treasury not found: {}', [treasuryId])
    return
  }

  // Update treasury supported tokens (this would need to be tracked in the schema)
  treasury.lastActivityAt = event.block.timestamp
  treasury.save()
}

export function handleTokenRemoved(event: TokenRemoved): void {
  updateIndexingStatus(event.block, 'TokenRemoved')

  let treasuryId = event.address.toHex()
  let treasury = Treasury.load(treasuryId)

  if (!treasury) {
    log.error('Treasury not found: {}', [treasuryId])
    return
  }

  // Update treasury supported tokens (this would need to be tracked in the schema)
  treasury.lastActivityAt = event.block.timestamp
  treasury.save()
}

export function handleSpendingLimitUpdated(event: SpendingLimitUpdated): void {
  updateIndexingStatus(event.block, 'SpendingLimitUpdated')

  let treasuryId = event.address.toHex()
  let treasury = Treasury.load(treasuryId)

  if (!treasury) {
    log.error('Treasury not found: {}', [treasuryId])
    return
  }

  // Update treasury spending limits (this would need to be tracked in the schema)
  treasury.lastActivityAt = event.block.timestamp
  treasury.save()
}
