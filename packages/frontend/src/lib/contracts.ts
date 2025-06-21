import { Address } from 'viem'

// Contract addresses by network
export interface ContractAddresses {
  REGISTRY: Address
  CONTROL: Address
  FLOW: Address
  SIGNAL: Address
  SENSE: Address
}

// Default addresses (fallback)
const DEFAULT_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x0000000000000000000000000000000000000000',
  CONTROL: '0x0000000000000000000000000000000000000000',
  FLOW: '0x0000000000000000000000000000000000000000',
  SIGNAL: '0x0000000000000000000000000000000000000000',
  SENSE: '0x0000000000000000000000000000000000000000',
}

// Network-specific contract addresses
const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Hardhat Local Network (31337)
  31337: {
    REGISTRY: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    CONTROL: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    FLOW: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    SIGNAL: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    SENSE: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  },
  // Sepolia Testnet (11155111)
  11155111: {
    ...DEFAULT_ADDRESSES,
    // Will be populated when deployed to Sepolia
  },
  // Ethereum Mainnet (1)
  1: {
    ...DEFAULT_ADDRESSES,
    // Will be populated when deployed to Mainnet
  },
}

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  return CONTRACT_ADDRESSES[chainId] || DEFAULT_ADDRESSES
}

/**
 * Load contract addresses from deployment artifacts
 * This function will be called during build time or runtime to load
 * the latest deployed contract addresses
 */
export async function loadContractAddresses(chainId: number): Promise<ContractAddresses> {
  try {
    // For local development, try to load from deployment artifacts
    if (chainId === 31337) {
      // Try to load from the contracts package deployment artifacts
      const deploymentPath = `../../contracts-solidity/deployments/localhost`

      // This would be dynamically imported in a real implementation
      // For now, return the hardcoded addresses
      return CONTRACT_ADDRESSES[31337] || DEFAULT_ADDRESSES
    }

    // For other networks, return the configured addresses
    return CONTRACT_ADDRESSES[chainId] || DEFAULT_ADDRESSES
  } catch (error) {
    console.warn(`Failed to load contract addresses for chain ${chainId}:`, error)
    return CONTRACT_ADDRESSES[chainId] || DEFAULT_ADDRESSES
  }
}

/**
 * Validate that all required contracts are deployed
 */
export function validateContractAddresses(addresses: ContractAddresses): boolean {
  const requiredContracts = ['REGISTRY', 'CONTROL', 'FLOW', 'SIGNAL', 'SENSE'] as const

  return requiredContracts.every(contract => {
    const address = addresses[contract]
    return address && address !== '0x0000000000000000000000000000000000000000'
  })
}

/**
 * Get the root GameDAO organization ID
 * This would typically be stored in the Registry contract
 */
export const GAMEDAO_ROOT_ORG_ID = '0x17bc1d94a4a33ae8a4aa4d018fad2c32e07f7c9e6cf655cfbef783b7a910a55c' as const

/**
 * Contract deployment block numbers for event filtering
 */
export const DEPLOYMENT_BLOCKS: Record<number, Record<string, number>> = {
  31337: {
    REGISTRY: 0,
    CONTROL: 0,
    FLOW: 0,
    SIGNAL: 0,
    SENSE: 0,
  },
  11155111: {
    // Sepolia deployment blocks
    REGISTRY: 0,
    CONTROL: 0,
    FLOW: 0,
    SIGNAL: 0,
    SENSE: 0,
  },
  1: {
    // Mainnet deployment blocks
    REGISTRY: 0,
    CONTROL: 0,
    FLOW: 0,
    SIGNAL: 0,
    SENSE: 0,
  },
}

/**
 * Get deployment block for a contract on a specific chain
 */
export function getDeploymentBlock(chainId: number, contract: string): number {
  return DEPLOYMENT_BLOCKS[chainId]?.[contract] || 0
}
