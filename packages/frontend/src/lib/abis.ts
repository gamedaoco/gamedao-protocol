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
      {"internalType": "uint256", "name": "memberLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "membershipFee", "type": "uint256"},
      {"internalType": "uint256", "name": "gameStakeRequired", "type": "uint256"}
    ],
    "name": "createOrganization",
    "outputs": [{"internalType": "bytes8", "name": "", "type": "bytes8"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"internalType": "address", "name": "member", "type": "address"}
    ],
    "name": "addMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "id", "type": "bytes8"}
    ],
    "name": "getOrganization",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes8", "name": "id", "type": "bytes8"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "metadataURI", "type": "string"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "address", "name": "treasury", "type": "address"},
          {"internalType": "uint8", "name": "orgType", "type": "uint8"},
          {"internalType": "uint8", "name": "accessModel", "type": "uint8"},
          {"internalType": "uint8", "name": "feeModel", "type": "uint8"},
          {"internalType": "uint256", "name": "memberLimit", "type": "uint256"},
          {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
          {"internalType": "uint256", "name": "totalCampaigns", "type": "uint256"},
          {"internalType": "uint256", "name": "totalProposals", "type": "uint256"},
          {"internalType": "uint256", "name": "membershipFee", "type": "uint256"},
          {"internalType": "uint256", "name": "gameStakeRequired", "type": "uint256"},
          {"internalType": "uint8", "name": "state", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}
        ],
        "internalType": "struct IControl.Organization",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
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
    "outputs": [
      {
        "components": [
          {"internalType": "bytes8", "name": "id", "type": "bytes8"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "metadataURI", "type": "string"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "address", "name": "treasury", "type": "address"},
          {"internalType": "uint8", "name": "orgType", "type": "uint8"},
          {"internalType": "uint8", "name": "accessModel", "type": "uint8"},
          {"internalType": "uint8", "name": "feeModel", "type": "uint8"},
          {"internalType": "uint256", "name": "memberLimit", "type": "uint256"},
          {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
          {"internalType": "uint256", "name": "totalCampaigns", "type": "uint256"},
          {"internalType": "uint256", "name": "totalProposals", "type": "uint256"},
          {"internalType": "uint256", "name": "membershipFee", "type": "uint256"},
          {"internalType": "uint256", "name": "gameStakeRequired", "type": "uint256"},
          {"internalType": "uint8", "name": "state", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}
        ],
        "internalType": "struct IControl.Organization[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"}
    ],
    "name": "isMember",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"}
    ],
    "name": "getMemberCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"}
    ],
    "name": "isOrganizationActive",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes8", "name": "id", "type": "bytes8"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "treasury", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "OrganizationCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"indexed": true, "internalType": "address", "name": "member", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "MemberAdded",
    "type": "event"
  }
] as const

export const FLOW_ABI = [
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "uint8", "name": "flowType", "type": "uint8"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "uint256", "name": "target", "type": "uint256"},
      {"internalType": "uint256", "name": "min", "type": "uint256"},
      {"internalType": "uint256", "name": "max", "type": "uint256"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "bool", "name": "autoFinalize", "type": "bool"}
    ],
    "name": "createCampaign",
    "outputs": [{"internalType": "bytes32", "name": "campaignId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
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
  // Core proposal functions
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
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
    "outputs": [{"internalType": "string", "name": "hierarchicalId", "type": "string"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "hierarchicalId", "type": "string"}
    ],
    "name": "getProposal",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "hierarchicalId", "type": "string"},
          {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
          {"internalType": "address", "name": "creator", "type": "address"},
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
          {"internalType": "uint256", "name": "forVotes", "type": "uint256"},
          {"internalType": "uint256", "name": "againstVotes", "type": "uint256"},
          {"internalType": "uint256", "name": "abstainVotes", "type": "uint256"},
          {"internalType": "bytes", "name": "executionData", "type": "bytes"},
          {"internalType": "address", "name": "targetContract", "type": "address"},
          {"internalType": "address", "name": "executor", "type": "address"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "executedAt", "type": "uint256"}
        ],
        "internalType": "struct ISignal.Proposal",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Voting functions
  {
    "inputs": [
      {"internalType": "string", "name": "hierarchicalId", "type": "string"},
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
      {"internalType": "string", "name": "hierarchicalId", "type": "string"},
      {"internalType": "uint8", "name": "choice", "type": "uint8"},
      {"internalType": "uint256", "name": "convictionTime", "type": "uint256"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "castVoteWithConviction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "hierarchicalId", "type": "string"},
      {"internalType": "address", "name": "voter", "type": "address"}
    ],
    "name": "getVote",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "voter", "type": "address"},
          {"internalType": "uint8", "name": "choice", "type": "uint8"},
          {"internalType": "uint256", "name": "votingPower", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "string", "name": "reason", "type": "string"},
          {"internalType": "bool", "name": "hasVoted", "type": "bool"},
          {"internalType": "uint256", "name": "convictionTime", "type": "uint256"},
          {"internalType": "uint256", "name": "convictionMultiplier", "type": "uint256"}
        ],
        "internalType": "struct ISignal.Vote",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Delegation functions
  {
    "inputs": [
      {"internalType": "address", "name": "delegatee", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "delegateVotingPower",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "delegatee", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "undelegateVotingPower",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "uint8", "name": "votingPowerType", "type": "uint8"}
    ],
    "name": "getVotingPowerWithDelegation",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Conviction voting utilities
  {
    "inputs": [
      {"internalType": "uint256", "name": "convictionTime", "type": "uint256"}
    ],
    "name": "calculateConvictionMultiplier",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "pure",
    "type": "function"
  },

  // Query functions
  {
    "inputs": [],
    "name": "getProposalCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes8", "name": "organizationId", "type": "bytes8"}],
    "name": "getProposalsByOrganization",
    "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "hierarchicalId", "type": "string"},
      {"indexed": true, "internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "title", "type": "string"},
      {"indexed": false, "internalType": "uint8", "name": "proposalType", "type": "uint8"},
      {"indexed": false, "internalType": "uint8", "name": "votingType", "type": "uint8"},
      {"indexed": false, "internalType": "uint256", "name": "votingPeriod", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256"}
    ],
    "name": "ProposalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "hierarchicalId", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "voter", "type": "address"},
      {"indexed": false, "internalType": "uint8", "name": "choice", "type": "uint8"},
      {"indexed": false, "internalType": "uint256", "name": "votingPower", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "string", "name": "hierarchicalId", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "voter", "type": "address"},
      {"indexed": false, "internalType": "uint8", "name": "choice", "type": "uint8"},
      {"indexed": false, "internalType": "uint256", "name": "votingPower", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "convictionMultiplier", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "convictionTime", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "ConvictionVoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "delegator", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "delegatee", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "VotingPowerDelegated",
    "type": "event"
  }
] as const

export const SENSE_ABI = [
  {
    "inputs": [
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"internalType": "string", "name": "metadata", "type": "string"}
    ],
    "name": "createProfile",
    "outputs": [{"internalType": "bytes32", "name": "profileId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
      {"internalType": "bytes8", "name": "organizationId", "type": "bytes8"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "bool", "name": "active", "type": "bool"},
      {"internalType": "bool", "name": "verified", "type": "bool"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Name claiming functions
  {
    "inputs": [
      {"internalType": "bytes8", "name": "name", "type": "bytes8"},
      {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "stakeDuration", "type": "uint256"},
      {"internalType": "uint8", "name": "nameType", "type": "uint8"}
    ],
    "name": "claimName",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes8", "name": "name", "type": "bytes8"}],
    "name": "releaseName",
    "outputs": [{"internalType": "uint256", "name": "stakeAmount", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes8", "name": "name", "type": "bytes8"}],
    "name": "isNameAvailable",
    "outputs": [{"internalType": "bool", "name": "available", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes8", "name": "name", "type": "bytes8"}],
    "name": "getNameClaim",
    "outputs": [
      {"internalType": "bytes8", "name": "name", "type": "bytes8"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "stakeDuration", "type": "uint256"},
      {"internalType": "uint256", "name": "claimedAt", "type": "uint256"},
      {"internalType": "uint256", "name": "expiresAt", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "uint8", "name": "nameType", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "getNamesOwnedBy",
    "outputs": [{"internalType": "bytes8[]", "name": "names", "type": "bytes8[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes8", "name": "name", "type": "bytes8"}],
    "name": "validateNameFormat",
    "outputs": [{"internalType": "bool", "name": "valid", "type": "bool"}],
    "stateMutability": "pure",
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

export const GAME_TOKEN_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const USDC_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
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
  GAME_TOKEN: GAME_TOKEN_ABI as Abi,
  USDC: USDC_ABI as Abi,
} as const

// Type exports for better TypeScript support
export type RegistryABI = typeof REGISTRY_ABI
export type ControlABI = typeof CONTROL_ABI
export type FlowABI = typeof FLOW_ABI
export type SignalABI = typeof SIGNAL_ABI
export type SenseABI = typeof SENSE_ABI
export type StakingABI = typeof STAKING_ABI
export type GameTokenABI = typeof GAME_TOKEN_ABI
export type UsdcABI = typeof USDC_ABI
