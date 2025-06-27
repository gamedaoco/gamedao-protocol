'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityCard } from '@/components/ui/entity-card'
import { EmptyOrganizations } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useGameDAO } from '@/hooks/useGameDAO'
import { Plus, Users, TrendingUp, DollarSign } from 'lucide-react'

export default function ControlPage() {
  const { isConnected, address } = useGameDAO()
  const { organizations, stats: orgStats, isLoading } = useOrganizations()
  const { globalStats: stats } = useProtocolStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Discover and manage gaming DAOs in the GameDAO ecosystem
          </p>
        </div>
        <Button disabled={!isConnected} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create DAO</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Organizations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.totalOrganizations}
            </div>
            <p className="text-xs text-muted-foreground">Active in protocol</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Total Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.totalMembers}
            </div>
            <p className="text-xs text-muted-foreground">Across all DAOs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Value Locked</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <div className="h-6 w-16 bg-muted rounded animate-pulse"></div> : `$${stats.totalRaised || '0'}`}
            </div>
            <p className="text-xs text-muted-foreground">Across all treasuries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? (isLoading ? <div className="h-6 w-8 bg-muted rounded animate-pulse"></div> : orgStats.userMemberships.length) : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Organizations you own' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">All Organizations</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              Filter
            </Button>
          </div>
        </div>

        {/* Organizations Display */}
        <ErrorBoundary>
          {organizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org) => (
                <EntityCard
                  key={org.id}
                  entity={{
                    id: org.id,
                    name: org.name,
                    memberCount: org.memberCount,
                    treasury: org.treasury,
                    accessModel: org.accessModel,
                    status: org.state === 1 ? 'Active' : 'Inactive',
                    createdAt: org.createdAt
                  }}
                  variant="organization"
                  href={`/control/${org.id}`}
                  onAction={(action, entity) => {
                    if (action === 'view') {
                      window.location.href = `/control/${entity.id}`
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyOrganizations
              title={isConnected ? 'No Organizations Yet' : 'Connect Wallet'}
              description={
                isConnected
                  ? "There are no organizations in the protocol yet. Be the first to create a gaming DAO!"
                  : "Connect your wallet to view and interact with organizations."
              }
              primaryAction={{
                label: isConnected ? 'Create First DAO' : 'Connect Wallet',
                onClick: () => {
                  if (isConnected) {
                    window.location.href = '/control/create'
                  } else {
                    // TODO: Connect wallet
                    console.log('Connect wallet')
                  }
                }
              }}
              secondaryAction={
                isConnected ? {
                  label: 'Learn More',
                  onClick: () => {
                    // TODO: Navigate to documentation
                    console.log('Learn more about DAOs')
                  }
                } : undefined
              }
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
