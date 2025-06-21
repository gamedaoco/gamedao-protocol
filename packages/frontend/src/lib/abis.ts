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
      {"internalType": "uint8", "name": "accessModel", "type": "uint8"},
      {"internalType": "uint32", "name": "memberLimit", "type": "uint32"}
    ],
    "name": "createOrganization",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
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
    "inputs": [{"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}],
    "name": "getProposal",
    "outputs": [
      {"internalType": "bytes32", "name": "organizationId", "type": "bytes32"},
      {"internalType": "address", "name": "proposer", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "uint8", "name": "proposalType", "type": "uint8"},
      {"internalType": "uint8", "name": "votingType", "type": "uint8"},
      {"internalType": "uint8", "name": "state", "type": "uint8"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"}
    ],
    "stateMutability": "view",
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

export const ABIS = {
  REGISTRY: REGISTRY_ABI as Abi,
  CONTROL: CONTROL_ABI as Abi,
  FLOW: FLOW_ABI as Abi,
  SIGNAL: SIGNAL_ABI as Abi,
  SENSE: SENSE_ABI as Abi,
} as const

// Type exports for better TypeScript support
export type RegistryABI = typeof REGISTRY_ABI
export type ControlABI = typeof CONTROL_ABI
export type FlowABI = typeof FLOW_ABI
export type SignalABI = typeof SIGNAL_ABI
export type SenseABI = typeof SENSE_ABI
