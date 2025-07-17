import { BigInt, log, Bytes } from "@graphprotocol/graph-ts";
import {
  MemberAdded as MemberAddedEvent,
  MemberRemoved as MemberRemovedEvent,
  MemberStateUpdated as MemberStateUpdatedEvent,
  MemberTierUpdated as MemberTierUpdatedEvent,
  VotingPowerUpdated as VotingPowerUpdatedEvent,
  VotingDelegated as VotingDelegatedEvent,
  VotingUndelegated as VotingUndelegatedEvent,
} from "../generated/Membership/Membership";
import { User, Organization, Member, VotingDelegation, GlobalStats, Transaction } from "../generated/schema";
import { getOrCreateUser, getOrCreateOrganization } from "./utils/ids";

export function handleMemberAdded(event: MemberAddedEvent): void {
  log.info("👥 Member Added: {} to org {}", [
    event.params.member.toHex(),
    event.params.orgId.toHex(),
  ]);

  let user = getOrCreateUser(event.params.member);
  let org = getOrCreateOrganization(event.params.orgId);

  // Create Member entity
  let memberId = event.params.orgId.toHex() + "-" + event.params.member.toHex();
  let member = new Member(memberId);
  member.organization = org.id;
  member.user = user.id;
  member.tier = event.params.tier;
  member.joinedAt = event.params.joinedAt;
  member.lastUpdate = event.params.lastUpdate;
  member.votingPower = BigInt.fromI32(0);
  member.isActive = true;
  member.save();

  // Update organization member count
  org.memberCount = org.memberCount.plus(BigInt.fromI32(1));
  org.save();

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

export function handleMemberRemoved(event: MemberRemovedEvent): void {
  log.info("👥 Member Removed: {} from org {}", [
    event.params.member.toHex(),
    event.params.orgId.toHex(),
  ]);

  let org = getOrCreateOrganization(event.params.orgId);
  let memberId = event.params.orgId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.isActive = false;
    member.lastUpdate = event.params.removedAt;
    member.save();

    // Update organization member count
    org.memberCount = org.memberCount.minus(BigInt.fromI32(1));
    org.save();
  }

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
}

export function handleMemberStateUpdated(event: MemberStateUpdatedEvent): void {
  log.info("👥 Member State Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.orgId.toHex(),
  ]);

  let memberId = event.params.orgId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.tier = event.params.newTier;
    member.lastUpdate = event.params.updatedAt;
    member.save();
  }

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
}

export function handleMemberTierUpdated(event: MemberTierUpdatedEvent): void {
  log.info("👥 Member Tier Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.orgId.toHex(),
  ]);

  let memberId = event.params.orgId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.tier = event.params.newTier;
    member.lastUpdate = event.params.updatedAt;
    member.save();
  }

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
}

export function handleVotingPowerUpdated(event: VotingPowerUpdatedEvent): void {
  log.info("🗳️ Voting Power Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.orgId.toHex(),
  ]);

  let memberId = event.params.orgId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.votingPower = event.params.newPower;
    member.lastUpdate = event.params.updatedAt;
    member.save();
  }

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
}

export function handleVotingDelegated(event: VotingDelegatedEvent): void {
  log.info("🗳️ Voting Delegated: {} to {} in org {}", [
    event.params.delegator.toHex(),
    event.params.delegate.toHex(),
    event.params.orgId.toHex(),
  ]);

  let delegator = getOrCreateUser(event.params.delegator);
  let delegate = getOrCreateUser(event.params.delegate);
  let org = getOrCreateOrganization(event.params.orgId);

  // Create VotingDelegation entity
  let delegationId = event.params.orgId.toHex() + "-" + event.params.delegator.toHex() + "-" + event.params.delegate.toHex();
  let delegation = new VotingDelegation(delegationId);
  delegation.organization = org.id;
  delegation.delegator = delegator.id;
  delegation.delegate = delegate.id;
  delegation.delegatedAt = event.params.delegatedAt;
  delegation.amount = event.params.amount;
  delegation.isActive = true;
  delegation.save();

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
}

export function handleVotingUndelegated(event: VotingUndelegatedEvent): void {
  log.info("🗳️ Voting Undelegated: {} from {} in org {}", [
    event.params.delegator.toHex(),
    event.params.delegate.toHex(),
    event.params.orgId.toHex(),
  ]);

  let delegationId = event.params.orgId.toHex() + "-" + event.params.delegator.toHex() + "-" + event.params.delegate.toHex();
  let delegation = VotingDelegation.load(delegationId);

  if (delegation) {
    delegation.isActive = false;
    delegation.save();
  }

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
}
