'use client'

import { useAccount, useChainId } from 'wagmi'
import { getChainConfig, getContracts, isSupportedNetwork } from '@/lib/web3'
import { validateContractAddresses, GAMEDAO_ROOT_ORG_ID } from '@/lib/contracts'

export function useGameDAO() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Get chain configuration
  const chainConfig = getChainConfig(chainId)

  // Get contract addresses for current chain
  const contracts = getContracts(chainId)

  // Validate that contracts are properly deployed
  const contractsValid = validateContractAddresses(contracts)

  // Check if we're on a supported network
  const isSupported = isSupportedNetwork(chainId)

  return {
    // Account info
    address,
    isConnected: isConnected && isSupported,

    // Network info
    chainId,
    networkName: chainConfig.name,
    blockExplorer: chainConfig.blockExplorer,
    subgraphUrl: chainConfig.subgraphUrl,
    rpcUrl: chainConfig.rpcUrl,
    isSupported,

    // Contract info
    contracts,
    contractsValid,

    // GameDAO specific
    rootOrgId: GAMEDAO_ROOT_ORG_ID,

    // Helper functions
    formatAddress: (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,

    // Network status
    isLocal: chainId === 31337,
    isTestnet: chainId === 11155111,
    isMainnet: chainId === 1,
  }
}
