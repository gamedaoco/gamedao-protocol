'use client'

import { useState, useEffect } from 'react'
import { useGameDAO } from './useGameDAO'

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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contractsValid || !organizationId) {
      setTreasury(null)
      return
    }

    setIsLoading(true)
    setError(null)

    // Simulate API call delay
    const timer = setTimeout(() => {
      // Mock treasury data
      const mockTreasury: TreasuryData = {
        address: '0xCafac3dD18aC6c6e92c921884f9E4176737C052c',
        totalValueUSD: 15420.50,
        change24h: 2.34,
        tokenCount: 3,
        dailyLimit: 1000,
        todaySpent: 150.75,
        tokens: [
          {
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            balance: '5000000000000000000', // 5 ETH in wei
            valueUSD: 12500.00,
            decimals: 18
          },
          {
            address: '0xA0b86a33E6441e9c7D3c4Dc8E4F2F8C1B5D6E7F8',
            symbol: 'USDC',
            balance: '2500000000', // 2500 USDC (6 decimals)
            valueUSD: 2500.00,
            decimals: 6
          },
          {
            address: '0xB1c97a44F7401e9d4E5C6F2F8C1B5D6E7F8A9B0C',
            symbol: 'GAME',
            balance: '1000000000000000000000', // 1000 GAME tokens
            valueUSD: 420.50,
            decimals: 18
          }
        ]
      }

      setTreasury(mockTreasury)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [contractsValid, organizationId])

  return {
    treasury,
    isLoading,
    error,
    refetch: () => {
      // Trigger refetch logic here
    }
  }
}
