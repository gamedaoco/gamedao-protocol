'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Loader } from '@/components/ui/loader'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { JoinOrganizationModal } from '@/components/organization/join-organization-modal'
import { MemberList } from '@/components/organization/MemberList'
import { Badge } from '@/components/ui/badge'
import { formatAddress } from '@/lib/utils'
import { useAccount } from 'wagmi'
import { useOrganizationDetails } from '@/hooks/useOrganizationDetails'
import { useMembership } from '@/hooks/useMembership'

interface OrganizationDetailPageProps {
  params: { id: string }
}

export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = params

  // All hooks must be called at the top level before any conditional logic
  const { address } = useAccount()
  const { organization, actualMemberCount, isLoading, refetch } = useOrganizationDetails(id)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const { isMember } = useMembership(id)
  const isActive = useMemo(() => organization?.state === 1, [organization?.state])

  // Handle leaving organization (for now, just show alert - TODO: implement contract call)
  const handleLeaveOrganization = () => {
    if (!organization || !address) return

    // TODO: Implement actual contract call to leave organization
    // For now, just show confirmation
    const confirmed = window.confirm(`Are you sure you want to leave ${organization.name}?`)
    if (confirmed) {
      console.log('🚪 Leaving organization:', organization.name)
      // This would call the contract's removeMember function
      alert('Leave functionality will be implemented with contract integration')
    }
  }

  // Validate params after all hooks are called
  if (!id) {
    return (
      <DetailPageLayout
        title="Invalid Organization"
        subtitle="No organization ID provided"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organizations', href: '/control' },
          { label: 'Invalid', current: true }
        ]}
      >
        <EmptyState
          title="Invalid Organization"
          description="No organization ID was provided in the URL."
        />
      </DetailPageLayout>
    )
  }

  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading Organization"
        breadcrumbs={[
          { label: 'Control', href: '/control' },
          { label: 'Organization', current: true }
        ]}
        loading={true}
      >
        <Loader />
      </DetailPageLayout>
    )
  }

  // Error state
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
        primaryAction={
          isActive && address ? (
            isMember ? {
              label: 'Leave Organization',
              onClick: handleLeaveOrganization,
              variant: 'outline' as const
            } : {
              label: 'Join Organization',
              onClick: () => setIsJoinModalOpen(true)
            }
          ) : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
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
                  {actualMemberCount || 0}
                </div>
                {address && isMember && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    ✓ You are a member
                  </p>
                )}
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
                    {formatAddress(organization.creator)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Treasury</h4>
                  <p className="text-muted-foreground font-mono text-sm">
                    {formatAddress(organization.treasury.address)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Access Model</h4>
                  <Badge variant="outline">
                    {organization.accessModel === 0 ? 'Open' :
                     organization.accessModel === 1 ? 'Invite Only' : 'Closed'}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Member Limit</h4>
                  <p className="text-muted-foreground">
                    {organization.memberLimit === 0 ? 'No limit' : organization.memberLimit}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Membership Fee</h4>
                  <p className="text-muted-foreground">
                    {organization.membershipFee && organization.membershipFee > 0
                      ? `${organization.membershipFee} GAME`
                      : 'Free'
                    }
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Member Access</h4>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">
                      {organization.accessModel === 0 ? 'Open Access' :
                       organization.accessModel === 1 ? 'Invite Only' : 'Voting Required'}
                    </Badge>
                    {organization.membershipFee && organization.membershipFee > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Requires {organization.membershipFee} GAME tokens to join
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Section */}
          <MemberList
            members={organization.members || []}
            memberCount={actualMemberCount}
            currentUserAddress={address}
            showTitle={true}
          />

          {/* Activity Section */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Campaigns</h4>
                  <p className="text-2xl font-bold">
                    {organization.totalCampaigns || 0}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Proposals</h4>
                  <p className="text-2xl font-bold">
                    {organization.totalProposals || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Join Organization Modal */}
        {organization && (
          <JoinOrganizationModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            organization={{
              ...organization,
              treasury: organization.treasury.address,
              feeModel: 0 // Default feeModel for compatibility
            }}
            onSuccess={() => {
              setIsJoinModalOpen(false)
              refetch()
            }}
          />
        )}
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
