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
    from.save()
  }

  let to = User.load(event.params.to.toHex())
  if (to == null) {
    to = new User(event.params.to.toHex())
    to.address = event.params.to
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
    owner.save()
  }

  let spender = User.load(event.params.spender.toHex())
  if (spender == null) {
    spender = new User(event.params.spender.toHex())
    spender.address = event.params.spender
    spender.save()
  }
}

export function handleTokensMinted(event: TokensMintedEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
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
