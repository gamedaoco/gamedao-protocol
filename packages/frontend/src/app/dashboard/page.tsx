'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAccount } from 'wagmi'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { PortfolioCard } from '@/components/dashboard/portfolio-card'
import { TreasuryCard } from '@/components/dashboard/treasury-card'
import { ReputationCard } from '@/components/reputation/reputation-card'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const { isConnected } = useAccount()
  const { globalStats, recentActivities, isLoading, error } = useProtocolStats()

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
              <div className="text-2xl font-bold">{globalStats.totalOrganizations}</div>
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
              <div className="text-2xl font-bold">{globalStats.totalMembers}</div>
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
              <div className="text-2xl font-bold">${parseFloat(globalStats.totalRaised || '0').toFixed(2)}</div>
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
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your GameDAO overview and activity center
        </p>
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
            <div className="text-2xl font-bold">{globalStats.totalOrganizations}</div>
            <p className="text-muted-foreground text-sm">Total DAOs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalCampaigns}</div>
            <p className="text-muted-foreground text-sm">Active funding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalProposals}</div>
            <p className="text-muted-foreground text-sm">Governance votes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(globalStats.totalRaised || '0').toFixed(2)}</div>
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
            <Button variant="outline" className="h-20 flex-col">
              <span className="text-lg mb-1">🏛️</span>
              <span>Create DAO</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <span className="text-lg mb-1">🎯</span>
              <span>Start Campaign</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <span className="text-lg mb-1">🗳️</span>
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
    </div>
  )
}
