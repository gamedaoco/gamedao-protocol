import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { getContractAddresses, type ContractAddresses } from './contracts'

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

// Web3 configuration - with multiple wallet support
export const config = createConfig({
  chains: supportedChains,
  connectors: [
    // Injected connector - will detect Talisman, MetaMask, etc.
    injected({
      target() {
        return {
          id: 'injected',
          name: 'Browser Wallet',
          provider: typeof window !== 'undefined' ? window.ethereum : undefined,
        }
      },
    }),
    // MetaMask specific connector
    metaMask(),
    // Talisman-specific injected connector
    injected({
      target() {
        return {
          id: 'talisman',
          name: 'Talisman',
          provider: typeof window !== 'undefined' ? window.talismanEth : undefined,
        }
      },
    }),
    // WalletConnect for mobile wallets
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'GameDAO',
        description: 'Video Games Operating System for Communities',
        url: 'https://gamedao.co',
        icons: ['https://gamedao.co/favicon.ico'],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
})

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

// Contract ABI imports - these should be imported from the contracts package
// For now, we'll use empty arrays as placeholders
export const ABIS = {
  REGISTRY: [], // Will be populated with actual ABI
  CONTROL: [], // Will be populated with actual ABI
  FLOW: [], // Will be populated with actual ABI
  SIGNAL: [], // Will be populated with actual ABI
  SENSE: [], // Will be populated with actual ABI
} as const

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
