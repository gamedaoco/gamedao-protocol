'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useGameDAO } from './useGameDAO'
import { gql } from '@apollo/client'

const GET_ORGANIZATION_TREASURY = gql`
  query GetOrganizationTreasury($id: String!) {
    organization(id: $id) {
      id
      name
      treasury
      treasuryBalance
      campaigns {
        id
        raised
        target
      }
    }
  }
`

export interface TokenBalance {
  address: string
  symbol: string
  balance: string
  valueUSD: number
  decimals: number
}

export interface TreasuryData {
  address: string
  totalValueUSD: number
  change24h: number
  tokenCount: number
  dailyLimit: number
  todaySpent: number
  tokens: TokenBalance[]
}

export function useTreasury(organizationId?: string) {
  const { contracts, contractsValid } = useGameDAO()
  const [treasury, setTreasury] = useState<TreasuryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, loading, error: queryError } = useQuery(GET_ORGANIZATION_TREASURY, {
    variables: { id: organizationId || '' },
    skip: !contractsValid || !organizationId,
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  useEffect(() => {
    if (!contractsValid || !organizationId) {
      setTreasury(null)
      setError(null)
      return
    }

    if (queryError && !data) {
      setError('Unable to load treasury data. Please check your connection.')
      return
    }

    if (data?.organization) {
      const org = data.organization
      const treasuryData: TreasuryData = {
        address: org.treasury || '0x0000000000000000000000000000000000000000',
        totalValueUSD: 0, // Would need token price data
        change24h: 0, // Would need historical data
        tokenCount: 0, // Would need token balance data
        dailyLimit: 0, // Would need treasury configuration
        todaySpent: 0, // Would need spending tracking
        tokens: [] // Would need token balance data from contracts
      }
      setTreasury(treasuryData)
      setError(null)
    } else if (!loading) {
      setError('Organization not found')
    }
  }, [contractsValid, organizationId, data, loading, queryError])

  return {
    treasury,
    isLoading: loading,
    error,
    refetch: () => {
      // Refetch handled by Apollo
    }
  }
}
