'use client'

import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { getContractAddresses, type ContractAddresses } from '@/lib/contracts'

/**
 * Hook to get contract addresses for the current chain
 */
export function useContracts() {
  const chainId = useChainId()

  const contracts = useMemo(() => getContractAddresses(chainId), [chainId])

  return {
    contracts,
    chainId,
    // Individual contract addresses for convenience
    registry: contracts.REGISTRY,
    control: contracts.CONTROL,
    flow: contracts.FLOW,
    signal: contracts.SIGNAL,
    sense: contracts.SENSE,
    identity: contracts.IDENTITY,
    membership: contracts.MEMBERSHIP,
    staking: contracts.STAKING,
    gameStaking: contracts.GAME_STAKING,
    gameToken: contracts.GAME_TOKEN,
    usdcToken: contracts.USDC_TOKEN,
  }
}

/**
 * Hook to get a specific contract address
 */
export function useContractAddress(contractName: keyof ContractAddresses) {
  const { contracts } = useContracts()
  return contracts[contractName]
}

/**
 * Hook to check if all required contracts are available
 */
export function useContractsValid() {
  const { contracts } = useContracts()

  const isValid = useMemo(() => {
    const requiredContracts = ['REGISTRY', 'CONTROL', 'FLOW', 'SIGNAL', 'SENSE', 'IDENTITY', 'MEMBERSHIP', 'GAME_STAKING', 'GAME_TOKEN'] as const

    return requiredContracts.every(contract => {
      const address = contracts[contract]
      return address && address !== '0x0000000000000000000000000000000000000000'
    })
  }, [contracts])

  return isValid
}
