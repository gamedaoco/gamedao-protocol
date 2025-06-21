'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { useGameDAO } from './useGameDAO'

export interface ReputationData {
  experience: number
  reputation: number
  trust: number
  profile?: {
    profileId: string
    username: string
    verified: boolean
  }
}

export function useReputation() {
  const { address } = useAccount()
  const { contracts, contractsValid, rootOrgId } = useGameDAO()
  const [reputation, setReputation] = useState<ReputationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // For now, we'll use mock data since we don't have the full contract integration yet
  // In a real implementation, this would query the Sense contract
  useEffect(() => {
    if (!address || !contractsValid) {
      setReputation(null)
      return
    }

    setIsLoading(true)
    setError(null)

    // Simulate API call delay
    const timer = setTimeout(() => {
      // Mock reputation data based on address
      const mockReputation: ReputationData = {
        experience: 1250,
        reputation: 1050,
        trust: 75,
        profile: {
          profileId: '0x123...',
          username: `user_${address.slice(-4)}`,
          verified: false
        }
      }

      setReputation(mockReputation)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [address, contractsValid])

  // Real implementation would use wagmi to read from Sense contract
  // const { data: reputationData, isLoading: isContractLoading, error: contractError } = useReadContract({
  //   address: contracts.SENSE,
  //   abi: SENSE_ABI,
  //   functionName: 'getReputation',
  //   args: [address, rootOrgId],
  //   enabled: Boolean(address && contractsValid),
  // })

  return {
    reputation,
    isLoading,
    error,
    refetch: () => {
      // Trigger refetch logic here
    }
  }
}
