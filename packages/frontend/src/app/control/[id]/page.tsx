'use client'

import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganizations } from '@/hooks/useOrganizations'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Loader } from '@/components/ui/loader'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>
}

// Individual organization hook (to be implemented)
function useOrganization(id: string) {
  // For now, get from the organizations list
  // TODO: Implement individual organization fetching
  const { organizations, isLoading, createError, refetch } = useOrganizations()

  const organization = organizations?.find(org => org.id === id)

  return {
    organization,
    loading: isLoading,
    error: createError, // Use createError from useOrganizations
    refetch,
    // Placeholder for additional organization-specific data
    campaigns: [], // TODO: Fetch organization campaigns
    proposals: [], // TODO: Fetch organization proposals
    activity: [], // TODO: Fetch organization activity
  }
}

export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = use(params)
  const {
    organization,
    loading,
    error,
    refetch
  } = useOrganization(id)

  // Loading state
  if (loading) {
    return (
      <DetailPageLayout
        title="Loading..."
        subtitle="Please wait while we load the organization details"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control' },
          { label: 'Loading...', current: true }
        ]}
      >
        <div className="flex justify-center items-center min-h-64">
          <Loader />
        </div>
      </DetailPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        subtitle="Failed to load organization details"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control' },
          { label: 'Error', current: true }
        ]}
      >
        <EmptyState
          title="Error Loading Organization"
          description={typeof error === 'string' ? error : 'An error occurred while loading the organization'}
          primaryAction={{
            label: 'Try Again',
            onClick: () => refetch()
          }}
        />
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!organization) {
    return (
      <DetailPageLayout
        title="Organization Not Found"
        subtitle="The organization you're looking for doesn't exist"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control' },
          { label: 'Not Found', current: true }
        ]}
      >
        <EmptyState
          title="Organization Not Found"
          description="This organization may have been removed or the ID is incorrect."
        />
      </DetailPageLayout>
    )
  }

  const isActive = organization.state === 1

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={organization.name}
        subtitle={organization.creator ? `Created by ${organization.creator.slice(0, 8)}...` : 'Organization Details'}
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control' },
          { label: organization.name, current: true }
        ]}
        status={{
          label: isActive ? 'Active' : 'Inactive',
          variant: isActive ? 'default' : 'secondary'
        }}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Organization Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isActive ? 'Active' : 'Inactive'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization.memberCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization.createdAt ?
                    new Date(organization.createdAt * 1000).toLocaleDateString() :
                    'Unknown'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Details */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Organization ID</h4>
                  <p className="text-muted-foreground font-mono text-sm">
                    {organization.id}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Creator</h4>
                  <p className="text-muted-foreground font-mono text-sm">
                    {organization.creator || 'Unknown'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Treasury</h4>
                  <p className="text-muted-foreground font-mono text-sm">
                    {organization.treasury || 'Not set'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Access Model</h4>
                  <p className="text-muted-foreground">
                    {organization.accessModel === 0 ? 'Open' :
                     organization.accessModel === 1 ? 'Voting' :
                     organization.accessModel === 2 ? 'Invite' : 'Unknown'}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Member Limit</h4>
                  <p className="text-muted-foreground">
                    {organization.memberLimit || 'Unlimited'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization.totalCampaigns || 0}
                </div>
                <p className="text-muted-foreground text-sm">
                  Total campaigns created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organization.totalProposals || 0}
                </div>
                <p className="text-muted-foreground text-sm">
                  Total governance proposals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activities/Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No Recent Activity"
                description="This organization hasn't had any recent activity."
              />
            </CardContent>
          </Card>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
