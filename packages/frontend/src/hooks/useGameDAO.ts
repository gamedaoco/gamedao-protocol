'use client'

import { useAccount, useChainId } from 'wagmi'
import { CONTRACTS, getChainConfig } from '@/lib/web3'

export function useGameDAO() {
  const { address, isConnected, isConnecting } = useAccount()
  const chainId = useChainId()
  const chainConfig = getChainConfig(chainId)

  return {
    // Connection state
    address,
    isConnected,
    isConnecting,
    chainId,
    chainConfig,

    // Contract addresses
    contracts: CONTRACTS,

    // Helper functions
    isValidNetwork: chainId === 31337 || chainId === 11155111 || chainId === 1, // hardhat, sepolia, mainnet
    networkName: chainConfig.name,
    blockExplorer: chainConfig.blockExplorer,
    subgraphUrl: chainConfig.subgraphUrl,
  }
}
