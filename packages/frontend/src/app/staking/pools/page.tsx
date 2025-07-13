'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Coins, TrendingUp, Users, Clock, Shield, Zap } from "lucide-react"
import { useStakingPools } from "@/hooks/useStakingPools"
import { StakingModal } from "@/components/staking/staking-modal"
import { useState } from "react"

const POOL_CONFIGS = {
  GOVERNANCE: {
    title: "Governance Pool",
    description: "Participate in protocol governance and earn rewards for voting on proposals",
    color: "bg-blue-500",
    icon: Users,
    benefits: [
      "Vote on protocol upgrades",
      "Propose new features",
      "Earn voting rewards",
      "Low risk, steady returns"
    ]
  },
  DAO_CREATION: {
    title: "DAO Creation Pool",
    description: "Stake tokens to create and manage DAOs within the GameDAO ecosystem",
    color: "bg-green-500",
    icon: TrendingUp,
    benefits: [
      "Create unlimited DAOs",
      "Access premium features",
      "Higher reward multiplier",
      "Community recognition"
    ]
  },
  TREASURY_BOND: {
    title: "Treasury Bond Pool",
    description: "Long-term commitment pool with the highest rewards and treasury backing",
    color: "bg-purple-500",
    icon: Coins,
    benefits: [
      "Highest APY rewards",
      "Treasury diversification",
      "Long-term value accrual",
      "Protocol fee sharing"
    ]
  },
  LIQUIDITY_MINING: {
    title: "Liquidity Mining Pool",
    description: "Provide liquidity to DEX pairs and earn trading fee rewards",
    color: "bg-orange-500",
    icon: Clock,
    benefits: [
      "Trading fee rewards",
      "Liquidity incentives",
      "Market making rewards",
      "Dynamic APY based on volume"
    ]
  }
} as const

const STRATEGY_INFO = {
  0: { name: "Rage Quit", icon: Zap, color: "text-red-500", delay: "Instant", penalty: "20%" },
  1: { name: "Standard", icon: Clock, color: "text-blue-500", delay: "7 days", penalty: "None" },
  2: { name: "Patient", icon: Shield, color: "text-green-500", delay: "30 days", penalty: "5% Bonus" }
}

type PoolPurpose = 'GOVERNANCE' | 'DAO_CREATION' | 'TREASURY_BOND' | 'LIQUIDITY_MINING'

export default function StakingPoolsPage() {
  const { pools, userStakes, isLoading } = useStakingPools()

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
      <div className="container mx-auto py-8">
        <div className="space-y-2 mb-8">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Staking Pools</h1>
        <p className="text-muted-foreground">
          Choose from different staking pools, each with unique benefits and reward structures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(POOL_CONFIGS).map(([purpose, config]) => {
          const pool = pools.find((p: any) => p.purpose === purpose)
          const userStake = userStakes.find((s: any) => s?.pool === purpose)
          const Icon = config.icon

          return (
            <Card key={purpose} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-2 ${config.color}`} />

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{config.title}</CardTitle>
                      <Badge variant="secondary" className="font-mono mt-1">
                        {pool?.apy || 0}% APY
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2">{config.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pool Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Staked</p>
                    <p className="text-lg font-semibold">
                      {pool ? `${(Number(pool.totalStaked) / 1e18).toLocaleString()} GAME` : '0 GAME'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Stakers</p>
                    <p className="text-lg font-semibold">{pool?.stakersCount || 0}</p>
                  </div>
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

                {/* Benefits */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Pool Benefits</p>
                  <ul className="space-y-1">
                    {config.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* User Position */}
                {userStake && Number(userStake.amount) > 0 && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold">Your Position</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Staked</span>
                      <span className="font-medium">
                        {(Number(userStake.amount) / 1e18).toLocaleString()} GAME
                      </span>
                    </div>
                    {userStake.pendingRewards && Number(userStake.pendingRewards) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending Rewards</span>
                        <span className="font-medium text-green-600">
                          {(Number(userStake.pendingRewards) / 1e18).toFixed(4)} GAME
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Unstaking Strategies */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Unstaking Options</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STRATEGY_INFO).map(([strategy, info]) => {
                      const StrategyIcon = info.icon
                      return (
                        <div key={strategy} className="text-center p-2 border rounded-lg">
                          <StrategyIcon className={`h-4 w-4 mx-auto mb-1 ${info.color}`} />
                          <p className="text-xs font-medium">{info.name}</p>
                          <p className="text-xs text-muted-foreground">{info.delay}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    className="flex-1"
                    disabled={!pool?.active}
                    onClick={() => openStakingModal(purpose as PoolPurpose, config.title, pool?.apy || 0, 'stake')}
                  >
                    Stake GAME
                  </Button>

                  {userStake && Number(userStake.amount) > 0 && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openStakingModal(purpose as PoolPurpose, config.title, pool?.apy || 0, 'unstake')}
                    >
                      Unstake
                    </Button>
                  )}
                </div>

                {/* View Details Button */}
                <Button
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => window.location.href = `/staking/pools/${purpose.toLowerCase()}`}
                >
                  View Pool Details
                </Button>
              </CardContent>
            </Card>
          )
        })}
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
