import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { getContractAddresses, logContractConfiguration, type ContractAddresses } from './contracts'

// Window type extension for Talisman
declare global {
  interface Window {
    talismanEth?: any
  }
}

// Supported chains for GameDAO
export const supportedChains = [
  hardhat, // Local development
  sepolia, // Testnet
  mainnet, // Production (when ready)
] as const

// NOTE: Web3 configuration moved to Web3Provider to handle client-side only initialization
// This prevents SSR issues with WalletConnect's indexedDB usage
// See: packages/frontend/src/providers/web3-provider.tsx

// Chain-specific configuration
export const getChainConfig = (chainId: number) => {
  switch (chainId) {
    case hardhat.id:
      return {
        name: 'Local Hardhat',
        blockExplorer: 'http://localhost:8545',
        subgraphUrl: 'http://localhost:8000/subgraphs/name/gamedao/protocol',
        rpcUrl: 'http://127.0.0.1:8545',
      }
    case sepolia.id:
      return {
        name: 'Sepolia Testnet',
        blockExplorer: 'https://sepolia.etherscan.io',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol-sepolia',
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      }
    case mainnet.id:
      return {
        name: 'Ethereum Mainnet',
        blockExplorer: 'https://etherscan.io',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      }
    default:
      return {
        name: 'Unknown Network',
        blockExplorer: '',
        subgraphUrl: '',
        rpcUrl: '',
      }
  }
}

/**
 * Get contract addresses for the current chain
 */
export function getContracts(chainId: number): ContractAddresses {
  return getContractAddresses(chainId)
}

/**
 * Export CONTRACTS for backward compatibility
 */
export const CONTRACTS = getContracts

/**
 * Check if we're connected to a supported network
 */
export function isSupportedNetwork(chainId: number): boolean {
  return supportedChains.some(chain => chain.id === chainId)
}

/**
 * Get the preferred network for development
 */
export function getPreferredNetwork() {
  // In development, prefer local hardhat network
  if (process.env.NODE_ENV === 'development') {
    return hardhat
  }
  // In production, prefer mainnet
  return mainnet
}

// Contract ABI imports
export { ABIS } from './abis'

// Log contract configuration in development (client-side only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 Web3 Configuration:')
  console.log('  Chains:', supportedChains.map(c => `${c.name} (${c.id})`).join(', '))

  // Log contract configuration for all supported chains
  supportedChains.forEach(chain => {
    logContractConfiguration(chain.id)
  })
}
