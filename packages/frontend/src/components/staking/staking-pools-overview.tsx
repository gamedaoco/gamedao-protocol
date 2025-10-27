'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Coins, TrendingUp, Users, Clock } from "lucide-react"
import { useStakingPools } from "@/hooks/useStakingPools"
import { StakingModal } from "./staking-modal"
import { useState } from "react"

type PoolPurpose = 'GOVERNANCE' | 'DAO_CREATION' | 'TREASURY_BOND' | 'LIQUIDITY_MINING'

const POOL_CONFIGS = {
  GOVERNANCE: {
    title: "Governance",
    description: "Participate in protocol governance",
    color: "bg-blue-500",
    icon: Users
  },
  DAO_CREATION: {
    title: "DAO Creation",
    description: "Stake to create and manage DAOs",
    color: "bg-green-500",
    icon: TrendingUp
  },
  TREASURY_BOND: {
    title: "Treasury Bond",
    description: "Long-term commitment for maximum rewards",
    color: "bg-purple-500",
    icon: Coins
  },
  LIQUIDITY_MINING: {
    title: "Liquidity Mining",
    description: "Provide liquidity for trading rewards",
    color: "bg-orange-500",
    icon: Clock
  }
} as const

export function StakingPoolsOverview() {
  const {
    pools,
    userStakes,
    totalStaked,
    totalStakers,
    avgApy,
    isLoading,
    claimRewards,
    isClaiming
  } = useStakingPools()

  const [stakingModal, setStakingModal] = useState<{
    isOpen: boolean
    poolPurpose: PoolPurpose
    poolTitle: string
    poolApy: number
    mode: 'stake' | 'unstake'
  }>({
    isOpen: false,
    poolPurpose: 'GOVERNANCE',
    poolTitle: '',
    poolApy: 0,
    mode: 'stake'
  })

  const openStakingModal = (poolPurpose: PoolPurpose, poolTitle: string, poolApy: number, mode: 'stake' | 'unstake') => {
    setStakingModal({
      isOpen: true,
      poolPurpose,
      poolTitle,
      poolApy,
      mode
    })
  }

  const closeStakingModal = () => {
    setStakingModal(prev => ({ ...prev, isOpen: false }))
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Global Protocol Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value Locked</p>
                <p className="text-2xl font-bold">
                  {(Number(totalStaked) / 1e18).toLocaleString()} GAME
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Stakers</p>
                <p className="text-2xl font-bold">{totalStakers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg APY</p>
                <p className="text-2xl font-bold">{avgApy.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Staking Pools */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Staking Pools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(POOL_CONFIGS).map(([purpose, config]) => {
            const pool = pools.find((p: any) => p.purpose === purpose)
            const userStake = userStakes.find((s: any) => s.pool === purpose)
            const Icon = config.icon

            return (
              <Card key={purpose} className="relative overflow-hidden glass">
                <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{config.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {pool?.apy || 0}% APY
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Pool General Information */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Staked</span>
                      <span className="font-medium">
                        {pool ? `${(Number(pool.totalStaked) / 1e18).toLocaleString()} GAME` : '0 GAME'}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stakers</span>
                      <span className="font-medium">{pool?.stakersCount || 0}</span>
                    </div>

                    {/* Pool Utilization */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pool Utilization</span>
                        <span className="font-medium">
                          {pool ? Math.min(100, (Number(pool.totalStaked) / 1e18 / 100000) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <Progress
                        value={pool ? Math.min(100, (Number(pool.totalStaked) / 1e18 / 100000) * 100) : 0}
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* User-Specific Section */}
                  {userStake && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg border-l-4 border-l-blue-500">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Your Position</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Your Stake</span>
                          <span className="font-medium">
                            {(Number(userStake.amount) / 1e18).toLocaleString()} GAME
                          </span>
                        </div>

                        {userStake.pendingRewards && Number(userStake.pendingRewards) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pending Rewards</span>
                            <span className="font-medium text-green-600">
                              {(Number(userStake.pendingRewards) / 1e18).toFixed(2)} GAME
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                        <Button
                        size="sm"
                        className="flex-1"
                        disabled={!pool?.active}
                        onClick={() => openStakingModal(purpose as PoolPurpose, config.title, pool?.apy || 0, 'stake')}
                      >
                        Stake
                      </Button>

                      {userStake && Number(userStake.amount) > 0 && (
                        <Button
                          size="sm"
                          variant="glass"
                          className="flex-1"
                          onClick={() => openStakingModal(purpose as PoolPurpose, config.title, pool?.apy || 0, 'unstake')}
                        >
                          Unstake
                        </Button>
                      )}
                    </div>

                    {/* Claim Rewards Button */}
                    {userStake?.pendingRewards && Number(userStake.pendingRewards) > 0 && (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => claimRewards(purpose as PoolPurpose)}
                        disabled={isClaiming}
                      >
                        {isClaiming ? 'Claiming...' : `Claim ${(Number(userStake.pendingRewards) / 1e18).toFixed(2)} GAME`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Staking Modal */}
      <StakingModal
        isOpen={stakingModal.isOpen}
        onClose={closeStakingModal}
        poolPurpose={stakingModal.poolPurpose}
        poolTitle={stakingModal.poolTitle}
        poolApy={stakingModal.poolApy}
        mode={stakingModal.mode}
      />
    </div>
  )
}
