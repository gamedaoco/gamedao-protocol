'use client'

import { use } from 'react'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { EntityCard } from '@/components/ui/entity-card'
import { ErrorBoundary, ErrorState } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Users, Settings, Plus, Calendar, Coins, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Individual organization hook (to be implemented)
function useOrganization(id: string) {
  // For now, get from the organizations list
  // TODO: Implement individual organization fetching
  const { organizations, isLoading, createError, refetch } = useOrganizations()

  const organization = organizations?.find(org => org.id === id)

  return {
    organization,
    isLoading,
    error: createError, // Use createError from useOrganizations
    refetch,
    // Placeholder for additional organization-specific data
    members: [], // TODO: Fetch members
    campaigns: [], // TODO: Fetch organization campaigns
    proposals: [], // TODO: Fetch organization proposals
    treasury: null as { totalValue?: string; usdc?: string; game?: string } | null, // TODO: Fetch treasury data
    activity: [] // TODO: Fetch activity feed
  }
}

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>
}

export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = use(params)
  const {
    organization,
    isLoading,
    error,
    refetch,
    members,
    campaigns,
    proposals,
    treasury,
    activity
  } = useOrganization(id)

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control/organizations' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading organization details...</div>
      </DetailPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control/organizations' },
          { label: 'Error', current: true }
        ]}
      >
        <ErrorState error={error} retry={refetch} />
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!organization) {
    return (
      <DetailPageLayout
        title="Organization Not Found"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control/organizations' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/control/organizations"
      >
        <EmptyState
          title="Organization not found"
          description="The organization you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Organizations',
            onClick: () => window.location.href = '/control/organizations'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Get organization status
  const getOrganizationStatus = () => {
    if (organization.memberCount === 0) return { label: 'Empty', variant: 'secondary' as const }
    if (organization.memberCount < 3) return { label: 'Small', variant: 'outline' as const }
    if (organization.memberCount < 10) return { label: 'Growing', variant: 'default' as const }
    return { label: 'Established', variant: 'default' as const }
  }

  const status = getOrganizationStatus()

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={organization.name || `Organization ${organization.id.slice(0, 8)}`}
        subtitle={`Organization managed by ${organization.creator.slice(0, 6)}...${organization.creator.slice(-4)}`}
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control/organizations' },
          { label: organization.name || 'Organization', current: true }
        ]}
        backHref="/control/organizations"
        status={status}
        metadata={[
          {
            label: 'Members',
            value: organization.memberCount.toString(),
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Access Model',
            value: organization.accessModel === 0 ? 'Open' : organization.accessModel === 1 ? 'Invite Only' : 'Application Required',
            icon: <Settings className="h-4 w-4" />
          },
          {
            label: 'Created',
            value: organization.createdAt ? formatDistanceToNow(new Date(organization.createdAt * 1000), { addSuffix: true }) : 'Unknown',
            icon: <Calendar className="h-4 w-4" />
          }
        ]}
        primaryAction={{
          label: 'Join Organization',
          onClick: () => {
            // TODO: Implement join functionality
            console.log('Join organization:', organization.id)
          }
        }}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        }
        tabs={[
          { id: 'overview', label: 'Overview', href: `/control/organizations/${id}`, current: true },
          { id: 'members', label: 'Members', href: `/control/organizations/${id}/members`, badge: organization.memberCount },
          { id: 'campaigns', label: 'Campaigns', href: `/control/organizations/${id}/campaigns`, badge: campaigns.length },
          { id: 'proposals', label: 'Proposals', href: `/control/organizations/${id}/proposals`, badge: proposals.length },
          { id: 'treasury', label: 'Treasury', href: `/control/organizations/${id}/treasury` },
          { id: 'activity', label: 'Activity', href: `/control/organizations/${id}/activity` }
        ]}
        sidebar={
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              </CardContent>
            </Card>

            {/* Treasury Overview */}
            {treasury && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Coins className="h-5 w-5 mr-2" />
                    Treasury
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Value</span>
                      <span className="font-medium">${treasury.totalValue || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">USDC</span>
                      <span className="font-medium">{treasury.usdc || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">GAME</span>
                      <span className="font-medium">{treasury.game || '0'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground">{item.timestamp}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Organization Overview */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Members</p>
                      <p className="text-3xl font-bold">{organization.memberCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Campaigns</p>
                      <p className="text-3xl font-bold">{campaigns.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Proposals</p>
                      <p className="text-3xl font-bold">{proposals.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Campaigns */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Campaigns</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            {campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.slice(0, 3).map((campaign: any) => (
                  <EntityCard
                    key={campaign.id}
                    entity={campaign}
                    variant="campaign"
                    href={`/flow/campaigns/${campaign.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No campaigns yet"
                type="campaigns"
                variant="card"
                size="sm"
                primaryAction={{
                  label: 'Create First Campaign',
                  onClick: () => {
                    // TODO: Navigate to campaign creation
                    console.log('Create campaign for organization:', organization.id)
                  }
                }}
              />
            )}
          </div>

          {/* Recent Proposals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Proposals</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            {proposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proposals.slice(0, 3).map((proposal: any) => (
                  <EntityCard
                    key={proposal.id}
                    entity={proposal}
                    variant="proposal"
                    href={`/signal/proposals/${proposal.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No proposals yet"
                type="proposals"
                variant="card"
                size="sm"
                primaryAction={{
                  label: 'Create First Proposal',
                  onClick: () => {
                    // TODO: Navigate to proposal creation
                    console.log('Create proposal for organization:', organization.id)
                  }
                }}
              />
            )}
          </div>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
