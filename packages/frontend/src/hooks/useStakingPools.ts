'use client'

import { useQuery } from '@apollo/client'
import { useReadContract, useWriteContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_STAKING_POOLS, GET_USER_STAKES, GET_STAKING_STATS } from '@/lib/queries'
import { useState, useEffect } from 'react'
import { formatEther, parseEther } from 'viem'
import { useTokenApproval } from './useTokenApproval'

// Safe BigInt conversion helper
const safeBigInt = (value: any, fallback: string = '0'): bigint => {
  if (value === null || value === undefined || value === '') {
    return BigInt(fallback)
  }

  const stringValue = String(value).trim()
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
    return BigInt(fallback)
  }

  try {
    return BigInt(stringValue)
  } catch (error) {
    console.warn(`Invalid BigInt value: ${value}, using fallback: ${fallback}`)
    return BigInt(fallback)
  }
}

export interface StakingPool {
  id: string
  purpose: string
  totalStaked: bigint
  rewardRate: number
  totalRewardsDistributed: bigint
  active: boolean
  lastUpdateTime: number
  stakersCount: number
  averageStakeAmount: bigint
  totalRewardsClaimed: bigint
  apy?: number
}

export interface UserStake {
  id: string
  user: string
  pool: {
    id: string
    purpose: string
    rewardRate: number
    active: boolean
  }
  amount: bigint
  stakedAt: number
  lastClaimTime: number
  preferredStrategy: string
  pendingRewards: bigint
  totalRewardsClaimed: bigint
}

export interface StakingStats {
  totalStaked: bigint
  totalRewardsDistributed: bigint
  totalRewardsClaimed: bigint
  totalSlashed: bigint
  activeStakers: number
  totalStakingPools: number
  lastUpdated: number
}

export function useStakingPools() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()
  const [contractPools, setContractPools] = useState<StakingPool[]>([])

  // Add token approval hook
  const {
    handleApproval: handleTokenApproval,
    isApproving: isTokenApproving,
    isApprovalConfirming: isTokenApprovalConfirming,
    approvalSuccess: tokenApprovalSuccess,
    approvalError: tokenApprovalError,
    safeBigInt: tokenSafeBigInt
  } = useTokenApproval()

  // Fetch staking pools from subgraph
  const { data: poolsData, loading: poolsLoading, error: poolsError, refetch: refetchPools } = useQuery(GET_STAKING_POOLS, {
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Fetch user stakes from subgraph
  const { data: userStakesData, loading: userStakesLoading, refetch: refetchUserStakes } = useQuery(GET_USER_STAKES, {
    variables: { user: address },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Fetch global staking stats from subgraph
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(GET_STAKING_STATS, {
    pollInterval: 60000, // Less frequent for global stats
    errorPolicy: 'ignore',
  })

  // Read token balances to create basic staking pools
  const { data: gameTokenBalance } = useReadContract({
    address: contracts.GAME_TOKEN,
    abi: ABIS.GAME_TOKEN,
    functionName: 'totalSupply',
  })

  // Create contract-based pools for development
  useEffect(() => {
    const contractPoolsData: StakingPool[] = [
      {
        id: '1',
        purpose: 'Governance Staking',
        totalStaked: gameTokenBalance && typeof gameTokenBalance === 'bigint' ? gameTokenBalance / BigInt(10) : parseEther('100000'), // 10% of total supply
        rewardRate: 12,
        totalRewardsDistributed: parseEther('5000'),
        active: true,
        lastUpdateTime: Math.floor(Date.now() / 1000),
        stakersCount: 25,
        averageStakeAmount: parseEther('4000'),
        totalRewardsClaimed: parseEther('4500'),
        apy: 12.5,
      },
      {
        id: '2',
        purpose: 'Liquidity Provision',
        totalStaked: gameTokenBalance && typeof gameTokenBalance === 'bigint' ? gameTokenBalance / BigInt(20) : parseEther('50000'), // 5% of total supply
        rewardRate: 18,
        totalRewardsDistributed: parseEther('7500'),
        active: true,
        lastUpdateTime: Math.floor(Date.now() / 1000),
        stakersCount: 18,
        averageStakeAmount: parseEther('2777'),
        totalRewardsClaimed: parseEther('6800'),
        apy: 18.7,
      },
      {
        id: '3',
        purpose: 'Validator Staking',
        totalStaked: gameTokenBalance && typeof gameTokenBalance === 'bigint' ? gameTokenBalance / BigInt(4) : parseEther('250000'), // 25% of total supply
        rewardRate: 8,
        totalRewardsDistributed: parseEther('12000'),
        active: true,
        lastUpdateTime: Math.floor(Date.now() / 1000),
        stakersCount: 8,
        averageStakeAmount: parseEther('31250'),
        totalRewardsClaimed: parseEther('11000'),
        apy: 8.2,
      },
    ]
    setContractPools(contractPoolsData)
  }, [gameTokenBalance])

  // Contract interactions
  const { writeContract: stakeTokens, isPending: isStaking } = useWriteContract()
  const { writeContract: unstakeTokens, isPending: isUnstaking } = useWriteContract()
  const { writeContract: claimRewards, isPending: isClaiming } = useWriteContract()

  // Transform subgraph data or use contract data
  const stakingPools: StakingPool[] = poolsData?.stakingPools?.map((pool: any) => ({
    id: pool.id,
    purpose: pool.purpose || 'General Staking',
    totalStaked: safeBigInt(pool.totalStaked),
    rewardRate: parseFloat(pool.rewardRate) || 0,
    totalRewardsDistributed: safeBigInt(pool.totalRewardsDistributed),
    active: pool.active !== false,
    lastUpdateTime: parseInt(pool.lastUpdateTime) || Math.floor(Date.now() / 1000),
    stakersCount: parseInt(pool.stakersCount) || 0,
    averageStakeAmount: safeBigInt(pool.averageStakeAmount),
    totalRewardsClaimed: safeBigInt(pool.totalRewardsClaimed),
    apy: parseFloat(pool.rewardRate) || 0, // Simplified APY calculation
  })) || contractPools

  // Transform user stakes data
  const userStakes: UserStake[] = userStakesData?.userStakes?.map((stake: any) => ({
    id: stake.id,
    user: stake.user,
    pool: {
      id: stake.pool.id,
      purpose: stake.pool.purpose,
      rewardRate: parseFloat(stake.pool.rewardRate),
      active: stake.pool.active,
    },
    amount: safeBigInt(stake.amount),
    stakedAt: parseInt(stake.stakedAt) || 0,
    lastClaimTime: parseInt(stake.lastClaimTime) || 0,
    preferredStrategy: stake.preferredStrategy || 'COMPOUND',
    pendingRewards: safeBigInt(stake.pendingRewards),
    totalRewardsClaimed: safeBigInt(stake.totalRewardsClaimed),
  })) || []

  // Transform global stats
  const globalStats: StakingStats = statsData?.stakingStats ? {
    totalStaked: safeBigInt(statsData.stakingStats.totalStaked),
    totalRewardsDistributed: safeBigInt(statsData.stakingStats.totalRewardsDistributed),
    totalRewardsClaimed: safeBigInt(statsData.stakingStats.totalRewardsClaimed),
    totalSlashed: safeBigInt(statsData.stakingStats.totalSlashed),
    activeStakers: parseInt(statsData.stakingStats.activeStakers) || 0,
    totalStakingPools: parseInt(statsData.stakingStats.totalStakingPools) || 0,
    lastUpdated: parseInt(statsData.stakingStats.lastUpdated) || Math.floor(Date.now() / 1000),
  } : {
    totalStaked: stakingPools.reduce((sum, pool) => sum + pool.totalStaked, BigInt(0)),
    totalRewardsDistributed: stakingPools.reduce((sum, pool) => sum + pool.totalRewardsDistributed, BigInt(0)),
    totalRewardsClaimed: stakingPools.reduce((sum, pool) => sum + pool.totalRewardsClaimed, BigInt(0)),
    totalSlashed: BigInt(0),
    activeStakers: stakingPools.reduce((sum, pool) => sum + pool.stakersCount, 0),
    totalStakingPools: stakingPools.length,
    lastUpdated: Math.floor(Date.now() / 1000),
  }

  // Stake tokens function
  const stake = async (poolId: string, amount: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('🔍 Staking GAME tokens with approval:', {
        poolId,
        amount
      })

      // Handle GAME token approval first
      const approvalNeeded = await handleTokenApproval({
        token: 'GAME',
        spender: contracts.STAKING,
        amount,
        purpose: 'staking'
      })

      if (!approvalNeeded) {
        // Approval is pending, staking will be handled after approval
        return
      }

      // Proceed with staking
      return stakeTokens({
        address: contracts.STAKING,
        abi: ABIS.STAKING,
        functionName: 'stake',
        args: [poolId, parseEther(amount)],
      })
    } catch (error) {
      console.error('❌ Failed to stake tokens:', error)
      throw error
    }
  }

  // Unstake tokens function
  const unstake = async (poolId: string, amount: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    return unstakeTokens({
      address: contracts.STAKING,
      abi: ABIS.STAKING,
      functionName: 'unstake',
      args: [poolId, parseEther(amount)],
    })
  }

  // Claim rewards function
  const claimReward = async (poolId: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    return claimRewards({
      address: contracts.STAKING,
      abi: ABIS.STAKING,
      functionName: 'claimRewards',
      args: [poolId],
    })
  }

  // Utility functions
  const formatStakeAmount = (amount: bigint): string => {
    return formatEther(amount)
  }

  const calculatePendingRewards = (stake: UserStake): bigint => {
    // Simplified calculation - in reality would be more complex
    const timeStaked = Math.floor(Date.now() / 1000) - stake.stakedAt
    const dailyRate = stake.pool.rewardRate / 365 / 100
    const pendingAmount = stake.amount * BigInt(Math.floor(timeStaked * dailyRate * 86400))
    return pendingAmount / BigInt(86400) // Normalize
  }

  const getTotalUserStaked = (): bigint => {
    return userStakes.reduce((sum, stake) => sum + stake.amount, BigInt(0))
  }

  const getTotalUserRewards = (): bigint => {
    return userStakes.reduce((sum, stake) => sum + stake.totalRewardsClaimed, BigInt(0))
  }

  const getTotalPendingRewards = (): bigint => {
    return userStakes.reduce((sum, stake) => sum + stake.pendingRewards, BigInt(0))
  }

  const getPoolById = (poolId: string): StakingPool | undefined => {
    return stakingPools.find(pool => pool.id === poolId)
  }

  const getUserStakeInPool = (poolId: string): UserStake | undefined => {
    return userStakes.find(stake => stake.pool.id === poolId)
  }

  const isUserStakedInPool = (poolId: string): boolean => {
    return userStakes.some(stake => stake.pool.id === poolId && stake.amount > BigInt(0))
  }

  // Calculate user's portfolio stats
  const userStats = {
    totalStaked: getTotalUserStaked(),
    totalRewardsClaimed: getTotalUserRewards(),
    totalPendingRewards: getTotalPendingRewards(),
    activeStakes: userStakes.filter(stake => stake.amount > BigInt(0)).length,
    averageAPY: userStakes.length > 0
      ? userStakes.reduce((sum, stake) => sum + stake.pool.rewardRate, 0) / userStakes.length
      : 0,
  }

  return {
    // Data
    stakingPools,
    pools: stakingPools, // Alias for backward compatibility
    userStakes,
    globalStats,
    userStats,
    totalStaked: globalStats.totalStaked,
    totalStakers: globalStats.activeStakers,
    avgApy: userStats.averageAPY,

    // Actions
    stake,
    unstake,
    claimReward,
    claimRewards: claimReward, // Alias for backward compatibility

    // Status
    isLoading: poolsLoading && stakingPools.length === 0,
    isLoadingUserStakes: userStakesLoading,
    isLoadingStats: statsLoading,
    isStaking: isStaking || isTokenApproving || isTokenApprovalConfirming,
    isUnstaking,
    isClaiming,
    error: poolsError && stakingPools.length === 0 ? poolsError : tokenApprovalError,

    // Utils
    formatStakeAmount,
    calculatePendingRewards,
    getTotalUserStaked,
    getTotalUserRewards,
    getTotalPendingRewards,
    getPoolById,
    getUserStakeInPool,
    isUserStakedInPool,

    // Refetch
    refetch: () => {
      refetchPools()
      refetchUserStakes()
      refetchStats()
    },
  }
}
