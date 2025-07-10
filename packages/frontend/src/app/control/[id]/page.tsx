'use client'

import { use, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganizations } from '@/hooks/useOrganizations'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Loader } from '@/components/ui/loader'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { JoinOrganizationModal } from '@/components/organization/join-organization-modal'
import { Badge } from '@/components/ui/badge'
import { formatAddress } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import { getDAOMembers, isDAOMember, ScaffoldUser } from '@/lib/scaffold-data'
import { useAccount } from 'wagmi'

interface OrganizationDetailPageProps {
  params: { id: string } | Promise<{ id: string }>
}



export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { id } = resolvedParams

  const { address } = useAccount()
  const { organizations, isLoading, refetch } = useOrganizations()
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [members, setMembers] = useState<ScaffoldUser[]>([])

  // Find the organization
  const organization = organizations.find((org) => org.id === id)

  // Check if current user is a member
  const isMember = address && organization ? isDAOMember(organization.id, address) : false

  // Load members when organization is found
  useEffect(() => {
    if (organization) {
      const orgMembers = getDAOMembers(organization.id)
      setMembers(orgMembers)
    }
  }, [organization])

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
                  {organization.memberCount || 0}
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

                {/* Membership Status */}
                {address && (
                  <div>
                    <h4 className="font-medium mb-2">Your Membership</h4>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isMember ? "default" : "secondary"}
                        className={isMember ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                      >
                        {isMember ? '✓ Member' : 'Not a Member'}
                      </Badge>
                      {isMember && (
                        <span className="text-sm text-muted-foreground">
                          You can participate in governance and campaigns
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Campaigns</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/flow?org=${organization.id}`}>View All</a>
                </Button>
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Proposals</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/signal?org=${organization.id}`}>View All</a>
                </Button>
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

          {/* Members & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Members</span>
                  {members.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllMembers(!showAllMembers)}
                      className="flex items-center gap-1"
                    >
                      {showAllMembers ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          View All
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.length > 0 ? (
                    <>
                      {/* Show first 3 members by default, all if showAllMembers is true */}
                      {(showAllMembers ? members : members.slice(0, 3)).map((member) => (
                        <div key={member.address} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                              {member.name ? member.name[0].toUpperCase() : formatAddress(member.address)[0]}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {member.name || formatAddress(member.address)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {member.role || 'Member'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {member.role || 'Member'}
                            </Badge>
                          </div>
                        </div>
                      ))}

                      {!showAllMembers && members.length > 3 && (
                        <div className="text-center pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllMembers(true)}
                            className="text-xs"
                          >
                            +{members.length - 3} more members
                          </Button>
                        </div>
                      )}
                    </>
                  ) : organization.memberCount > 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        {organization.memberCount} member{organization.memberCount !== 1 ? 's' : ''} in this organization
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Member details loading...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No members yet. Be the first to join!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">
                      Organization created {organization.createdAt ?
                        new Date(organization.createdAt * 1000).toLocaleDateString() :
                        'recently'
                      }
                    </span>
                  </div>
                  {organization.memberCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        {organization.memberCount} member{organization.memberCount !== 1 ? 's' : ''} joined
                      </span>
                    </div>
                  )}
                  {(organization.totalCampaigns || 0) > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        {organization.totalCampaigns} campaign{organization.totalCampaigns !== 1 ? 's' : ''} launched
                      </span>
                    </div>
                  )}
                  {(organization.totalProposals || 0) > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-muted-foreground">
                        {organization.totalProposals} proposal{organization.totalProposals !== 1 ? 's' : ''} created
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DetailPageLayout>

      {/* Join Organization Modal */}
      {organization && (
        <JoinOrganizationModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          organization={organization}
          onSuccess={() => {
            // Refresh organizations data to update member count
            refetch()
            // Reload members list to include the new member
            if (organization) {
              const orgMembers = getDAOMembers(organization.id)
              setMembers(orgMembers)
            }
            setIsJoinModalOpen(false)
          }}
        />
      )}
    </ErrorBoundary>
  )
}
