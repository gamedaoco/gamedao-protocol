'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowUpRight, Users, Target, Vote, Coins, TrendingUp, Calendar, Award, DollarSign, Zap, Activity } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useProposals } from '@/hooks/useProposals'
import { useStakingPools } from '@/hooks/use-staking-pools'
import { formatUnits } from 'viem'

export default function DashboardPage() {
  const { address, isConnected } = useGameDAO()
  const { globalStats: stats, isLoading } = useProtocolStats()
  const { userOrganizations, stats: orgStats } = useOrganizations()
  const { userContributions, stats: campaignStats } = useCampaigns()
  const { userVotes, stats: proposalStats } = useProposals()
  const { userStakes, userStats } = useStakingPools()

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatTokenAmount = (amount: string) => {
    try {
      const formatted = formatUnits(BigInt(amount), 18)
      const num = parseFloat(formatted)
      return formatNumber(num)
    } catch {
      return '0'
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view your dashboard</p>
          <Button>Connect Wallet</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your GameDAO activity and portfolio</p>
      </div>

      {/* User Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              My Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <div className="h-6 w-8 bg-muted rounded animate-pulse"></div> : userOrganizations.length}
            </div>
            <p className="text-xs text-muted-foreground">DAOs you're part of</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Campaign Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <div className="h-6 w-8 bg-muted rounded animate-pulse"></div> : userContributions.length}
            </div>
            <p className="text-xs text-muted-foreground">Total: ${userContributions.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Vote className="h-4 w-4 mr-2" />
              Governance Participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <div className="h-6 w-8 bg-muted rounded animate-pulse"></div> : userVotes.length}
            </div>
            <p className="text-xs text-muted-foreground">Votes cast</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Coins className="h-4 w-4 mr-2" />
              Staking Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.totalRewardsClaimed ? formatNumber(parseFloat(formatUnits(userStats.totalRewardsClaimed, 18))) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">GAME tokens earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Personal Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Your DAOs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userOrganizations}</div>
            <p className="text-xs text-muted-foreground">Organizations you're part of</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Contributions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.userCampaigns * 500}</div>
            <p className="text-xs text-muted-foreground">Across {stats.userCampaigns} campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Vote className="h-4 w-4" />
              <span>Votes Cast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userVotes}</div>
            <p className="text-xs text-muted-foreground">Governance participation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Coins className="h-4 w-4" />
              <span>Staked GAME</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStakes.length > 0
                ? formatTokenAmount(userStakes.reduce((sum, stake) => sum + (stake ? Number(stake.amount) : 0), 0).toString())
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {userStakes.length > 0 ? `In ${userStakes.length} pools` : 'Connect to see stakes'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Overview */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Protocol Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Total DAOs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : formatNumber(stats.totalOrganizations)}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : `${stats.activeOrganizations} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Campaigns</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : formatNumber(stats.totalCampaigns)}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : `${stats.activeCampaigns} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Vote className="h-4 w-4" />
                <span>Proposals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : formatNumber(stats.totalProposals)}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? 'Loading...' : `${stats.activeProposals} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Coins className="h-4 w-4" />
                <span>GAME Staked</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTokenAmount(stats.totalStaked)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalStakers} stakers • {stats.avgApy.toFixed(1)}% avg APY
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Create DAO</span>
              </CardTitle>
              <CardDescription>
                Start your own gaming organization with tokenomics and governance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={!isConnected}>
                <Zap className="h-4 w-4 mr-2" />
                Launch DAO
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Fund Campaign</span>
              </CardTitle>
              <CardDescription>
                Create a fundraising campaign for your game development project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled={!isConnected}>
                <DollarSign className="h-4 w-4 mr-2" />
                Start Campaign
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5" />
                <span>Stake GAME</span>
              </CardTitle>
              <CardDescription>
                Earn rewards by staking GAME tokens in various pools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled={!isConnected}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Stake Tokens
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
                <p className="text-muted-foreground max-w-md">
                  {isConnected
                    ? "Start participating in DAOs, campaigns, and governance to see your activity here."
                    : "Connect your wallet to see your recent activity across the GameDAO ecosystem."
                  }
                </p>
                {!isConnected && (
                  <Button className="mt-4">
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
