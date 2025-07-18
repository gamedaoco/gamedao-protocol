import { BigInt, BigDecimal, log } from "@graphprotocol/graph-ts";
import {
  MemberAdded as MemberAddedEvent,
  MemberRemoved as MemberRemovedEvent,
  MemberStateUpdated as MemberStateUpdatedEvent,
  MemberTierUpdated as MemberTierUpdatedEvent,
  VotingPowerUpdated as VotingPowerUpdatedEvent,
  VotingDelegated as VotingDelegatedEvent,
  VotingUndelegated as VotingUndelegatedEvent,
} from "../generated/Membership/Membership";
import { User, Organization, Member, VotingDelegation, Transaction } from "../generated/schema";
import { getOrCreateUser, getOrCreateOrganization } from "./utils/ids";

export function handleMemberAdded(event: MemberAddedEvent): void {
  log.info("👥 Member Added: {} to org {}", [
    event.params.member.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let user = getOrCreateUser(event.params.member);
  let org = getOrCreateOrganization(event.params.organizationId);

  // Create Member entity
  let memberId = event.params.organizationId.toHex() + "-" + event.params.member.toHex();
  let member = new Member(memberId);
  member.organization = org.id;
  member.user = user.id;
  member.state = "ACTIVE";
  member.joinedAt = event.params.timestamp;
  member.reputation = BigInt.fromI32(0);
  member.stake = BigInt.fromI32(0);
  member.blockNumber = event.block.number;
  member.transaction = event.transaction.hash.toHex();
  member.save();

  // Update organization member count
  org.memberCount = org.memberCount.plus(BigInt.fromI32(1));
  org.save();

  // Create transaction record
  let transaction = new Transaction(event.transaction.hash.toHex());
  transaction.hash = event.transaction.hash;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.gasUsed = BigInt.fromI32(0); // Default value
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.save();
}

export function handleMemberRemoved(event: MemberRemovedEvent): void {
  log.info("👥 Member Removed: {} from org {}", [
    event.params.member.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let org = getOrCreateOrganization(event.params.organizationId);
  let memberId = event.params.organizationId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.state = "INACTIVE";
    member.blockNumber = event.block.number;
    member.transaction = event.transaction.hash.toHex();
    member.save();

    // Update organization member count
    org.memberCount = org.memberCount.minus(BigInt.fromI32(1));
    org.save();
  }
}

export function handleMemberStateUpdated(event: MemberStateUpdatedEvent): void {
  log.info("👥 Member State Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let memberId = event.params.organizationId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.state = event.params.newState == 0 ? "INACTIVE" :
                   event.params.newState == 1 ? "ACTIVE" :
                   event.params.newState == 2 ? "PAUSED" : "BANNED";
    member.blockNumber = event.block.number;
    member.transaction = event.transaction.hash.toHex();
    member.save();
  }
}

export function handleMemberTierUpdated(event: MemberTierUpdatedEvent): void {
  log.info("👥 Member Tier Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let memberId = event.params.organizationId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.blockNumber = event.block.number;
    member.transaction = event.transaction.hash.toHex();
    member.save();
  }
}

export function handleVotingPowerUpdated(event: VotingPowerUpdatedEvent): void {
  log.info("🗳️ Voting Power Updated: {} in org {}", [
    event.params.member.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let memberId = event.params.organizationId.toHex() + "-" + event.params.member.toHex();
  let member = Member.load(memberId);

  if (member) {
    member.blockNumber = event.block.number;
    member.transaction = event.transaction.hash.toHex();
    member.save();
  }
}

export function handleVotingDelegated(event: VotingDelegatedEvent): void {
  log.info("🗳️ Voting Delegated: {} to {} in org {}", [
    event.params.delegator.toHex(),
    event.params.delegatee.toHex(),
    event.params.organizationId.toHex(),
  ]);

  let delegatorUser = getOrCreateUser(event.params.delegator);
  let delegateUser = getOrCreateUser(event.params.delegatee);
  let org = getOrCreateOrganization(event.params.organizationId);

  // Create delegator and delegate member entities
  let delegatorId = event.params.organizationId.toHex() + "-" + event.params.delegator.toHex();
  let delegateId = event.params.organizationId.toHex() + "-" + event.params.delegatee.toHex();
  let delegator = Member.load(delegatorId);
  let delegate = Member.load(delegateId);

  if (delegator && delegate) {
    // Create VotingDelegation entity
    let delegationId = event.params.organizationId.toHex() + "-" + event.params.delegator.toHex() + "-" + event.params.delegatee.toHex() + "-" + event.block.timestamp.toString();
    let delegation = new VotingDelegation(delegationId);
    delegation.organization = org.id;
    delegation.delegator = delegator.id;
    delegation.delegatee = delegate.id;
    delegation.amount = event.params.amount;
    delegation.timestamp = event.params.timestamp;
    delegation.active = true;
    delegation.blockNumber = event.block.number;
    delegation.transaction = event.transaction.hash.toHex();
    delegation.save();
  }
}

export function handleVotingUndelegated(event: VotingUndelegatedEvent): void {
  log.info("🗳️ Voting Undelegated: {} from {} in org {}", [
    event.params.delegator.toHex(),
    event.params.delegatee.toHex(),
    event.params.organizationId.toHex(),
  ]);

  // Find and deactivate the delegation
  // This is a simplified approach - in practice you might want to track specific delegations
  let delegationId = event.params.organizationId.toHex() + "-" + event.params.delegator.toHex() + "-" + event.params.delegatee.toHex() + "-" + event.params.timestamp.toString();
  let delegation = VotingDelegation.load(delegationId);

  if (delegation) {
    delegation.active = false;
    delegation.blockNumber = event.block.number;
    delegation.transaction = event.transaction.hash.toHex();
    delegation.save();
  }
}
