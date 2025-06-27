'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EntityCard } from '@/components/ui/entity-card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState, EmptyCampaigns } from '@/components/ui/empty-state'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useCampaigns } from '@/hooks/useCampaigns'
import { Plus, Target, TrendingUp, Clock, DollarSign } from 'lucide-react'

export default function FlowPage() {
  const { isConnected } = useGameDAO()
  const { campaigns, isLoading, stats, getProgress, formatAmount, isActive, timeRemaining, getStateString, getFlowTypeString } = useCampaigns()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Discover and support crowdfunding campaigns in the gaming ecosystem
          </p>
        </div>
        <Button disabled={!isConnected} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Campaign</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Active Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.activeCampaigns}
            </div>
            <p className="text-xs text-muted-foreground">Currently fundraising</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Raised</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `$${parseFloat(stats.totalRaised).toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Total Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.totalCampaigns}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? `$${stats.userContributions.toFixed(2)}` : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Total contributed' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button variant="default" size="sm">All Campaigns</Button>
        <Button variant="outline" size="sm">Active</Button>
        <Button variant="outline" size="sm">Successful</Button>
        <Button variant="outline" size="sm">My Contributions</Button>
        <Button variant="outline" size="sm">Trending</Button>
      </div>

      {/* Campaigns */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isLoading ? 'Loading Campaigns...' : `All Campaigns (${campaigns.length})`}
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              Filter
            </Button>
          </div>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <EntityCard
                  key={index}
                  entity={{
                    id: `loading-${index}`,
                    name: 'Loading...',
                    description: 'Loading campaign details...'
                  }}
                  variant="campaign"
                  loading={true}
                />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <EntityCard
                  key={campaign.id}
                  entity={{
                    id: campaign.id,
                    name: campaign.title || `Campaign ${campaign.id.slice(0, 8)}`,
                    description: campaign.description,
                    target: campaign.target,
                    raised: campaign.raised,
                    contributors: 0, // TODO: Get actual contributor count
                    endTime: campaign.expiry,
                    status: getStateString(campaign.state)
                  }}
                  variant="campaign"
                  href={`/flow/${campaign.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyCampaigns
              title={isConnected ? 'No campaigns yet' : 'Connect Wallet'}
              description={
                isConnected
                  ? "There are no campaigns available at the moment. Be the first to create one!"
                  : "Connect your wallet to view and support campaigns."
              }
              primaryAction={{
                label: isConnected ? 'Create First Campaign' : 'Connect Wallet',
                onClick: () => {
                  if (isConnected) {
                    window.location.href = '/flow/create'
                  } else {
                    console.log('Connect wallet')
                  }
                }
              }}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
