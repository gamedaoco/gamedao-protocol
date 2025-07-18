import { Address } from 'viem'
import { getAddressesForNetwork, type NetworkAddresses } from '@gamedao/evm'

// Contract addresses by network - using shared package types
export interface ContractAddresses extends NetworkAddresses {
  GAME_TOKEN: Address
  USDC_TOKEN: Address
}

// Default addresses (fallback)
const DEFAULT_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x0000000000000000000000000000000000000000' as Address,
  CONTROL: '0x0000000000000000000000000000000000000000' as Address,
  FLOW: '0x0000000000000000000000000000000000000000' as Address,
  SIGNAL: '0x0000000000000000000000000000000000000000' as Address,
  SENSE: '0x0000000000000000000000000000000000000000' as Address,
  IDENTITY: '0x0000000000000000000000000000000000000000' as Address,
  MEMBERSHIP: '0x0000000000000000000000000000000000000000' as Address,
  STAKING: '0x0000000000000000000000000000000000000000' as Address,
  TREASURY: '0x0000000000000000000000000000000000000000' as Address,
  GAME_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
  USDC_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
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
      suffix = '_LOCAL'
  }

  return {
    REGISTRY: (process.env[`NEXT_PUBLIC_REGISTRY_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.REGISTRY) as Address,
    CONTROL: (process.env[`NEXT_PUBLIC_CONTROL_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.CONTROL) as Address,
    FLOW: (process.env[`NEXT_PUBLIC_FLOW_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.FLOW) as Address,
    SIGNAL: (process.env[`NEXT_PUBLIC_SIGNAL_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.SIGNAL) as Address,
    SENSE: (process.env[`NEXT_PUBLIC_SENSE_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.SENSE) as Address,
    IDENTITY: (process.env[`NEXT_PUBLIC_IDENTITY_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.IDENTITY) as Address,
    MEMBERSHIP: (process.env[`NEXT_PUBLIC_MEMBERSHIP_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.MEMBERSHIP) as Address,
    STAKING: (process.env[`NEXT_PUBLIC_STAKING_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.STAKING) as Address,
    TREASURY: (process.env[`NEXT_PUBLIC_TREASURY_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.TREASURY) as Address,
    GAME_TOKEN: (process.env[`NEXT_PUBLIC_GAME_TOKEN_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.GAME_TOKEN) as Address,
    USDC_TOKEN: (process.env[`NEXT_PUBLIC_USDC_TOKEN_ADDRESS${suffix}`] || DEFAULT_ADDRESSES.USDC_TOKEN) as Address,
  }
}

/**
 * Get contract addresses from deployment file
 */
function getContractAddressesFromDeployment(chainId: number): ContractAddresses {
  try {
    // Try to import deployment addresses (this would be populated by deployment scripts)
    // For now, we'll use environment variables as the primary source
    return getContractAddressesFromEnv(chainId)
  } catch (error) {
    console.warn('Could not load deployment addresses, using environment variables')
    return getContractAddressesFromEnv(chainId)
  }
}

/**
 * Get contract addresses with fallback priority:
 * 1. Environment variables (highest priority)
 * 2. Deployment file
 * 3. Default zero addresses (lowest priority)
 */
export function getContractAddresses(chainId: number): ContractAddresses {
  const envAddresses = getContractAddressesFromEnv(chainId)
  const deploymentAddresses = getContractAddressesFromDeployment(chainId)

  // Merge addresses with priority: env > deployment > default
  const addresses: ContractAddresses = {
    REGISTRY: envAddresses.REGISTRY !== DEFAULT_ADDRESSES.REGISTRY ? envAddresses.REGISTRY : deploymentAddresses.REGISTRY,
    CONTROL: envAddresses.CONTROL !== DEFAULT_ADDRESSES.CONTROL ? envAddresses.CONTROL : deploymentAddresses.CONTROL,
    FLOW: envAddresses.FLOW !== DEFAULT_ADDRESSES.FLOW ? envAddresses.FLOW : deploymentAddresses.FLOW,
    SIGNAL: envAddresses.SIGNAL !== DEFAULT_ADDRESSES.SIGNAL ? envAddresses.SIGNAL : deploymentAddresses.SIGNAL,
    SENSE: envAddresses.SENSE !== DEFAULT_ADDRESSES.SENSE ? envAddresses.SENSE : deploymentAddresses.SENSE,
    IDENTITY: envAddresses.IDENTITY !== DEFAULT_ADDRESSES.IDENTITY ? envAddresses.IDENTITY : deploymentAddresses.IDENTITY,
    MEMBERSHIP: envAddresses.MEMBERSHIP !== DEFAULT_ADDRESSES.MEMBERSHIP ? envAddresses.MEMBERSHIP : deploymentAddresses.MEMBERSHIP,
    STAKING: envAddresses.STAKING !== DEFAULT_ADDRESSES.STAKING ? envAddresses.STAKING : deploymentAddresses.STAKING,
    TREASURY: envAddresses.TREASURY !== DEFAULT_ADDRESSES.TREASURY ? envAddresses.TREASURY : deploymentAddresses.TREASURY,
    GAME_TOKEN: envAddresses.GAME_TOKEN !== DEFAULT_ADDRESSES.GAME_TOKEN ? envAddresses.GAME_TOKEN : deploymentAddresses.GAME_TOKEN,
    USDC_TOKEN: envAddresses.USDC_TOKEN !== DEFAULT_ADDRESSES.USDC_TOKEN ? envAddresses.USDC_TOKEN : deploymentAddresses.USDC_TOKEN,
  }

  return addresses
}

/**
 * Validate that all required contract addresses are set
 */
export function validateContractAddresses(addresses: ContractAddresses): boolean {
  const requiredContracts = ['REGISTRY', 'CONTROL', 'FLOW', 'SIGNAL', 'SENSE', 'IDENTITY', 'MEMBERSHIP', 'STAKING', 'GAME_TOKEN'] as const

  for (const contract of requiredContracts) {
    if (!addresses[contract] || addresses[contract] === DEFAULT_ADDRESSES[contract]) {
      console.warn(`❌ Missing contract address for ${contract}`)
      return false
    }
  }

  return true
}

/**
 * Log contract configuration for debugging
 */
export function logContractConfiguration(chainId: number): void {
  const addresses = getContractAddresses(chainId)
  const isValid = validateContractAddresses(addresses)

  console.log(`🔧 Contract Configuration for Chain ${chainId}:`)
  console.log(`   Valid: ${isValid ? '✅' : '❌'}`)
  console.log(`   REGISTRY: ${addresses.REGISTRY}`)
  console.log(`   CONTROL:  ${addresses.CONTROL}`)
  console.log(`   FLOW:     ${addresses.FLOW}`)
  console.log(`   SIGNAL:   ${addresses.SIGNAL}`)
  console.log(`   SENSE:    ${addresses.SENSE}`)
  console.log(`   IDENTITY: ${addresses.IDENTITY}`)
  console.log(`   MEMBERSHIP: ${addresses.MEMBERSHIP}`)
  console.log(`   STAKING:  ${addresses.STAKING}`)
  console.log(`   TREASURY: ${addresses.TREASURY}`)
  console.log(`   GAME_TOKEN: ${addresses.GAME_TOKEN}`)
  console.log(`   USDC_TOKEN: ${addresses.USDC_TOKEN}`)

  if (!isValid) {
    console.warn('⚠️  Some contract addresses are missing. Please check your environment variables or deployment.')
  }
}

// Export individual contract address getters for convenience
export const getRegistryAddress = (chainId: number): Address => getContractAddresses(chainId).REGISTRY
export const getControlAddress = (chainId: number): Address => getContractAddresses(chainId).CONTROL
export const getFlowAddress = (chainId: number): Address => getContractAddresses(chainId).FLOW
export const getSignalAddress = (chainId: number): Address => getContractAddresses(chainId).SIGNAL
export const getSenseAddress = (chainId: number): Address => getContractAddresses(chainId).SENSE
export const getIdentityAddress = (chainId: number): Address => getContractAddresses(chainId).IDENTITY
export const getMembershipAddress = (chainId: number): Address => getContractAddresses(chainId).MEMBERSHIP
export const getStakingAddress = (chainId: number): Address => getContractAddresses(chainId).STAKING
export const getTreasuryAddress = (chainId: number): Address => getContractAddresses(chainId).TREASURY
export const getGameTokenAddress = (chainId: number): Address => getContractAddresses(chainId).GAME_TOKEN
export const getUSDCTokenAddress = (chainId: number): Address => getContractAddresses(chainId).USDC_TOKEN

// Local development addresses (for reference)
export const LOCAL_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as Address,
  CONTROL: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as Address,
  FLOW: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as Address,
  SIGNAL: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' as Address,
  SENSE: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' as Address,
  IDENTITY: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' as Address, // Same as Sense for now
  MEMBERSHIP: '0x0165878A594ca255338adfa4d48449f69242Eb8F' as Address, // New GameDAO Membership
  STAKING: '0xc5a5C42992dECbae36851359345FE25997F5C42d' as Address,
  TREASURY: '0x0000000000000000000000000000000000000000' as Address, // Treasury contract
  GAME_TOKEN: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
  USDC_TOKEN: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
}

// Testnet addresses (placeholder - update when deployed)
export const TESTNET_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x0000000000000000000000000000000000000000' as Address,
  CONTROL: '0x0000000000000000000000000000000000000000' as Address,
  FLOW: '0x0000000000000000000000000000000000000000' as Address,
  SIGNAL: '0x0000000000000000000000000000000000000000' as Address,
  SENSE: '0x0000000000000000000000000000000000000000' as Address,
  IDENTITY: '0x0000000000000000000000000000000000000000' as Address,
  MEMBERSHIP: '0x0000000000000000000000000000000000000000' as Address,
  STAKING: '0x0000000000000000000000000000000000000000' as Address,
  TREASURY: '0x0000000000000000000000000000000000000000' as Address,
  GAME_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
  USDC_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
}

// Mainnet addresses (placeholder - update when deployed)
export const MAINNET_ADDRESSES: ContractAddresses = {
  REGISTRY: '0x0000000000000000000000000000000000000000' as Address,
  CONTROL: '0x0000000000000000000000000000000000000000' as Address,
  FLOW: '0x0000000000000000000000000000000000000000' as Address,
  SIGNAL: '0x0000000000000000000000000000000000000000' as Address,
  SENSE: '0x0000000000000000000000000000000000000000' as Address,
  IDENTITY: '0x0000000000000000000000000000000000000000' as Address,
  MEMBERSHIP: '0x0000000000000000000000000000000000000000' as Address,
  STAKING: '0x0000000000000000000000000000000000000000' as Address,
  TREASURY: '0x0000000000000000000000000000000000000000' as Address,
  GAME_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
  USDC_TOKEN: '0x0000000000000000000000000000000000000000' as Address,
}

// Export network-specific addresses
export const NETWORK_ADDRESSES: Record<number, ContractAddresses> = {
  31337: LOCAL_ADDRESSES,
  11155111: TESTNET_ADDRESSES,
  1: MAINNET_ADDRESSES,
  137: MAINNET_ADDRESSES, // Polygon
  42161: MAINNET_ADDRESSES, // Arbitrum
}

// Helper function to get addresses by network
export function getAddressesByNetwork(chainId: number): ContractAddresses {
  return NETWORK_ADDRESSES[chainId] || LOCAL_ADDRESSES
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
    case 1946: // Soneium Minato Testnet
      suffix = '_SONEIUM_TESTNET'
      break
    case 1868: // Soneium Mainnet (placeholder - check actual chain ID)
      suffix = '_SONEIUM'
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
  1946: getDeploymentBlocksFromEnv(1946), // Soneium Minato Testnet
  1868: getDeploymentBlocksFromEnv(1868), // Soneium Mainnet
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
