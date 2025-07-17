import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  TokensMinted as TokensMintedEvent,
  TokensBurned as TokensBurnedEvent,
} from "../generated/MockGameToken/MockGameToken";
import { User, TokenTransfer, GlobalStats, Transaction } from "../generated/schema";
import { getOrCreateUser } from "./utils/ids";

export function handleMockGameTokenTransfer(event: TransferEvent): void {
  log.info("🪙 MockGameToken Transfer: {} -> {} ({})", [
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.value.toString(),
  ]);

  let from = getOrCreateUser(event.params.from);
  let to = getOrCreateUser(event.params.to);

  // Create transfer record
  let transfer = new TokenTransfer(
    event.transaction.hash.concatI32(event.logIndex.toI32()).toHex()
  );
  transfer.from = from.id;
  transfer.to = to.id;
  transfer.value = event.params.value;
  transfer.token = "MockGameToken";
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.hash = event.transaction.hash;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.value = event.transaction.value;
  transaction.gasLimit = event.transaction.gasLimit;
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.save();

  // Update global stats
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalOrganizations = BigInt.fromI32(0);
    stats.totalCampaigns = BigInt.fromI32(0);
    stats.totalProposals = BigInt.fromI32(0);
    stats.totalTransactions = BigInt.fromI32(0);
    stats.totalTokenTransfers = BigInt.fromI32(0);
    stats.totalVolumeGame = BigInt.fromI32(0);
    stats.totalVolumeUSDC = BigInt.fromI32(0);
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.totalTokenTransfers = stats.totalTokenTransfers.plus(BigInt.fromI32(1));
  stats.totalVolumeGame = stats.totalVolumeGame.plus(event.params.value);
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();
}

export function handleMockGameTokenApproval(event: ApprovalEvent): void {
  log.info("🪙 MockGameToken Approval: {} -> {} ({})", [
    event.params.owner.toHex(),
    event.params.spender.toHex(),
    event.params.value.toString(),
  ]);

  let owner = getOrCreateUser(event.params.owner);
  let spender = getOrCreateUser(event.params.spender);

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.hash = event.transaction.hash;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.value = event.transaction.value;
  transaction.gasLimit = event.transaction.gasLimit;
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.save();

  // Update global stats
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalOrganizations = BigInt.fromI32(0);
    stats.totalCampaigns = BigInt.fromI32(0);
    stats.totalProposals = BigInt.fromI32(0);
    stats.totalTransactions = BigInt.fromI32(0);
    stats.totalTokenTransfers = BigInt.fromI32(0);
    stats.totalVolumeGame = BigInt.fromI32(0);
    stats.totalVolumeUSDC = BigInt.fromI32(0);
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();
}

export function handleMockTokensMinted(event: TokensMintedEvent): void {
  log.info("🪙 MockGameToken Minted: {} tokens to {}", [
    event.params.amount.toString(),
    event.params.to.toHex(),
  ]);

  let user = getOrCreateUser(event.params.to);

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.hash = event.transaction.hash;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.value = event.transaction.value;
  transaction.gasLimit = event.transaction.gasLimit;
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.save();

  // Update global stats
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalOrganizations = BigInt.fromI32(0);
    stats.totalCampaigns = BigInt.fromI32(0);
    stats.totalProposals = BigInt.fromI32(0);
    stats.totalTransactions = BigInt.fromI32(0);
    stats.totalTokenTransfers = BigInt.fromI32(0);
    stats.totalVolumeGame = BigInt.fromI32(0);
    stats.totalVolumeUSDC = BigInt.fromI32(0);
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.totalVolumeGame = stats.totalVolumeGame.plus(event.params.amount);
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();
}

export function handleMockTokensBurned(event: TokensBurnedEvent): void {
  log.info("🪙 MockGameToken Burned: {} tokens from {}", [
    event.params.amount.toString(),
    event.params.from.toHex(),
  ]);

  let user = getOrCreateUser(event.params.from);

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.hash = event.transaction.hash;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.value = event.transaction.value;
  transaction.gasLimit = event.transaction.gasLimit;
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.save();

  // Update global stats
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalOrganizations = BigInt.fromI32(0);
    stats.totalCampaigns = BigInt.fromI32(0);
    stats.totalProposals = BigInt.fromI32(0);
    stats.totalTransactions = BigInt.fromI32(0);
    stats.totalTokenTransfers = BigInt.fromI32(0);
    stats.totalVolumeGame = BigInt.fromI32(0);
    stats.totalVolumeUSDC = BigInt.fromI32(0);
    stats.lastUpdateTimestamp = event.block.timestamp;
    stats.lastUpdateBlock = event.block.number;
  }
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;
  stats.save();
}
