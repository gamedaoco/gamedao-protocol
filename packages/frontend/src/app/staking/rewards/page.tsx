'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Coins, TrendingUp, Clock, Gift } from "lucide-react"
import { useStakingPools } from "@/hooks/use-staking-pools"

const POOL_CONFIGS = {
  GOVERNANCE: {
    title: "Governance",
    description: "Participate in protocol governance",
    color: "bg-blue-500",
    icon: Clock
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
    icon: Gift
  }
} as const

export default function StakingRewardsPage() {
  const {
    pools,
    userStakes,
    isLoading,
    claimRewards,
    isClaiming
  } = useStakingPools()

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-2 mb-8">
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    )
  }

  // Calculate total pending rewards
  const totalPendingRewards = userStakes.reduce((sum, stake) => {
    return sum + Number(stake?.pendingRewards || 0)
  }, 0)

  // Calculate total rewards claimed (mock data - would come from contract events)
  const totalRewardsClaimed = userStakes.length * 50 // Mock: 50 GAME average claimed per pool

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Staking Rewards</h1>
        <p className="text-muted-foreground">
          Track and claim your staking rewards across all pools
        </p>
      </div>

      {/* Rewards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Rewards</p>
                <p className="text-2xl font-bold text-green-600">
                  {(totalPendingRewards / 1e18).toFixed(2)} GAME
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Coins className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Claimed</p>
                <p className="text-2xl font-bold">
                  {totalRewardsClaimed.toLocaleString()} GAME
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Pools</p>
                <p className="text-2xl font-bold">{userStakes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claim All Button */}
      {totalPendingRewards > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Claim All Rewards</h3>
                <p className="text-sm text-muted-foreground">
                  Claim {(totalPendingRewards / 1e18).toFixed(2)} GAME from all active pools
                </p>
              </div>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                disabled={isClaiming}
              >
                {isClaiming ? 'Claiming...' : 'Claim All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Pool Rewards */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Pool Rewards</h2>

        {userStakes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Stakes</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any active stakes yet. Start staking to earn rewards!
              </p>
              <Button asChild>
                <a href="/staking">Start Staking</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userStakes.filter((stake): stake is NonNullable<typeof stake> => stake !== null).map((userStake) => {
              const config = POOL_CONFIGS[userStake.pool as keyof typeof POOL_CONFIGS]
              const pool = pools.find(p => p.purpose === userStake.pool)
              const Icon = config.icon
              const pendingRewards = Number(userStake.pendingRewards || 0)
              const stakedAmount = Number(userStake.amount || 0)

              return (
                <Card key={userStake.pool} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-lg">{config.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {pool?.apyRate || 0}% APY
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Staking Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Staked Amount</span>
                        <span className="font-medium">
                          {(stakedAmount / 1e18).toLocaleString()} GAME
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pending Rewards</span>
                        <span className="font-medium text-green-600">
                          {(pendingRewards / 1e18).toFixed(4)} GAME
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily Rewards</span>
                        <span className="font-medium">
                          {((stakedAmount / 1e18) * (pool?.apyRate || 0) / 100 / 365).toFixed(4)} GAME
                        </span>
                      </div>
                    </div>

                    {/* Rewards Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rewards Progress</span>
                        <span className="font-medium">
                          {Math.min(100, (pendingRewards / 1e18) / (stakedAmount / 1e18) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, (pendingRewards / 1e18) / (stakedAmount / 1e18) * 100)}
                        className="h-2"
                      />
                    </div>

                    {/* Claim Button */}
                    <Button
                      className="w-full"
                      disabled={pendingRewards === 0 || isClaiming}
                      onClick={() => claimRewards(userStake.pool as string)}
                    >
                      {isClaiming
                        ? 'Claiming...'
                        : pendingRewards > 0
                          ? `Claim ${(pendingRewards / 1e18).toFixed(4)} GAME`
                          : 'No Rewards Yet'
                      }
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
