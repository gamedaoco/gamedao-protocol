'use client'

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { formatUnits } from 'viem'

export interface TokenBalance {
  symbol: string
  balance: string
  formatted: string
  decimals: number
}

export function useTokenBalances() {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()

  // ETH Balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
  })

  // GAME Token Balance
  const { data: gameBalance, isLoading: gameLoading } = useBalance({
    address,
    token: contracts.GAME_TOKEN,
  })

  // USDC Token Balance
  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address,
    token: contracts.USDC_TOKEN,
  })

  const formatTokenBalance = (balance: bigint | undefined, decimals: number): string => {
    if (!balance) return '0'
    const formatted = formatUnits(balance, decimals)
    const num = parseFloat(formatted)

    if (num === 0) return '0'
    if (num < 0.01) return '<0.01'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  const balances: TokenBalance[] = [
    {
      symbol: 'ETH',
      balance: ethBalance?.value?.toString() || '0',
      formatted: formatTokenBalance(ethBalance?.value, ethBalance?.decimals || 18),
      decimals: ethBalance?.decimals || 18
    },
    {
      symbol: 'GAME',
      balance: gameBalance?.value?.toString() || '0',
      formatted: formatTokenBalance(gameBalance?.value, gameBalance?.decimals || 18),
      decimals: gameBalance?.decimals || 18
    },
    {
      symbol: 'USDC',
      balance: usdcBalance?.value?.toString() || '0',
      formatted: formatTokenBalance(usdcBalance?.value, usdcBalance?.decimals || 6),
      decimals: usdcBalance?.decimals || 6
    }
  ]

  const isLoading = ethLoading || gameLoading || usdcLoading

  // Helper to check if user has sufficient balance
  const hasBalance = (amount: string, token: 'ETH' | 'GAME' | 'USDC') => {
    if (!isConnected) return false

    switch (token) {
      case 'ETH':
        return ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)) >= parseFloat(amount) : false
      case 'GAME':
        return gameBalance ? parseFloat(formatUnits(gameBalance.value, gameBalance.decimals)) >= parseFloat(amount) : false
      case 'USDC':
        return usdcBalance ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)) >= parseFloat(amount) : false
      default:
        return false
    }
  }

  return {
    balances,
    isLoading,
    isConnected,
    ethBalance: {
      balance: ethBalance ? formatUnits(ethBalance.value, ethBalance.decimals) : '0',
      formatted: ethBalance ? `${parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)).toFixed(4)}` : '0.0000',
      symbol: ethBalance?.symbol || 'ETH',
    },
    gameBalance: {
      balance: gameBalance ? formatUnits(gameBalance.value, gameBalance.decimals) : '0',
      formatted: gameBalance ? `${parseFloat(formatUnits(gameBalance.value, gameBalance.decimals)).toLocaleString()}` : '0',
      symbol: gameBalance?.symbol || 'GAME',
    },
    usdcBalance: {
      balance: usdcBalance ? formatUnits(usdcBalance.value, usdcBalance.decimals) : '0',
      formatted: usdcBalance ? `${parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(2)}` : '0.00',
      symbol: usdcBalance?.symbol || 'USDC',
    },
    // Helper functions
    hasBalance,
    getBalance: (symbol: string) => {
      return balances.find(b => b.symbol === symbol)
    }
  }
}

// Hook to get Sense username for an address
export function useSenseUsername(address?: string) {
  const { contracts } = useGameDAO()

  const { data: profile, isLoading } = useReadContract({
    address: contracts.SENSE,
    abi: ABIS.SENSE,
    functionName: 'getProfile',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Extract username from profile data
  const username = profile && Array.isArray(profile) && profile.length > 3 ? profile[3] : null

  return {
    username: username && username.length > 0 ? username : null,
    isLoading,
    hasProfile: !!username,
  }
}
