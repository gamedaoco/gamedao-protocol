import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  TokensMinted as TokensMintedEvent,
  TokensBurned as TokensBurnedEvent,
} from "../generated/GameToken/GameToken";
import { User, TokenTransfer, GlobalStats, Transaction } from "../generated/schema";

export function handleGameTokenTransfer(event: TransferEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  log.info("🪙 GameToken Transfer: {} -> {} ({})", [
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.value.toString(),
  ]);

  // Create or load users
  let from = User.load(event.params.from.toHex())
  if (from == null) {
    from = new User(event.params.from.toHex())
    from.address = event.params.from
    from.totalOrganizations = BigInt.fromI32(0)
    from.totalMemberships = BigInt.fromI32(0)
    from.totalContributions = BigInt.fromI32(0)
    from.totalProposals = BigInt.fromI32(0)
    from.totalVotes = BigInt.fromI32(0)
    from.firstSeenAt = event.block.timestamp
    from.lastActiveAt = event.block.timestamp
    from.save()
  }

  let to = User.load(event.params.to.toHex())
  if (to == null) {
    to = new User(event.params.to.toHex())
    to.address = event.params.to
    to.totalOrganizations = BigInt.fromI32(0)
    to.totalMemberships = BigInt.fromI32(0)
    to.totalContributions = BigInt.fromI32(0)
    to.totalProposals = BigInt.fromI32(0)
    to.totalVotes = BigInt.fromI32(0)
    to.firstSeenAt = event.block.timestamp
    to.lastActiveAt = event.block.timestamp
    to.save()
  }

  // Create transfer record
  let transferId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)
  transfer.from = from.id
  transfer.to = to.id
  transfer.amount = event.params.value.toBigDecimal()
  transfer.token = event.address
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transaction = transaction.id

  transfer.save()
}

export function handleGameTokenApproval(event: ApprovalEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  log.info("🪙 GameToken Approval: {} -> {} ({})", [
    event.params.owner.toHex(),
    event.params.spender.toHex(),
    event.params.value.toString(),
  ]);

  // Create or load users
  let owner = User.load(event.params.owner.toHex())
  if (owner == null) {
    owner = new User(event.params.owner.toHex())
    owner.address = event.params.owner
    owner.totalOrganizations = BigInt.fromI32(0)
    owner.totalMemberships = BigInt.fromI32(0)
    owner.totalContributions = BigInt.fromI32(0)
    owner.totalProposals = BigInt.fromI32(0)
    owner.totalVotes = BigInt.fromI32(0)
    owner.firstSeenAt = event.block.timestamp
    owner.lastActiveAt = event.block.timestamp
    owner.save()
  }

  let spender = User.load(event.params.spender.toHex())
  if (spender == null) {
    spender = new User(event.params.spender.toHex())
    spender.address = event.params.spender
    spender.totalOrganizations = BigInt.fromI32(0)
    spender.totalMemberships = BigInt.fromI32(0)
    spender.totalContributions = BigInt.fromI32(0)
    spender.totalProposals = BigInt.fromI32(0)
    spender.totalVotes = BigInt.fromI32(0)
    spender.firstSeenAt = event.block.timestamp
    spender.lastActiveAt = event.block.timestamp
    spender.save()
  }
}

export function handleTokensMinted(event: TokensMintedEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  log.info("🪙 GameToken Minted: {} ({})", [
    event.params.to.toHex(),
    event.params.amount.toString(),
  ]);

  // Create or load user
  let to = User.load(event.params.to.toHex())
  if (to == null) {
    to = new User(event.params.to.toHex())
    to.address = event.params.to
    to.totalOrganizations = BigInt.fromI32(0)
    to.totalMemberships = BigInt.fromI32(0)
    to.totalContributions = BigInt.fromI32(0)
    to.totalProposals = BigInt.fromI32(0)
    to.totalVotes = BigInt.fromI32(0)
    to.firstSeenAt = event.block.timestamp
    to.lastActiveAt = event.block.timestamp
    to.save()
  }

  // Create transfer record
  let transferId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)
  transfer.from = "0x0000000000000000000000000000000000000000"
  transfer.to = to.id
  transfer.amount = event.params.amount.toBigDecimal()
  transfer.token = event.address
  transfer.timestamp = event.params.timestamp
  transfer.blockNumber = event.block.number
  transfer.transaction = transaction.id

  transfer.save()
}

export function handleTokensBurned(event: TokensBurnedEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.from = event.transaction.from
  transaction.to = event.transaction.to
  transaction.gasUsed = BigInt.fromI32(0) // Default value
  transaction.gasPrice = BigInt.fromI32(0) // Default value
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  log.info("🪙 GameToken Burned: {} ({})", [
    event.params.from.toHex(),
    event.params.amount.toString(),
  ]);

  // Create or load user
  let from = User.load(event.params.from.toHex())
  if (from == null) {
    from = new User(event.params.from.toHex())
    from.address = event.params.from
    from.save()
  }

  // Create transfer record
  let transferId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)
  transfer.from = from.id
  transfer.to = "0x0000000000000000000000000000000000000000"
  transfer.amount = event.params.amount.toBigDecimal()
  transfer.token = event.address
  transfer.timestamp = event.params.timestamp
  transfer.blockNumber = event.block.number
  transfer.transaction = transaction.id

  transfer.save()
}
