// Import ABIs from the shared package
export {
  REGISTRY_ABI,
  CONTROL_ABI,
  MEMBERSHIP_ABI,
  FLOW_ABI,
  SIGNAL_ABI,
  SENSE_ABI,
  IDENTITY_ABI,
  STAKING_ABI,
  TREASURY_ABI,
  ABIS,
  CONTRACT_NAMES,
} from '@gamedao/evm';

// Import types and addresses for convenience
export {
  getAddressesForNetwork,
  getContractAddress,
  LOCAL_ADDRESSES,
  TESTNET_ADDRESSES,
  MAINNET_ADDRESSES,
  NETWORK_CONFIG,
} from '@gamedao/evm';

// Import types for TypeScript support
export type {
  NetworkAddresses,
  OrganizationInfo,
  OrganizationConfig,
  OrganizationState,
  MemberInfo,
  MemberState,
  MembershipTier,
  CampaignInfo,
  CampaignState,
  ProposalInfo,
  ProposalState,
  AchievementInfo,
  StakingPoolInfo,
  StakerInfo,
  ProfileInfo,
  TreasuryInfo,
  HexString,
} from '@gamedao/evm';
