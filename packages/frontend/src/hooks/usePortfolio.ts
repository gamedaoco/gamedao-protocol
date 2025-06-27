'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'
import { useGameDAO } from './useGameDAO'
import { gql } from '@apollo/client'

const GET_USER_PORTFOLIO = gql`
  query GetUserPortfolio($user: String!) {
    members(where: { address: $user }) {
      id
      organization {
        id
        name
      }
      contributions {
        id
        amount
        campaign {
          id
          title
        }
      }
      proposals {
        id
        title
      }
      votes {
        id
        choice
      }
    }
  }
`

export interface PortfolioToken {
  address: string
  symbol: string
  balance: string
  valueUSD: number
  decimals: number
  allocation: number
}

export interface PortfolioParticipation {
  organizations: number
  campaigns: number
  proposals: number
  votes: number
}

export interface PortfolioData {
  totalValueUSD: number
  change24h: number
  tokenCount: number
  tokens: PortfolioToken[]
  participation: PortfolioParticipation
}

export function usePortfolio() {
  const { address } = useAccount()
  const { contractsValid } = useGameDAO()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, loading, error: queryError } = useQuery(GET_USER_PORTFOLIO, {
    variables: { user: address?.toLowerCase() || '' },
    skip: !address || !contractsValid,
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  useEffect(() => {
    if (!address || !contractsValid) {
      setPortfolio(null)
      setError(null)
      return
    }

    if (queryError && !data) {
      setError('Unable to load portfolio data. Please check your connection.')
      return
    }

    if (data?.members && data.members.length > 0) {
      const members = data.members

      // Aggregate data from all memberships
      const uniqueOrganizations = new Set()
      const allContributions: any[] = []
      const allProposals: any[] = []
      const allVotes: any[] = []

      members.forEach((member: any) => {
        uniqueOrganizations.add(member.organization.id)
        if (member.contributions) allContributions.push(...member.contributions)
        if (member.proposals) allProposals.push(...member.proposals)
        if (member.votes) allVotes.push(...member.votes)
      })

      const portfolioData: PortfolioData = {
        totalValueUSD: 0, // Would need token price data
        change24h: 0, // Would need historical price data
        tokenCount: 0, // Would need token balance data
        tokens: [], // Would need token balance data from contracts
        participation: {
          organizations: uniqueOrganizations.size,
          campaigns: allContributions.length,
          proposals: allProposals.length,
          votes: allVotes.length
        }
      }
      setPortfolio(portfolioData)
      setError(null)
    } else if (!loading) {
      // User not found in subgraph - they haven't interacted with the protocol yet
      setPortfolio({
        totalValueUSD: 0,
        change24h: 0,
        tokenCount: 0,
        tokens: [],
        participation: {
          organizations: 0,
          campaigns: 0,
          proposals: 0,
          votes: 0
        }
      })
      setError(null)
    }
  }, [address, contractsValid, data, loading, queryError])

  return {
    portfolio,
    isLoading: loading,
    error,
    refetch: () => {
      // Refetch handled by Apollo
    }
  }
}
