'use client'

import { useState, useEffect, useMemo } from 'react'
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
  tokens: Array<{
    address: string
    symbol: string
    balance: string
    valueUSD: number
    decimals: number
  }>
}

export function useTreasury(organizationId?: string) {
  const { contracts, contractsValid } = useGameDAO()
  const [error, setError] = useState<string | null>(null)

  const { data, loading, error: queryError } = useQuery(GET_ORGANIZATION_TREASURY, {
    variables: { id: organizationId || '' },
    skip: !contractsValid || !organizationId,
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Always return a defined treasury object with default values
  const treasury: TreasuryData = useMemo(() => {
    if (!contractsValid || !organizationId) {
      return {
        address: '0x0000000000000000000000000000000000000000',
        totalValueUSD: 0,
        change24h: 0,
        tokenCount: 0,
        dailyLimit: 0,
        todaySpent: 0,
        tokens: []
      }
    }

    if (queryError && !data) {
      setError('Unable to load treasury data. Please check your connection.')
      return {
        address: '0x0000000000000000000000000000000000000000',
        totalValueUSD: 0,
        change24h: 0,
        tokenCount: 0,
        dailyLimit: 0,
        todaySpent: 0,
        tokens: []
      }
    }

    if (data?.organization) {
      const org = data.organization
      const base = {
        address: org.treasury || '0x0000000000000000000000000000000000000000',
        totalValueUSD: 0, // Would need token price data
        change24h: 0, // Would need historical data
        tokenCount: 0, // Would need token balance data
        dailyLimit: 0, // Would need treasury configuration
        todaySpent: 0, // Would need spending tracking
        tokens: [] as TreasuryData['tokens'] // Would need token balance data from contracts
      }
      return base
    }

    if (!loading) {
      setError('Organization not found')
    }

    return {
      address: '0x0000000000000000000000000000000000000000',
      totalValueUSD: 0,
      change24h: 0,
      tokenCount: 0,
      dailyLimit: 0,
      todaySpent: 0,
      tokens: []
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
