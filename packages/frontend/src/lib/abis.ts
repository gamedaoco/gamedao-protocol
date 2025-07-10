import { Abi } from 'viem'

// Import ABIs from deployment artifacts
// These would normally be imported from the contracts package
// For now, we'll define minimal ABIs for the key functions we need

export const REGISTRY_ABI = [
  {
    "inputs": [],
    "name": "getModuleCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "moduleId", "type": "bytes32"}],
    "name": "getModule",
    "outputs": [
      {"internalType": "address", "name": "implementation", "type": "address"},
      {"internalType": "bool", "name": "enabled", "type": "bool"},
      {"internalType": "string", "name": "version", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const CONTROL_ABI = [
  {
    "inputs": [],
    "name": "getOrganizationCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllOrganizations",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orgId", "type": "bytes32"}],
    "name": "getOrganization",
    "outputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "address", "name": "treasury", "type": "address"},
      {"internalType": "uint8", "name": "accessModel", "type": "uint8"},
      {"internalType": "uint8", "name": "feeModel", "type": "uint8"},
      {"internalType": "uint32", "name": "memberLimit", "type": "uint32"},
      {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "uint8", "name": "orgType", "type": "uint8"},
      {"internalType": "uint8", "name": "accessModel", "type": "uint8"},
      {"internalType": "uint8", "name": "feeModel", "type": "uint8"},
      {"internalType": "uint32", "name": "memberLimit", "type": "uint32"},
      {"internalType": "uint256", "name": "membershipFee", "type": "uint256"},
      {"internalType": "uint256", "name": "gameStakeRequired", "type": "uint256"}
    ],
    "name": "createOrganization",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "orgId", "type": "bytes32"},
      {"internalType": "address", "name": "member", "type": "address"}
    ],
    "name": "addMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "orgId", "type": "bytes32"},
      {"internalType": "address", "name": "member", "type": "address"}
    ],
    "name": "canJoinOrganization",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "treasury", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": false, "internalType": "uint8", "name": "accessModel", "type": "uint8"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "OrganizationCreated",
    "type": "event"
  }
] as const

export const FLOW_ABI = [
  {
    "inputs": [],
    "name": "getCampaignCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint8", "name": "state", "type": "uint8"}],
    "name": "getCampaignsByState",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
    "name": "getCampaign",
    "outputs": [
      {"internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "uint8", "name": "flowType", "type": "uint8"},
      {"internalType": "uint256", "name": "target", "type": "uint256"},
      {"internalType": "uint256", "name": "min", "type": "uint256"},
      {"internalType": "uint256", "name": "max", "type": "uint256"},
      {"internalType": "uint256", "name": "raised", "type": "uint256"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

export const SIGNAL_ABI = [
  {
    "inputs": [],
    "name": "getProposalCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveProposals",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "organizationId", "type": "bytes32"}],
    "name": "getProposalsByOrganization",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint8", "name": "state", "type": "uint8"}],
    "name": "getProposalsByState",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}],
    "name": "getProposal",
    "outputs": [
      {"internalType": "uint256", "name": "index", "type": "uint256"},
      {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"},
      {"internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"internalType": "address", "name": "proposer", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "uint8", "name": "proposalType", "type": "uint8"},
      {"internalType": "uint8", "name": "votingType", "type": "uint8"},
      {"internalType": "uint8", "name": "votingPower", "type": "uint8"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "uint256", "name": "executionTime", "type": "uint256"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
      {"internalType": "bytes", "name": "executionData", "type": "bytes"},
      {"internalType": "address", "name": "targetContract", "type": "address"},
      {"internalType": "uint256", "name": "requiredQuorum", "type": "uint256"},
      {"internalType": "uint256", "name": "votesFor", "type": "uint256"},
      {"internalType": "uint256", "name": "votesAgainst", "type": "uint256"},
      {"internalType": "uint256", "name": "votesAbstain", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVotingPower", "type": "uint256"},
      {"internalType": "bool", "name": "executed", "type": "bool"},
      {"internalType": "bool", "name": "cancelled", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}],
    "name": "getProposalResult",
    "outputs": [
      {"internalType": "bool", "name": "passed", "type": "bool"},
      {"internalType": "uint256", "name": "forVotes", "type": "uint256"},
      {"internalType": "uint256", "name": "againstVotes", "type": "uint256"},
      {"internalType": "uint256", "name": "abstainVotes", "type": "uint256"},
      {"internalType": "uint256", "name": "quorum", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"},
      {"internalType": "address", "name": "voter", "type": "address"}
    ],
    "name": "hasVoted",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"},
      {"internalType": "address", "name": "voter", "type": "address"}
    ],
    "name": "canVote",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"},
      {"internalType": "address", "name": "voter", "type": "address"}
    ],
    "name": "getVotingPower",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}],
    "name": "getTimeRemaining",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"},
      {"internalType": "uint8", "name": "choice", "type": "uint8"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "uint8", "name": "proposalType", "type": "uint8"},
      {"internalType": "uint8", "name": "votingType", "type": "uint8"},
      {"internalType": "uint8", "name": "votingPower", "type": "uint8"},
      {"internalType": "uint256", "name": "votingPeriod", "type": "uint256"},
      {"internalType": "bytes", "name": "executionData", "type": "bytes"},
      {"internalType": "address", "name": "targetContract", "type": "address"}
    ],
    "name": "createProposal",
    "outputs": [{"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const SENSE_ABI = [
  {
    "inputs": [],
    "name": "getProfileCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getProfile",
    "outputs": [
      {"internalType": "bytes32", "name": "id", "type": "bytes32"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "bool", "name": "active", "type": "bool"},
      {"internalType": "bool", "name": "verified", "type": "bool"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const STAKING_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "poolId", "type": "string"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "poolId", "type": "string"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "poolId", "type": "string"}],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const ABIS = {
  REGISTRY: REGISTRY_ABI as Abi,
  CONTROL: CONTROL_ABI as Abi,
  FLOW: FLOW_ABI as Abi,
  SIGNAL: SIGNAL_ABI as Abi,
  SENSE: SENSE_ABI as Abi,
  STAKING: STAKING_ABI as Abi,
} as const

// Type exports for better TypeScript support
export type RegistryABI = typeof REGISTRY_ABI
export type ControlABI = typeof CONTROL_ABI
export type FlowABI = typeof FLOW_ABI
export type SignalABI = typeof SIGNAL_ABI
export type SenseABI = typeof SENSE_ABI
export type StakingABI = typeof STAKING_ABI
