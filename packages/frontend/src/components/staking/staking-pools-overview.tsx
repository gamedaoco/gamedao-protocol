'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Coins, TrendingUp, Users, Clock } from "lucide-react"
import { useStakingPools } from "@/hooks/use-staking-pools"
import { formatUnits } from "viem"

interface StakingPool {
  purpose: string
  totalStaked: string
  rewardRate: number
  stakersCount: number
  active: boolean
  userStake?: string
  pendingRewards?: string
}

const POOL_CONFIGS = {
  GOVERNANCE: {
    title: "Governance",
    description: "Participate in protocol governance",
    color: "bg-blue-500",
    icon: Users,
    apy: 3
  },
  DAO_CREATION: {
    title: "DAO Creation",
    description: "Stake to create and manage DAOs",
    color: "bg-green-500",
    icon: TrendingUp,
    apy: 8
  },
  TREASURY_BOND: {
    title: "Treasury Bond",
    description: "Long-term commitment for maximum rewards",
    color: "bg-purple-500",
    icon: Coins,
    apy: 12
  },
  LIQUIDITY_MINING: {
    title: "Liquidity Mining",
    description: "Provide liquidity for trading rewards",
    color: "bg-orange-500",
    icon: Clock,
    apy: 6
  }
} as const

export function StakingPoolsOverview() {
  const { pools, userStakes, totalStaked, isLoading } = useStakingPools()

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
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value Locked</p>
                <p className="text-2xl font-bold">
                  {totalStaked ? `${formatUnits(BigInt(totalStaked), 18)} GAME` : '0 GAME'}
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
                <p className="text-2xl font-bold">
                  {pools?.reduce((sum: number, pool: any) => sum + (pool.stakersCount || 0), 0) || 0}
                </p>
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
                <p className="text-2xl font-bold">7.25%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staking Pools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(POOL_CONFIGS).map(([purpose, config]) => {
          const pool = pools?.find((p: any) => p.purpose === purpose)
          const userStake = userStakes?.find((s: any) => s.pool === purpose)
          const Icon = config.icon

          return (
            <Card key={purpose} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{config.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {config.apy}% APY
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pool Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Staked</span>
                    <span className="font-medium">
                      {pool?.totalStaked
                        ? `${Number(formatUnits(BigInt(pool.totalStaked), 18)).toLocaleString()} GAME`
                        : '0 GAME'
                      }
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stakers</span>
                    <span className="font-medium">{pool?.stakersCount || 0}</span>
                  </div>
                </div>

                {/* User Stake */}
                {userStake && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Stake</span>
                      <span className="font-medium">
                        {formatUnits(BigInt(userStake.amount), 18)} GAME
                      </span>
                    </div>

                    {userStake.pendingRewards && BigInt(userStake.pendingRewards) > BigInt(0) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending Rewards</span>
                        <span className="font-medium text-green-600">
                          {formatUnits(BigInt(userStake.pendingRewards), 18)} GAME
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pool Utilization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pool Utilization</span>
                    <span className="font-medium">
                      {pool?.totalStaked
                        ? Math.min(100, (Number(formatUnits(BigInt(pool.totalStaked), 18)) / 100000) * 100).toFixed(1)
                        : 0
                      }%
                    </span>
                  </div>
                  <Progress
                    value={pool?.totalStaked
                      ? Math.min(100, (Number(formatUnits(BigInt(pool.totalStaked), 18)) / 100000) * 100)
                      : 0
                    }
                    className="h-2"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!pool?.active}
                  >
                    Stake
                  </Button>

                  {userStake && BigInt(userStake.amount) > BigInt(0) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      Unstake
                    </Button>
                  )}
                </div>

                {/* Claim Rewards Button */}
                {userStake?.pendingRewards && BigInt(userStake.pendingRewards) > BigInt(0) && (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Claim {formatUnits(BigInt(userStake.pendingRewards), 18)} GAME
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
