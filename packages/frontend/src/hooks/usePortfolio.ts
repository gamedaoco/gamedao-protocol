'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !contractsValid) {
      setPortfolio(null)
      return
    }

    setIsLoading(true)
    setError(null)

    // Simulate API call delay
    const timer = setTimeout(() => {
      // Mock portfolio data based on address
      const mockPortfolio: PortfolioData = {
        totalValueUSD: 8750.25,
        change24h: -1.2,
        tokenCount: 4,
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            balance: '2500000000000000000', // 2.5 ETH in wei
            valueUSD: 6250.00,
            decimals: 18,
            allocation: 71.4
          },
          {
            address: '0xA0b86a33E6441e9c7D3c4Dc8E4F2F8C1B5D6E7F8',
            symbol: 'USDC',
            balance: '1500000000', // 1500 USDC (6 decimals)
            valueUSD: 1500.00,
            decimals: 6,
            allocation: 17.1
          },
          {
            address: '0xB1c97a44F7401e9d4E5C6F2F8C1B5D6E7F8A9B0C',
            symbol: 'GAME',
            balance: '2500000000000000000000', // 2500 GAME tokens
            valueUSD: 875.25,
            decimals: 18,
            allocation: 10.0
          },
          {
            address: '0xC2d98a55G8502f0e5F6G3G9D2C6F7G9B0C1D2E3F',
            symbol: 'DAI',
            balance: '125000000000000000000', // 125 DAI
            valueUSD: 125.00,
            decimals: 18,
            allocation: 1.4
          }
        ],
        participation: {
          organizations: 3,
          campaigns: 7,
          proposals: 12,
          votes: 28
        }
      }

      setPortfolio(mockPortfolio)
      setIsLoading(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [address, contractsValid])

  return {
    portfolio,
    isLoading,
    error,
    refetch: () => {
      // Trigger refetch logic here
    }
  }
}
