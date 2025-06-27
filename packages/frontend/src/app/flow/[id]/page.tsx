'use client'

import { use } from 'react'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { ErrorBoundary, ErrorState } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Target, Users, Calendar, Coins, Share2, Heart, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Individual campaign hook (to be implemented)
function useCampaign(id: string) {
  // For now, get from the campaigns list
  // TODO: Implement individual campaign fetching
  const { campaigns, isLoading, contributeError, refetch, getProgress, formatAmount, isActive, timeRemaining, getStateString, getFlowTypeString } = useCampaigns()
  const { organizations } = useOrganizations()

  const campaign = campaigns?.find(camp => camp.id === id)
  const organization = campaign ? organizations?.find(org => org.id === campaign.organizationId) : null

  return {
    campaign,
    organization,
    isLoading,
    error: contributeError,
    refetch,
    // Additional campaign-specific data
    contributors: [], // TODO: Fetch contributors
    updates: [], // TODO: Fetch campaign updates
    comments: [], // TODO: Fetch comments
    // Utility functions
    getProgress,
    formatAmount,
    isActive,
    timeRemaining,
    getStateString,
    getFlowTypeString
  }
}

interface CampaignDetailPageProps {
  params: { id: string } | Promise<{ id: string }>
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  // Handle both Promise and resolved params
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { id } = resolvedParams
  const {
    campaign,
    organization,
    isLoading,
    error,
    refetch,
    contributors,
    updates,
    comments,
    getProgress,
    formatAmount,
    isActive,
    timeRemaining,
    getFlowTypeString
  } = useCampaign(id)

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Flow', href: '/flow' },
          { label: 'Campaigns', href: '/flow' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading campaign details...</div>
      </DetailPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        breadcrumbs={[
          { label: 'Flow', href: '/flow' },
          { label: 'Campaigns', href: '/flow' },
          { label: 'Error', current: true }
        ]}
      >
        <ErrorState error={error} retry={refetch} />
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!campaign) {
    return (
      <DetailPageLayout
        title="Campaign Not Found"
        breadcrumbs={[
          { label: 'Flow', href: '/flow' },
          { label: 'Campaigns', href: '/flow' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/flow"
      >
        <EmptyState
          title="Campaign not found"
          description="The campaign you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Campaigns',
            onClick: () => window.location.href = '/flow'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate campaign metrics
  const progress = getProgress(campaign)
  const isActiveCampaign = isActive(campaign)
  const timeLeft = timeRemaining(campaign)
  const flowType = getFlowTypeString(campaign.flowType)

  // Get campaign status for badge
  const getCampaignStatus = () => {
    if (campaign.state === 'ACTIVE' && isActiveCampaign) return { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' }
    if (campaign.state === 'SUCCEEDED') return { label: 'Succeeded', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' }
    if (campaign.state === 'FAILED') return { label: 'Failed', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    if (campaign.state === 'CANCELLED') return { label: 'Cancelled', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' }
    if (campaign.state === 'FINALIZED') return { label: 'Finalized', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' }
    return { label: 'Created', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' }
  }

  const status = getCampaignStatus()

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={campaign.title || `Campaign ${campaign.id.slice(0, 8)}`}
        subtitle={campaign.description}
        breadcrumbs={[
          { label: 'Flow', href: '/flow' },
          { label: 'Campaigns', href: '/flow' },
          { label: campaign.title || 'Campaign', current: true }
        ]}
        backHref="/flow"
        status={status}
        metadata={[
          {
            label: 'Organization',
            value: organization?.name || 'Unknown',
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Type',
            value: flowType,
            icon: <Target className="h-4 w-4" />
          },
          {
            label: 'Time Remaining',
            value: timeLeft,
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: 'Contributors',
            value: contributors.length.toString(),
            icon: <Users className="h-4 w-4" />
          }
        ]}
        primaryAction={
          isActiveCampaign ? {
            label: 'Contribute Now',
            onClick: () => {
              // TODO: Implement contribution modal
              console.log('Contribute to campaign:', campaign.id)
            }
          } : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Follow
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Campaign Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Funding Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Funding Progress</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Raised</p>
                      <p className="text-2xl font-bold">${formatAmount(campaign.raised)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="text-2xl font-bold">${formatAmount(campaign.target)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t text-sm">
                    <div>
                      <p className="text-muted-foreground">Contributors</p>
                      <p className="font-semibold">{campaign.contributorCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time Left</p>
                      <p className="font-semibold">{timeLeft}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold">{flowType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p>{campaign.description || 'No description provided for this campaign.'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Campaign ID</p>
                      <p className="font-mono">{campaign.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Creator</p>
                      <p className="font-mono">{campaign.creator.slice(0, 8)}...{campaign.creator.slice(-6)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{formatDistanceToNow(new Date(campaign.createdAt * 1000), { addSuffix: true })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p>{formatDistanceToNow(new Date(campaign.expiry * 1000), { addSuffix: true })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Updates Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  {updates.length > 0 ? (
                    <div className="space-y-4">
                      {updates.map((update: { id: string; title: string; content: string; timestamp: number }, index: number) => (
                        <div key={update.id || index} className="border-l-2 border-primary pl-4">
                          <h4 className="font-medium">{update.title}</h4>
                          <p className="text-sm text-muted-foreground">{update.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(update.timestamp * 1000), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No updates yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Organization Info */}
              {organization && (
                <Card>
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">{organization.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {organization.memberCount} members
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={`/control/${organization.id}`}>View Organization</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contribution Action */}
              {isActiveCampaign && (
                <Card>
                  <CardHeader>
                    <CardTitle>Support This Campaign</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Button className="w-full" size="lg">
                        <Coins className="h-4 w-4 mr-2" />
                        Contribute Now
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>• Contributions are non-refundable</p>
                      <p>• Funds are released upon milestone completion</p>
                      <p>• You&apos;ll receive updates on campaign progress</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Contributors */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  {contributors.length > 0 ? (
                    <div className="space-y-3">
                      {contributors.slice(0, 5).map((contributor: { address: string; amount: string; timestamp: number }, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm">{contributor.address.slice(0, 8)}...{contributor.address.slice(-6)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(contributor.timestamp * 1000), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="font-medium">${contributor.amount}</p>
                        </div>
                      ))}
                      {contributors.length > 5 && (
                        <Button variant="ghost" size="sm" className="w-full">
                          View All Contributors
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No contributions yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: { id: string; author: string; content: string; timestamp: number }, index: number) => (
                    <div key={comment.id || index} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{comment.author}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.timestamp * 1000), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
