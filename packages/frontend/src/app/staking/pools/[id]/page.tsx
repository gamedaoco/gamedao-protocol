'use client'

import { use } from 'react'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useStakingPools } from '@/hooks/use-staking-pools'
import { StakingModal } from '@/components/staking/staking-modal'
import { Coins, Users, TrendingUp, Clock, Shield, Target, Activity, Share2, Heart } from 'lucide-react'
import { useState } from 'react'

// Pool configurations
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

type PoolPurpose = keyof typeof POOL_CONFIGS

// Individual staking pool hook
function useStakingPool(id: string) {
  const { pools, userStakes, isLoading, stake, unstake, claimRewards, isStaking, isUnstaking, isClaiming } = useStakingPools()

  // Convert id to pool purpose
  const poolPurpose = id.toUpperCase() as PoolPurpose
  const pool = pools?.find(p => p.purpose === poolPurpose)
  const userStake = userStakes?.find(s => s?.pool === poolPurpose)
  const config = POOL_CONFIGS[poolPurpose]

  return {
    pool,
    userStake,
    config,
    isLoading,
    stake,
    unstake,
    claimRewards,
    isStaking,
    isUnstaking,
    isClaiming,
    // Additional pool-specific data
    stakers: [], // TODO: Fetch pool stakers
    history: [], // TODO: Fetch pool history
    rewards: [], // TODO: Fetch reward history
  }
}

interface StakingPoolDetailPageProps {
  params: Promise<{ id: string }>
}

export default function StakingPoolDetailPage({ params }: StakingPoolDetailPageProps) {
  const { id } = use(params)
  const {
    pool,
    userStake,
    config,
    isLoading,
    claimRewards,
    isStaking,
    isUnstaking,
    isClaiming,
    stakers,
    history,
    rewards
  } = useStakingPool(id)

  const [stakingModal, setStakingModal] = useState<{
    isOpen: boolean
    mode: 'stake' | 'unstake'
  }>({
    isOpen: false,
    mode: 'stake'
  })

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Staking', href: '/staking' },
          { label: 'Pools', href: '/staking/pools' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading staking pool details...</div>
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!pool || !config) {
    return (
      <DetailPageLayout
        title="Pool Not Found"
        breadcrumbs={[
          { label: 'Staking', href: '/staking' },
          { label: 'Pools', href: '/staking/pools' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/staking/pools"
      >
        <EmptyState
          title="Staking pool not found"
          description="The staking pool you're looking for doesn't exist or may have been disabled."
          primaryAction={{
            label: 'Browse Pools',
            onClick: () => window.location.href = '/staking/pools'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate pool metrics
  const totalStakedFormatted = (Number(pool.totalStaked) / 1e18).toFixed(2)
  const userStakedFormatted = userStake ? (Number(userStake.amount) / 1e18).toFixed(2) : '0'
  const pendingRewardsFormatted = userStake ? (Number(userStake.pendingRewards) / 1e18).toFixed(4) : '0'

  // Get pool status for badge
  const getPoolStatus = () => {
    if (pool.active) return { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' }
    return { label: 'Inactive', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' }
  }

  const status = getPoolStatus()
  const IconComponent = config.icon

  const openStakingModal = (mode: 'stake' | 'unstake') => {
    setStakingModal({ isOpen: true, mode })
  }

  const closeStakingModal = () => {
    setStakingModal({ isOpen: false, mode: 'stake' })
  }

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={config.title}
        subtitle={config.description}
        breadcrumbs={[
          { label: 'Staking', href: '/staking' },
          { label: 'Pools', href: '/staking/pools' },
          { label: config.title, current: true }
        ]}
        backHref="/staking/pools"
        status={status}
        metadata={[
          {
            label: 'APY',
            value: `${(pool.apy || 0).toFixed(2)}%`,
            icon: <TrendingUp className="h-4 w-4" />
          },
          {
            label: 'Total Staked',
            value: `${totalStakedFormatted} GAME`,
            icon: <Coins className="h-4 w-4" />
          },
          {
            label: 'Stakers',
            value: pool.stakersCount.toString(),
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Your Stake',
            value: `${userStakedFormatted} GAME`,
            icon: <Target className="h-4 w-4" />
          }
        ]}
        primaryAction={
          pool.active ? {
            label: userStake ? 'Manage Stake' : 'Start Staking',
            onClick: () => openStakingModal('stake')
          } : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share Pool
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Follow
            </Button>
          </div>
        }
        tabs={[
          { id: 'overview', label: 'Overview', href: `/staking/pools/${id}`, current: true },
          { id: 'stakers', label: 'Stakers', href: `/staking/pools/${id}/stakers`, badge: stakers.length },
          { id: 'rewards', label: 'Rewards', href: `/staking/pools/${id}/rewards`, badge: rewards.length },
          { id: 'history', label: 'History', href: `/staking/pools/${id}/history`, badge: history.length }
        ]}
        sidebar={
          <div className="space-y-6">
            {/* Pool Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <IconComponent className="h-5 w-5 mr-2" />
                  Pool Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value Locked</span>
                    <span className="font-medium">{totalStakedFormatted} GAME</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annual Percentage Yield</span>
                    <span className="font-medium text-green-600">{(pool.apy || 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Stakers</span>
                    <span className="font-medium">{pool.stakersCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pool Status</span>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Position */}
            {userStake && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Staked Amount</span>
                      <span className="font-medium">{userStakedFormatted} GAME</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pending Rewards</span>
                      <span className="font-medium text-green-600">{pendingRewardsFormatted} GAME</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pool Share</span>
                      <span className="font-medium">
                        {Number(pool.totalStaked) > 0
                          ? ((Number(userStake.amount) / Number(pool.totalStaked)) * 100).toFixed(4)
                          : '0'
                        }%
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => openStakingModal('stake')}
                      disabled={isStaking}
                    >
                      {isStaking ? 'Staking...' : 'Stake More'}
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => openStakingModal('unstake')}
                      disabled={isUnstaking}
                    >
                      {isUnstaking ? 'Unstaking...' : 'Unstake'}
                    </Button>
                    {Number(pendingRewardsFormatted) > 0 && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => claimRewards(id.toUpperCase() as any)}
                        disabled={isClaiming}
                      >
                        {isClaiming ? 'Claiming...' : `Claim ${pendingRewardsFormatted} GAME`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pool Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pool Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {pool.active && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => openStakingModal('stake')}>
                    <Coins className="h-4 w-4 mr-2" />
                    Stake GAME
                  </Button>
                  {userStake && (
                    <Button className="w-full justify-start" variant="outline" onClick={() => openStakingModal('unstake')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Unstake Tokens
                    </Button>
                  )}
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        }
      >
        <div className="space-y-8">
          {/* Pool Overview */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Pool Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Staked</p>
                      <p className="text-3xl font-bold">{totalStakedFormatted} GAME</p>
                    </div>
                    <Coins className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total value locked in pool
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">APY</p>
                      <p className="text-3xl font-bold text-green-600">{pool.apyRate.toFixed(2)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Annual percentage yield
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Stakers</p>
                      <p className="text-3xl font-bold">{pool.stakersCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Community participants
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pool Details */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">About This Pool</h2>
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {config.description}
                  </p>

                  {/* Pool Features */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Key Features</h4>
                      <div className="space-y-2">
                        {config.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Pool Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium">Pool Type</span>
                          <p className="text-sm text-muted-foreground">{config.title}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Reward Rate</span>
                          <p className="text-sm text-muted-foreground">{pool.apyRate.toFixed(2)}% APY</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Status</span>
                          <Badge className={status.color}>{status.label}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Activity</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 5).map((activity: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{activity.type}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{activity.amount} GAME</p>
                          <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Pool activity will appear here as users stake and unstake."
                variant="card"
                size="sm"
              />
            )}
          </div>

          {/* Top Stakers */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Top Stakers</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            {stakers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stakers.slice(0, 6).map((staker: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          #{index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {staker.address.slice(0, 6)}...{staker.address.slice(-4)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {staker.amount} GAME staked
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No stakers yet"
                description="Be the first to stake in this pool!"
                variant="card"
                size="sm"
                primaryAction={
                  pool.active ? {
                    label: 'Start Staking',
                    onClick: () => openStakingModal('stake')
                  } : undefined
                }
              />
            )}
          </div>
        </div>
      </DetailPageLayout>

      {/* Staking Modal */}
      <StakingModal
        isOpen={stakingModal.isOpen}
        onClose={closeStakingModal}
        poolPurpose={id.toUpperCase() as any}
        poolTitle={config.title}
        poolApy={pool.apyRate}
        mode={stakingModal.mode}
      />
    </ErrorBoundary>
  )
}
