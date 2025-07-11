'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAccount } from 'wagmi'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useSenseUsername } from '@/hooks/useTokenBalances'
import { PortfolioCard } from '@/components/dashboard/portfolio-card'
import { TreasuryCard } from '@/components/dashboard/treasury-card'
import { ReputationCard } from '@/components/reputation/reputation-card'
import { formatDistanceToNow } from 'date-fns'
import { Trophy, Award, Target, ExternalLink, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CompactIndexingStatus } from '@/components/indexing-status'
import Link from 'next/link'

export default function DashboardPage() {
  const { isConnected, address } = useAccount()
  const { globalStats, recentActivities, isLoading, error } = useProtocolStats()
  const { hasProfile } = useSenseUsername()
  const router = useRouter()

  // Mock achievements and collectibles data - replace with actual NFT contract calls
  const userAchievements = [
    { id: 1, name: 'First DAO Creator', icon: '🏛️', rarity: 'common', earned: true },
    { id: 2, name: 'Campaign Master', icon: '🎯', rarity: 'rare', earned: true },
    { id: 3, name: 'Community Builder', icon: '👥', rarity: 'epic', earned: false },
    { id: 4, name: 'Governance Expert', icon: '🗳️', rarity: 'legendary', earned: true },
  ]

  const userCollectibles = [
    { id: 1, name: 'Genesis DAO Badge', image: '🏆', collection: 'GameDAO Genesis', tokenId: '#001' },
    { id: 2, name: 'Alpha Tester', image: '🧪', collection: 'GameDAO Beta', tokenId: '#042' },
    { id: 3, name: 'Community Champion', image: '⭐', collection: 'GameDAO Honors', tokenId: '#123' },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800'
      case 'rare': return 'bg-blue-100 text-blue-800'
      case 'epic': return 'bg-purple-100 text-purple-800'
      case 'legendary': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Welcome to GameDAO</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to access your dashboard and start participating in the GameDAO ecosystem.
          </p>
          <Button size="lg">
            Connect Wallet
          </Button>
        </div>

        {/* Public Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : globalStats.totalOrganizations}</div>
              <p className="text-muted-foreground text-sm">
                Active gaming DAOs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : globalStats.totalMembers}</div>
              <p className="text-muted-foreground text-sm">
                Community participants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Raised</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${isLoading ? '0.00' : parseFloat(globalStats.totalRaised).toFixed(2)}</div>
              <p className="text-muted-foreground text-sm">
                Across all campaigns
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to GameDAO Protocol
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CompactIndexingStatus />
          {isConnected && (
            <Button asChild>
              <Link href="/control/create">
                Create Organization
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PortfolioCard />
        <TreasuryCard />
        <ReputationCard />
      </div>

      {/* Protocol Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : globalStats.totalOrganizations}</div>
            <p className="text-muted-foreground text-sm">Total DAOs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : globalStats.totalCampaigns}</div>
            <p className="text-muted-foreground text-sm">Active funding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : globalStats.totalProposals}</div>
            <p className="text-muted-foreground text-sm">Governance votes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${isLoading ? '0.00' : parseFloat(globalStats.totalRaised).toFixed(2)}</div>
            <p className="text-muted-foreground text-sm">Community funded</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" disabled={!isConnected}>
              <Plus className="h-5 w-5 mb-1" />
              <span>Create DAO</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" disabled={!isConnected}>
              <Plus className="h-5 w-5 mb-1" />
              <span>Start Campaign</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" disabled={!isConnected}>
              <Plus className="h-5 w-5 mb-1" />
              <span>Create Proposal</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <span className="text-lg mb-1">💰</span>
              <span>Stake Tokens</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-48"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load recent activity</p>
              <p className="text-sm">Please check your connection</p>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp * 1000), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
              <p className="text-sm">Start participating to see activity here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/sense/${address}`)}>
            <ExternalLink className="h-4 w-4 mr-1" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {hasProfile ? (
            <div className="grid gap-3 md:grid-cols-2">
              {userAchievements.filter(a => a.earned).slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                  <div className="text-xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{achievement.name}</h4>
                      <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                        {achievement.rarity}
                      </Badge>
                      <Award className="h-3 w-3 text-yellow-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No achievements yet</p>
              <p className="text-sm">Create a profile to start earning achievements</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push(`/sense/${address}`)}>
                Create Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collectibles Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            NFT Collectibles
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/sense/${address}`)}>
            <ExternalLink className="h-4 w-4 mr-1" />
            View Collection
          </Button>
        </CardHeader>
        <CardContent>
          {hasProfile ? (
            <div className="grid gap-4 md:grid-cols-3">
              {userCollectibles.slice(0, 3).map((collectible) => (
                <div key={collectible.id} className="p-4 rounded-lg border bg-background">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{collectible.image}</div>
                    <h4 className="font-medium text-sm">{collectible.name}</h4>
                    <p className="text-xs text-muted-foreground mb-1">
                      {collectible.collection}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {collectible.tokenId}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No collectibles yet</p>
              <p className="text-sm">Participate in GameDAO to earn NFT collectibles</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push(`/sense/${address}`)}>
                Create Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
