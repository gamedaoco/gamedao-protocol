import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// GameDAO Protocol Contract Addresses
export const CONTRACTS = {
  // Deployed addresses from our testing
  REGISTRY: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d' as const,
  CONTROL: '0x59b670e9fA9D0A427751Af201D676719a970857b' as const,
  FLOW: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1' as const,
  // Signal and Sense will be added when deployed
  SIGNAL: '0x0000000000000000000000000000000000000000' as const,
  SENSE: '0x0000000000000000000000000000000000000000' as const,
} as const

// Supported chains for GameDAO
export const supportedChains = [
  hardhat, // Local development
  sepolia, // Testnet
  mainnet, // Production (when ready)
] as const

// Web3 configuration - simplified for SSR compatibility
export const config = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    metaMask(),
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
      }
    case sepolia.id:
      return {
        name: 'Sepolia Testnet',
        blockExplorer: 'https://sepolia.etherscan.io',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol-sepolia',
      }
    case mainnet.id:
      return {
        name: 'Ethereum Mainnet',
        blockExplorer: 'https://etherscan.io',
        subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gamedao/protocol',
      }
    default:
      return {
        name: 'Unknown Network',
        blockExplorer: '',
        subgraphUrl: '',
      }
  }
}

// Contract ABI imports (these will be generated from our contracts)
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
