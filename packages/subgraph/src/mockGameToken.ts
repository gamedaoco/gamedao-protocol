import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  TokensMinted as TokensMintedEvent,
  TokensBurned as TokensBurnedEvent,
} from "../generated/MockGameToken/MockGameToken";
import { User, TokenTransfer, GlobalStats, Transaction } from "../generated/schema";

export function handleMockGameTokenTransfer(event: TransferEvent): void {
  // Create transaction entity
  let transaction = new Transaction(event.transaction.hash.toHex())
  transaction.hash = event.transaction.hash
  transaction.blockNumber = event.block.number
  transaction.timestamp = event.block.timestamp
  transaction.save()

  log.info("🪙 MockGameToken Transfer: {} -> {} ({})", [
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

export function handleMockGameTokenApproval(event: ApprovalEvent): void {
  log.info("🪙 MockGameToken Approval: {} -> {} ({})", [
    event.params.owner.toHex(),
    event.params.spender.toHex(),
    event.params.value.toString(),
  ]);

  let owner = User.load(event.params.owner.toHex());
  if (owner == null) {
    owner = new User(event.params.owner.toHex());
    owner.address = event.params.owner;
    owner.save();
  }

  let spender = User.load(event.params.spender.toHex());
  if (spender == null) {
    spender = new User(event.params.spender.toHex());
    spender.address = event.params.spender;
    spender.save();
  }
}

export function handleMockTokensMinted(event: TokensMintedEvent): void {
  log.info("🪙 MockGameToken Minted: {} ({})", [
    event.params.to.toHex(),
    event.params.amount.toString(),
  ]);

  let user = User.load(event.params.to.toHex());
  if (user == null) {
    user = new User(event.params.to.toHex());
    user.address = event.params.to;
    user.save();
  }
}

export function handleMockTokensBurned(event: TokensBurnedEvent): void {
  log.info("🪙 MockGameToken Burned: {} ({})", [
    event.params.from.toHex(),
    event.params.amount.toString(),
  ]);

  let user = User.load(event.params.from.toHex());
  if (user == null) {
    user = new User(event.params.from.toHex());
    user.address = event.params.from;
    user.save();
  }
}
