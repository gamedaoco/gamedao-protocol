import { Address } from 'viem'

// Contract addresses by network
export interface ContractAddresses {
  REGISTRY: Address
  CONTROL: Address
  FLOW: Address
  SIGNAL: Address
  SENSE: Address
  STAKING: Address
}

// Default addresses (fallback)
const DEFAULT_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x0000000000000000000000000000000000000000',
  CONTROL: '0x0000000000000000000000000000000000000000',
  FLOW: '0x0000000000000000000000000000000000000000',
  SIGNAL: '0x0000000000000000000000000000000000000000',
  SENSE: '0x0000000000000000000000000000000000000000',
  STAKING: '0x0000000000000000000000000000000000000000',
}

/**
 * Get contract addresses from environment variables for a specific chain
 */
function getContractAddressesFromEnv(chainId: number): ContractAddresses {
  let suffix = ''

  switch (chainId) {
    case 31337:
      suffix = '_LOCAL'
      break
    case 11155111:
      suffix = '_SEPOLIA'
      break
    case 1:
      suffix = '_MAINNET'
      break
    case 137:
      suffix = '_POLYGON'
      break
    case 42161:
      suffix = '_ARBITRUM'
      break
    default:
      console.warn(`Unsupported chain ID: ${chainId}, using default addresses`)
      return DEFAULT_ADDRESSES
  }

  return {
    REGISTRY: (process.env[`NEXT_PUBLIC_REGISTRY_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.REGISTRY,
    CONTROL: (process.env[`NEXT_PUBLIC_CONTROL_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.CONTROL,
    FLOW: (process.env[`NEXT_PUBLIC_FLOW_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.FLOW,
    SIGNAL: (process.env[`NEXT_PUBLIC_SIGNAL_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.SIGNAL,
    SENSE: (process.env[`NEXT_PUBLIC_SENSE_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.SENSE,
    STAKING: (process.env[`NEXT_PUBLIC_STAKING_ADDRESS${suffix}`] as Address) || DEFAULT_ADDRESSES.STAKING,
  }
}

// Fallback hardcoded addresses for development (will be overridden by env vars)
const FALLBACK_ADDRESSES: Record<number, ContractAddresses> = {
  // Hardhat Local Network (31337)
  31337: {
    REGISTRY: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    CONTROL: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    FLOW: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    SIGNAL: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    SENSE: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    STAKING: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
  // Sepolia Testnet (11155111)
  11155111: DEFAULT_ADDRESSES,
  // Ethereum Mainnet (1)
  1: DEFAULT_ADDRESSES,
  // Polygon (137)
  137: DEFAULT_ADDRESSES,
  // Arbitrum One (42161)
  42161: DEFAULT_ADDRESSES,
}

/**
 * Get contract addresses for a specific chain
 * Prioritizes environment variables, falls back to hardcoded addresses
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  // First try to get from environment variables
  const envAddresses = getContractAddressesFromEnv(chainId)

  // Check if we got valid addresses from environment
  if (validateContractAddresses(envAddresses)) {
    console.log(`✅ Using contract addresses from environment for chain ${chainId}`)
    return envAddresses
  }

  // Fall back to hardcoded addresses
  const fallbackAddresses = FALLBACK_ADDRESSES[chainId] || DEFAULT_ADDRESSES
  if (validateContractAddresses(fallbackAddresses)) {
    console.log(`⚠️  Using fallback contract addresses for chain ${chainId}`)
    return fallbackAddresses
  }

  // Last resort - return default (zero) addresses
  console.warn(`❌ No valid contract addresses found for chain ${chainId}`)
  return DEFAULT_ADDRESSES
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
      // For now, return the configured addresses
      return getContractAddresses(chainId)
    }

    // For other networks, return the configured addresses
    return getContractAddresses(chainId)
  } catch (error) {
    console.warn(`Failed to load contract addresses for chain ${chainId}:`, error)
    return getContractAddresses(chainId)
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
 * Get deployment block numbers from environment variables
 */
function getDeploymentBlocksFromEnv(chainId: number): Record<string, number> {
  let suffix = ''

  switch (chainId) {
    case 31337:
      suffix = '_LOCAL'
      break
    case 11155111:
      suffix = '_SEPOLIA'
      break
    case 1:
      suffix = '_MAINNET'
      break
    case 137:
      suffix = '_POLYGON'
      break
    case 42161:
      suffix = '_ARBITRUM'
      break
    default:
      return {}
  }

  return {
    REGISTRY: parseInt(process.env[`NEXT_PUBLIC_REGISTRY_BLOCK${suffix}`] || '0'),
    CONTROL: parseInt(process.env[`NEXT_PUBLIC_CONTROL_BLOCK${suffix}`] || '0'),
    FLOW: parseInt(process.env[`NEXT_PUBLIC_FLOW_BLOCK${suffix}`] || '0'),
    SIGNAL: parseInt(process.env[`NEXT_PUBLIC_SIGNAL_BLOCK${suffix}`] || '0'),
    SENSE: parseInt(process.env[`NEXT_PUBLIC_SENSE_BLOCK${suffix}`] || '0'),
  }
}

/**
 * Contract deployment block numbers for event filtering
 */
export const DEPLOYMENT_BLOCKS: Record<number, Record<string, number>> = {
  31337: getDeploymentBlocksFromEnv(31337),
  11155111: getDeploymentBlocksFromEnv(11155111),
  1: getDeploymentBlocksFromEnv(1),
  137: getDeploymentBlocksFromEnv(137),
  42161: getDeploymentBlocksFromEnv(42161),
}

/**
 * Get deployment block for a contract on a specific chain
 */
export function getDeploymentBlock(chainId: number, contract: string): number {
  return DEPLOYMENT_BLOCKS[chainId]?.[contract] || 0
}

/**
 * Get the root GameDAO organization ID from environment or fallback
 */
export const GAMEDAO_ROOT_ORG_ID = (process.env.NEXT_PUBLIC_GAMEDAO_ROOT_ORG_ID as Address) ||
  '0xbe38856b378563a672fdbc9de3df0f8406006fc438a8fdf91c00f0925ec99d6d' as const

/**
 * Test data from deployment (can be overridden by environment variables)
 */
export const TEST_DATA = {
  organizationId: (process.env.NEXT_PUBLIC_TEST_ORGANIZATION_ID as Address) ||
    '0xbe38856b378563a672fdbc9de3df0f8406006fc438a8fdf91c00f0925ec99d6d',
  treasuryAddress: (process.env.NEXT_PUBLIC_TEST_TREASURY_ADDRESS as Address) ||
    '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
  campaignId: (process.env.NEXT_PUBLIC_TEST_CAMPAIGN_ID as Address) ||
    '0xdd07e835dd7aaa026d3694f9da0b52bf3dc28ece121c50642042fe42cf283b3b',
  proposalId: (process.env.NEXT_PUBLIC_TEST_PROPOSAL_ID as Address) ||
    '0xb224dd479fcaa620f924106f8c1be276fb8bcc61ecd9321cb522055a5da8b44a',
} as const

/**
 * Log current contract configuration for debugging
 */
export function logContractConfiguration(chainId: number): void {
  const addresses = getContractAddresses(chainId)
  const isValid = validateContractAddresses(addresses)

  console.log(`\n🔧 Contract Configuration for Chain ${chainId}:`)
  console.log(`   Valid: ${isValid ? '✅' : '❌'}`)
  console.log(`   REGISTRY: ${addresses.REGISTRY}`)
  console.log(`   CONTROL:  ${addresses.CONTROL}`)
  console.log(`   FLOW:     ${addresses.FLOW}`)
  console.log(`   SIGNAL:   ${addresses.SIGNAL}`)
  console.log(`   SENSE:    ${addresses.SENSE}`)

  if (!isValid) {
    console.log(`\n⚠️  To fix this, update your .env file with:`)
    console.log(`   NEXT_PUBLIC_REGISTRY_ADDRESS_${chainId === 31337 ? 'LOCAL' : 'SEPOLIA'}=0x...`)
    console.log(`   NEXT_PUBLIC_CONTROL_ADDRESS_${chainId === 31337 ? 'LOCAL' : 'SEPOLIA'}=0x...`)
    console.log(`   NEXT_PUBLIC_FLOW_ADDRESS_${chainId === 31337 ? 'LOCAL' : 'SEPOLIA'}=0x...`)
    console.log(`   NEXT_PUBLIC_SIGNAL_ADDRESS_${chainId === 31337 ? 'LOCAL' : 'SEPOLIA'}=0x...`)
    console.log(`   NEXT_PUBLIC_SENSE_ADDRESS_${chainId === 31337 ? 'LOCAL' : 'SEPOLIA'}=0x...`)
  }
}
