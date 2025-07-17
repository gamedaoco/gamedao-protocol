'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Loader } from '@/components/ui/loader'
import { JoinOrganizationModal } from '@/components/organization/join-organization-modal'
import { MemberList } from '@/components/organization/MemberList'
import { Badge } from '@/components/ui/badge'
import { IPFSBanner, IPFSAvatar } from '@/components/ui/IPFSImage'
import { formatAddress } from '@/lib/utils'
import { useAccount } from 'wagmi'
import { useOrganizationDetails } from '@/hooks/useOrganizationDetails'
import { useOrganizationMetadata } from '@/hooks/useOrganizationMetadata'
import { useMembership } from '@/hooks/useMembership'
import { useLogger } from '@/hooks/useLogger'
import { formatUnits } from 'viem'
import { Users, Crown, TrendingUp, Wallet, Shield, User, ChevronDown, ChevronUp, Vote, Clock, CheckCircle, XCircle, Pause, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OrganizationDetailPageProps {
  params: { id: string }
}

export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = params

  // All hooks must be called at the top level before any conditional logic
  const { address } = useAccount()
  const router = useRouter()
  const { organization, actualMemberCount, isLoading, refetch } = useOrganizationDetails(id)
  const { metadata } = useOrganizationMetadata(organization?.metadataURI)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [isProposalsExpanded, setIsProposalsExpanded] = useState(false)
  const { isMember, refetch: refetchMembership } = useMembership(id)
  const isActive = useMemo(() => organization?.state === 1, [organization?.state])
  const { logUserAction } = useLogger('OrganizationDetailPage', { category: 'ui' })

  // Handle copying treasury address
  const handleCopyTreasuryAddress = async () => {
    if (!organization?.treasury) return

    try {
      await navigator.clipboard.writeText(organization.treasury)
      logUserAction('treasury_address_copied', { organizationId: id, treasuryAddress: organization.treasury })
      // You could add a toast notification here if you have toast functionality
    } catch (error) {
      console.error('Failed to copy treasury address:', error)
    }
  }

  // Handle leaving organization
  const handleLeaveOrganization = () => {
    if (!organization || !address) return
    logUserAction('leave_organization_clicked', { organizationId: id })
    setIsLeaveModalOpen(true)
  }

  // Validate params after all hooks are called
  if (!id) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title="Invalid Organization"
          description="No organization ID was provided in the URL."
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Loader />
      </div>
    )
  }

  // Error state
  if (!organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title="Organization Not Found"
          description="This organization may have been removed or the ID is incorrect."
        />
      </div>
    )
  }

  // Get top members (first 3 active members)
  const topMembers = organization.members
    ?.filter(member => member.state === 'ACTIVE')
    ?.slice(0, 3) || []

  // Get prime member
  const primeMember = organization.members?.find(member => member.address === organization.prime)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Full-width banner header */}
        <div className="relative w-full h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden rounded-lg">
          {/* Banner image */}
          {metadata?.bannerImage && (
            <IPFSBanner
              hash={metadata.bannerImage}
              alt={`${organization.name} banner`}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          )}

          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-black/40 rounded-lg" />

          {/* Content container */}
          <div className="relative max-w-7xl mx-auto px-4 h-full flex items-end pb-8">
            <div className="flex items-end gap-6">
              {/* Organization icon */}
              <div className="flex-shrink-0">
                <IPFSAvatar
                  hash={metadata?.profileImage}
                  alt={organization.name}
                  size="xl"
                  className="border-4 border-white shadow-lg"
                />
              </div>

              {/* Organization title and actions */}
              <div className="flex-1 min-w-0">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      {metadata?.name || organization.name}
                    </h1>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={isActive ? 'default' : 'secondary'}
                        className="bg-white/20 text-white border-white/30"
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        <Wallet className="h-4 w-4" />
                        <span>Treasury: {formatAddress(organization.treasury)}</span>
                        <button
                          onClick={handleCopyTreasuryAddress}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title="Copy treasury address"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {isActive && address && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                        Share
                      </Button>
                      {isMember ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLeaveOrganization}
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                          Leave Organization
                        </Button>
                                             ) : (
                         <Button
                           onClick={() => {
                             logUserAction('join_organization_clicked', { organizationId: id })
                             setIsJoinModalOpen(true)
                           }}
                           className="bg-white text-black hover:bg-white/90"
                         >
                           Join Organization
                         </Button>
                       )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* About Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and creation date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Created</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(organization.createdAt * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {metadata?.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {metadata.description}
                    </p>
                  </div>
                )}

                {/* Organization details */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <h4 className="font-medium mb-1">Access Model</h4>
                    <Badge variant="outline">
                      {organization.accessModel === 0 ? 'Open' :
                       organization.accessModel === 1 ? 'Invite Only' : 'Closed'}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Member Limit</h4>
                    <p className="text-sm text-muted-foreground">
                      {organization.memberLimit === 0 ? 'No limit' : organization.memberLimit}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Membership Fee</h4>
                    <p className="text-sm text-muted-foreground">
                      {organization.membershipFee && organization.membershipFee > 0
                        ? `${organization.membershipFee} GAME`
                        : 'Free'
                      }
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Treasury</h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      {formatAddress(organization.treasury.address)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Members Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Member count */}
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">
                    {actualMemberCount}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total Members
                  </p>
                  {address && isMember && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      ✓ You are a member
                    </p>
                  )}
                </div>

                {/* Prime member */}
                {primeMember && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Prime</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-mono">
                        {formatAddress(primeMember.address)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Top members */}
                {topMembers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Top Members</span>
                    </div>
                    <div className="space-y-2">
                      {topMembers.map((member, index) => (
                        <div key={member.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-sm font-mono">
                            {formatAddress(member.address)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Treasury & TVL Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Treasury & TVL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Treasury balance */}
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary">
                    {organization.treasury.balance ?
                      parseFloat(formatUnits(BigInt(organization.treasury.balance), 18)).toFixed(2) :
                      '0.00'
                    }
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GAME Tokens
                  </p>
                </div>

                {/* Treasury composition */}
                <div className="space-y-3">
                  <h4 className="font-medium">Treasury Composition</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-sm">GAME Tokens</span>
                      <span className="text-sm font-medium">
                        {organization.treasury.balance ?
                          parseFloat(formatUnits(BigInt(organization.treasury.balance), 18)).toFixed(2) :
                          '0.00'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-sm">Staked Amount</span>
                      <span className="text-sm font-medium">
                        {organization.membershipFee * actualMemberCount || 0} GAME
                      </span>
                    </div>
                  </div>
                </div>

                {/* Activity stats */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">Activity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">
                        {organization.totalCampaigns || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Campaigns</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">
                        {organization.totalProposals || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Proposals</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members Section */}
          <div className="mt-8">
            <MemberList
              members={organization.members || []}
              memberCount={actualMemberCount}
              currentUserAddress={address}
              showTitle={true}
            />
          </div>

          {/* Proposals Section */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Vote className="h-5 w-5" />
                    Recent Proposals
                    <Badge variant="secondary" className="ml-2">
                      {organization.totalProposals || 0}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsProposalsExpanded(!isProposalsExpanded)}
                    className="flex items-center gap-1"
                  >
                    {isProposalsExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {isProposalsExpanded && (
                <CardContent>
                  {organization.proposals && organization.proposals.length > 0 ? (
                    <div className="space-y-4">
                      {organization.proposals
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .slice(0, 10)
                        .map((proposal) => {
                          const getProposalIcon = (state: string) => {
                            switch (state.toLowerCase()) {
                              case 'active':
                                return <Clock className="h-4 w-4 text-blue-500" />
                              case 'executed':
                                return <CheckCircle className="h-4 w-4 text-green-500" />
                              case 'rejected':
                                return <XCircle className="h-4 w-4 text-red-500" />
                              case 'cancelled':
                                return <XCircle className="h-4 w-4 text-gray-500" />
                              default:
                                return <Pause className="h-4 w-4 text-yellow-500" />
                            }
                          }

                          const getProposalStatusColor = (state: string) => {
                            switch (state.toLowerCase()) {
                              case 'active':
                                return 'bg-blue-100 text-blue-800 border-blue-200'
                              case 'executed':
                                return 'bg-green-100 text-green-800 border-green-200'
                              case 'rejected':
                                return 'bg-red-100 text-red-800 border-red-200'
                              case 'cancelled':
                                return 'bg-gray-100 text-gray-800 border-gray-200'
                              default:
                                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }
                          }

                          return (
                            <div
                              key={proposal.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => {
                                logUserAction('proposal_clicked', { proposalId: proposal.id, organizationId: id })
                                router.push(`/signal/${proposal.id}`)
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {getProposalIcon(proposal.state)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-sm truncate">
                                      {proposal.title || `Proposal ${proposal.id.slice(0, 8)}`}
                                    </h4>
                                    <Badge className={getProposalStatusColor(proposal.state)}>
                                      {proposal.state}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Created {new Date(proposal.createdAt * 1000).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    logUserAction('proposal_clicked', { proposalId: proposal.id, organizationId: id })
                                    router.push(`/signal/${proposal.id}`)
                                  }}
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          )
                        })}

                      {organization.proposals.length > 10 && (
                        <div className="text-center pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/signal?org=${id}`)}
                          >
                            View All {organization.totalProposals} Proposals
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      title="No proposals yet"
                      description="This organization hasn't created any proposals yet."
                      icon={<Vote className="h-12 w-12 text-muted-foreground" />}
                      primaryAction={
                        isMember ? {
                          label: 'Create Proposal',
                          onClick: () => router.push(`/signal/create?org=${id}`)
                        } : undefined
                      }
                    />
                  )}
                </CardContent>
              )}
            </Card>
          </div>
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
              refetchMembership()

              // Refetch membership status again after a delay to ensure subgraph indexing
              setTimeout(() => {
                refetchMembership()
              }, 3000)

              // And once more after a longer delay
              setTimeout(() => {
                refetchMembership()
              }, 8000)
            }}
          />
        )}

        {/* Leave Organization Modal */}
        {organization && (
          <JoinOrganizationModal
            isOpen={isLeaveModalOpen}
            onClose={() => setIsLeaveModalOpen(false)}
            organization={{
              ...organization,
              treasury: organization.treasury.address,
              feeModel: 0 // Default feeModel for compatibility
            }}
            mode="leave"
            onSuccess={() => {
              setIsLeaveModalOpen(false)
              refetch()
              refetchMembership()

              // Refetch membership status again after a delay to ensure subgraph indexing
              setTimeout(() => {
                refetchMembership()
              }, 3000)

              // And once more after a longer delay
              setTimeout(() => {
                refetchMembership()
              }, 8000)
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
