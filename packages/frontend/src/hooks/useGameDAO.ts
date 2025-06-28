'use client'

import { useMemo, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getChainConfig, getContracts, isSupportedNetwork, logActiveChainConfiguration } from '@/lib/web3'
import { validateContractAddresses, GAMEDAO_ROOT_ORG_ID } from '@/lib/contracts'

export function useGameDAO() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  // Memoize chain configuration
  const chainConfig = useMemo(() => getChainConfig(chainId), [chainId])

  // Memoize contract addresses for current chain
  const contracts = useMemo(() => getContracts(chainId), [chainId])

  // Memoize contract validation
  const contractsValid = useMemo(() => validateContractAddresses(contracts), [contracts])

  // Memoize network support check
  const isSupported = useMemo(() => isSupportedNetwork(chainId), [chainId])

  // Log configuration when chain changes (development only)
  useEffect(() => {
    logActiveChainConfiguration(chainId)
  }, [chainId])

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
