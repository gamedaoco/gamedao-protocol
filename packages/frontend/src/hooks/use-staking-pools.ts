'use client'

import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { useAccount } from 'wagmi'

const STAKING_POOLS_QUERY = gql`
  query StakingPools {
    stakingPools {
      id
      purpose
      totalStaked
      rewardRate
      stakersCount
      totalRewardsDistributed
      active
      lastUpdateTime
    }
  }
`

const USER_STAKES_QUERY = gql`
  query UserStakes($user: Bytes!) {
    userStakes(where: { user: $user }) {
      id
      user
      pool
      amount
      stakedAt
      lastClaimTime
      preferredStrategy
      pendingRewards
      totalRewardsClaimed
    }
  }
`

interface StakingPool {
  id: string
  purpose: string
  totalStaked: string
  rewardRate: number
  stakersCount: number
  totalRewardsDistributed: string
  active: boolean
  lastUpdateTime: string
}

interface UserStake {
  id: string
  user: string
  pool: string
  amount: string
  stakedAt: string
  lastClaimTime: string
  preferredStrategy: string
  pendingRewards: string
  totalRewardsClaimed: string
}

export function useStakingPools() {
  const { address } = useAccount()

  const {
    data: poolsData,
    loading: poolsLoading,
    error: poolsError
  } = useQuery(STAKING_POOLS_QUERY, {
    pollInterval: 30000, // Poll every 30 seconds for fresh data
  })

  const {
    data: userStakesData,
    loading: userStakesLoading,
    error: userStakesError
  } = useQuery(USER_STAKES_QUERY, {
    variables: { user: address?.toLowerCase() },
    skip: !address,
    pollInterval: 30000,
  })

  const pools: StakingPool[] = poolsData?.stakingPools || []
  const userStakes: UserStake[] = userStakesData?.userStakes || []

  // Calculate total staked across all pools
  const totalStaked = pools.reduce((sum: string, pool: StakingPool) => {
    const poolStaked = BigInt(pool.totalStaked || '0')
    const currentSum = BigInt(sum || '0')
    return (currentSum + poolStaked).toString()
  }, '0')

  // Calculate total active stakers
  const totalStakers = pools.reduce((sum: number, pool: StakingPool) => {
    return sum + (pool.stakersCount || 0)
  }, 0)

  const isLoading = poolsLoading || userStakesLoading
  const error = poolsError || userStakesError

  return {
    pools,
    userStakes,
    totalStaked,
    totalStakers,
    isLoading,
    error,
  }
}
