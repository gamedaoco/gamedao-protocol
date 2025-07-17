// GameDAO Protocol Constants

// Contract deployment order
export const DEPLOYMENT_ORDER = [
  'REGISTRY',
  'TREASURY',
  'CONTROL',
  'MEMBERSHIP',
  'FLOW',
  'SIGNAL',
  'SENSE',
  'IDENTITY',
  'STAKING',
] as const;

// Organization types
export const ORGANIZATION_TYPES = {
  DAO: 'DAO',
  GUILD: 'GUILD',
  COLLECTIVE: 'COLLECTIVE',
  COMPANY: 'COMPANY',
} as const;

// Member roles
export const MEMBER_ROLES = {
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;

// Voting types
export const VOTING_TYPES = {
  SIMPLE_MAJORITY: 'SIMPLE_MAJORITY',
  ABSOLUTE_MAJORITY: 'ABSOLUTE_MAJORITY',
  SUPERMAJORITY: 'SUPERMAJORITY',
  UNANIMOUS: 'UNANIMOUS',
} as const;

// Time constants (in seconds)
export const TIME_CONSTANTS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592000,
  YEAR: 31536000,
} as const;

// Default configuration values
export const DEFAULT_CONFIG = {
  VOTING_PERIOD: TIME_CONSTANTS.WEEK,
  QUORUM: 5000, // 50% in basis points
  MEMBERSHIP_FEE: 0,
  MAX_MEMBERS: 1000,
  PLATFORM_FEE: 250, // 2.5% in basis points
} as const;

// Gas limits for different operations
export const GAS_LIMITS = {
  CREATE_ORGANIZATION: 500000,
  ADD_MEMBER: 150000,
  REMOVE_MEMBER: 100000,
  CREATE_PROPOSAL: 200000,
  VOTE: 100000,
  EXECUTE_PROPOSAL: 300000,
  STAKE: 150000,
  UNSTAKE: 150000,
  CLAIM_REWARDS: 100000,
} as const;

// Event signatures
export const EVENT_SIGNATURES = {
  ORGANIZATION_CREATED: 'OrganizationCreated(string,string,address,bytes32)',
  MEMBER_ADDED: 'MemberAdded(string,address,uint8,uint256)',
  MEMBER_REMOVED: 'MemberRemoved(string,address,string)',
  PROPOSAL_CREATED: 'ProposalCreated(bytes32,string,string,address)',
  VOTE_CAST: 'VoteCast(bytes32,address,bool,uint256,string)',
  CAMPAIGN_CREATED: 'CampaignCreated(bytes32,string,string,address,uint256,uint256)',
  CONTRIBUTION_MADE: 'ContributionMade(bytes32,address,address,uint256)',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  MEMBER_NOT_FOUND: 'Member not found',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  INVALID_STATE: 'Invalid state',
  PROPOSAL_NOT_FOUND: 'Proposal not found',
  VOTING_PERIOD_ENDED: 'Voting period has ended',
  CAMPAIGN_NOT_FOUND: 'Campaign not found',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  INVALID_ADDRESS: 'Invalid address',
  INVALID_AMOUNT: 'Invalid amount',
} as const;

// Supported networks
export const SUPPORTED_NETWORKS = {
  ETHEREUM_MAINNET: 1,
  SEPOLIA_TESTNET: 11155111,
  LOCALHOST: 31337,
} as const;

// Token decimals
export const TOKEN_DECIMALS = {
  ETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  GAME: 18,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  SUBGRAPH: {
    MAINNET: 'https://api.thegraph.com/subgraphs/name/gamedao/gamedao-mainnet',
    TESTNET: 'https://api.thegraph.com/subgraphs/name/gamedao/gamedao-testnet',
    LOCAL: 'http://localhost:8000/subgraphs/name/gamedao/gamedao-local',
  },
  IPFS: {
    GATEWAY: 'https://ipfs.io/ipfs/',
    API: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  },
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_STAKING: true,
  ENABLE_GOVERNANCE: true,
  ENABLE_REPUTATION: true,
  ENABLE_ACHIEVEMENTS: true,
  ENABLE_CAMPAIGNS: true,
  ENABLE_IDENTITY: true,
} as const;

// Validation constants
export const VALIDATION = {
  MIN_ORGANIZATION_NAME_LENGTH: 3,
  MAX_ORGANIZATION_NAME_LENGTH: 50,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  MIN_VOTING_PERIOD: TIME_CONSTANTS.HOUR,
  MAX_VOTING_PERIOD: TIME_CONSTANTS.MONTH,
  MIN_QUORUM: 1000, // 10%
  MAX_QUORUM: 10000, // 100%
} as const;

// Contract interface IDs (EIP-165)
export const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC20: '0x36372b07',
  ERC721: '0x80ac58cd',
  ERC1155: '0xd9b67a26',
  GAME_DAO_REGISTRY: '0x12345678', // Placeholder
  GAME_DAO_MODULE: '0x87654321', // Placeholder
} as const;
