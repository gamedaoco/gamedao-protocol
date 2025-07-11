import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat, polygon } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { getContractAddresses, logContractConfiguration, type ContractAddresses } from './contracts'

// Window type extension for Talisman
declare global {
  interface Window {
    talismanEth?: any
  }
}

// Define Soneium networks
export const soneiumMinato = {
  id: 1946,
  name: 'Soneium Minato Testnet',
  network: 'soneium-minato',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.minato.soneium.org'],
    },
    public: {
      http: ['https://rpc.minato.soneium.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Soneium Explorer',
      url: 'https://explorer-testnet.soneium.org',
    },
  },
} as const

export const soneium = {
  id: 1868,
  name: 'Soneium',
  network: 'soneium',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.soneium.org'],
    },
    public: {
      http: ['https://rpc.soneium.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Soneium Explorer',
      url: 'https://explorer.soneium.org',
    },
  },
} as const

// Supported chains for GameDAO
export const supportedChains = [
  hardhat, // Local development
  sepolia, // Testnet
  soneiumMinato, // Soneium Testnet
  polygon, // Polygon Mainnet
  soneium, // Soneium Mainnet
  mainnet, // Ethereum Mainnet (when ready)
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
    case soneiumMinato.id:
      return {
        name: 'Soneium Minato Testnet',
        blockExplorer: 'https://explorer-testnet.soneium.org',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol-soneium-testnet',
        rpcUrl: 'https://rpc.minato.soneium.org',
      }
    case polygon.id:
      return {
        name: 'Polygon',
        blockExplorer: 'https://polygonscan.com',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol-polygon',
        rpcUrl: 'https://polygon-rpc.com',
      }
    case soneium.id:
      return {
        name: 'Soneium',
        blockExplorer: 'https://explorer.soneium.org',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol-soneium',
        rpcUrl: 'https://rpc.soneium.org',
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

/**
 * Log contract configuration for the active chain only
 * Should be called from useGameDAO when chain changes
 */
export function logActiveChainConfiguration(chainId: number) {
  if (process.env.NODE_ENV === 'development') {
    const chainConfig = getChainConfig(chainId)
    console.log(`🔧 Active Chain Configuration (${chainId}):`)
    console.log(`  Network: ${chainConfig.name}`)
    console.log(`  Supported: ${isSupportedNetwork(chainId) ? '✅' : '❌'}`)

    // Log contract configuration for the active chain only
    logContractConfiguration(chainId)
  }
}
