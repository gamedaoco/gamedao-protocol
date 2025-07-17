// Common types for GameDAO contracts
export interface Address {
  readonly brand: unique symbol;
}

export type HexString = `0x${string}`;

// Organization types
export interface OrganizationInfo {
  id: string;
  name: string;
  description: string;
  orgType: string;
  creator: HexString;
  createdAt: bigint;
  memberCount: bigint;
  state: OrganizationState;
  treasuryAddress: HexString;
  membershipAddress: HexString;
}

export enum OrganizationState {
  Active = 0,
  Paused = 1,
  Terminated = 2,
  Migrating = 3,
}

export interface OrganizationConfig {
  publicJoin: boolean;
  requireApproval: boolean;
  membershipFee: bigint;
  feeToken: HexString;
  maxMembers: bigint;
  votingPeriod: bigint;
  quorum: bigint;
  allowedRoles: string[];
}

// Membership types
export interface MemberInfo {
  memberAddress: HexString;
  state: MemberState;
  tier: MembershipTier;
  joinedAt: bigint;
  votingPower: bigint;
  delegatedPower: bigint;
  delegatedTo: HexString;
  reputation: bigint;
  lastActivity: bigint;
  roles: string[];
}

export enum MemberState {
  Inactive = 0,
  Active = 1,
  Paused = 2,
  Kicked = 3,
  Banned = 4,
}

export enum MembershipTier {
  Basic = 0,
  Premium = 1,
  VIP = 2,
  Founder = 3,
}

// Campaign types (Flow)
export interface CampaignInfo {
  id: string;
  orgId: string;
  title: string;
  description: string;
  creator: HexString;
  target: bigint;
  raised: bigint;
  deadline: bigint;
  createdAt: bigint;
  state: CampaignState;
  allowedTokens: HexString[];
}

export enum CampaignState {
  Active = 0,
  Paused = 1,
  Successful = 2,
  Failed = 3,
  Cancelled = 4,
}

// Proposal types (Signal)
export interface ProposalInfo {
  id: string;
  orgId: string;
  title: string;
  description: string;
  proposer: HexString;
  createdAt: bigint;
  votingDeadline: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  state: ProposalState;
  proposalData: HexString;
}

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Cancelled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7,
}

// Achievement types (Sense)
export interface AchievementInfo {
  id: string;
  orgId: string;
  name: string;
  description: string;
  reputationReward: bigint;
  createdAt: bigint;
  creator: HexString;
  active: boolean;
  criteria: HexString;
}

// Staking types
export interface StakingPoolInfo {
  id: string;
  orgId: string;
  stakingToken: HexString;
  rewardToken: HexString;
  rewardRate: bigint;
  lockPeriod: bigint;
  totalStaked: bigint;
  createdAt: bigint;
  creator: HexString;
  active: boolean;
}

export interface StakerInfo {
  stakedAmount: bigint;
  rewardDebt: bigint;
  lastStakeTime: bigint;
  delegatedAmount: bigint;
  delegatedTo: HexString;
}

// Profile types (Identity)
export interface ProfileInfo {
  id: string;
  owner: HexString;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  createdAt: bigint;
  lastUpdated: bigint;
  verified: boolean;
}

// Treasury types
export interface TreasuryInfo {
  orgId: string;
  allowedTokens: HexString[];
  createdAt: bigint;
  active: boolean;
  manager: HexString;
  spendingLimit: bigint;
  lastSpendingReset: bigint;
  dailySpent: bigint;
}

// Event types
export interface ContractEvent {
  address: HexString;
  blockNumber: bigint;
  blockHash: HexString;
  transactionHash: HexString;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
}

// Generic contract interaction types
export interface ContractCall {
  to: HexString;
  data: HexString;
  value?: bigint;
}

export interface ContractTransaction {
  hash: HexString;
  blockNumber: bigint;
  blockHash: HexString;
  from: HexString;
  to: HexString;
  value: bigint;
  gasUsed: bigint;
  gasPrice: bigint;
  status: 'success' | 'reverted';
}

// Network types
export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
