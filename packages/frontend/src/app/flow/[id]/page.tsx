'use client'

import { use } from 'react'
import { DetailPageLayout } from '@/components/layout/detail-page-layout'
import { EntityCard } from '@/components/ui/entity-card'
import { ErrorBoundary, ErrorState } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Target, Users, Calendar, Coins, Activity, Share2, Heart, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatEther } from 'viem'

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
  params: Promise<{ id: string }>
}

export default function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = use(params)
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
    getStateString,
    getFlowTypeString
  } = useCampaign(id)

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Flow', href: '/flow' },
          { label: 'Campaigns', href: '/flow/campaigns' },
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
          { label: 'Campaigns', href: '/flow/campaigns' },
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
          { label: 'Campaigns', href: '/flow/campaigns' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/flow/campaigns"
      >
        <EmptyState
          title="Campaign not found"
          description="The campaign you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Campaigns',
            onClick: () => window.location.href = '/flow/campaigns'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate campaign metrics
  const progress = getProgress(campaign)
  const isActiveCampaign = isActive(campaign)
  const timeLeft = timeRemaining(campaign)
  const state = getStateString(campaign.state)
  const flowType = getFlowTypeString(campaign.flowType)

  // Get campaign status for badge
  const getCampaignStatus = () => {
    if (campaign.state === 1 && isActiveCampaign) return { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' }
    if (campaign.state === 2) return { label: 'Succeeded', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' }
    if (campaign.state === 3) return { label: 'Failed', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    if (campaign.state === 4) return { label: 'Cancelled', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' }
    if (campaign.state === 5) return { label: 'Finalized', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' }
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
        tabs={[
          { id: 'overview', label: 'Overview', href: `/flow/${id}`, current: true },
          { id: 'updates', label: 'Updates', href: `/flow/${id}/updates`, badge: updates.length },
          { id: 'contributors', label: 'Contributors', href: `/flow/${id}/contributors`, badge: contributors.length },
          { id: 'comments', label: 'Comments', href: `/flow/${id}/comments`, badge: comments.length }
        ]}
        sidebar={
          <div className="space-y-6">
            {/* Funding Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Funding Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Raised</span>
                    <span className="font-medium">{formatAmount(campaign.raised)} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Target</span>
                    <span className="font-medium">{formatAmount(campaign.target)} ETH</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-center text-sm font-medium">
                    {progress}% funded
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Contribution</span>
                    <span>{formatAmount(campaign.min)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Contribution</span>
                    <span>{formatAmount(campaign.max)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contributors</span>
                    <span>{contributors.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{formatDistanceToNow(new Date(campaign.startTime * 1000), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ends</span>
                    <span>{formatDistanceToNow(new Date(campaign.endTime * 1000), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{Math.ceil((campaign.endTime - campaign.startTime) / 86400)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Info */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <EntityCard
                    entity={{
                      id: organization.id,
                      name: organization.name,
                      memberCount: organization.memberCount,
                      status: organization.state === 1 ? 'Active' : 'Inactive'
                    }}
                    variant="organization"
                    layout="compact"
                    href={`/control/${organization.id}`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {isActiveCampaign && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start">
                    <Coins className="h-4 w-4 mr-2" />
                    Contribute
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Leave Comment
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        }
      >
        <div className="space-y-8">
          {/* Campaign Overview */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Campaign Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Amount Raised</p>
                      <p className="text-3xl font-bold">{formatAmount(campaign.raised)} ETH</p>
                    </div>
                    <Coins className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="mt-2">
                    <Progress value={progress} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress}% of {formatAmount(campaign.target)} ETH goal
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contributors</p>
                      <p className="text-3xl font-bold">{contributors.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    People supporting this campaign
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Time Remaining</p>
                      <p className="text-3xl font-bold">{timeLeft}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isActiveCampaign ? 'Campaign is active' : 'Campaign ended'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Campaign Description */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">About This Campaign</h2>
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {campaign.description || 'No description provided for this campaign.'}
                  </p>

                  {/* Campaign Details */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Campaign Type</h4>
                      <Badge variant="outline">{flowType}</Badge>

                      <h4 className="font-semibold">Funding Goal</h4>
                      <p>{formatAmount(campaign.target)} ETH</p>

                      <h4 className="font-semibold">Contribution Range</h4>
                      <p>{formatAmount(campaign.min)} - {formatAmount(campaign.max)} ETH</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Campaign Status</h4>
                      <Badge className={status.color}>{state}</Badge>

                      <h4 className="font-semibold">Created By</h4>
                      <p className="font-mono text-sm">
                        {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
                      </p>

                      <h4 className="font-semibold">Organization</h4>
                      <p>{organization?.name || 'Unknown Organization'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Updates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Updates</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            {updates.length > 0 ? (
              <div className="space-y-4">
                {updates.slice(0, 3).map((update: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium">{update.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{update.timestamp}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No updates yet"
                description="The campaign creator hasn't posted any updates yet."
                variant="card"
                size="sm"
              />
            )}
          </div>

          {/* Top Contributors */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Top Contributors</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            {contributors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contributors.slice(0, 6).map((contributor: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {contributor.address.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {contributor.address.slice(0, 6)}...{contributor.address.slice(-4)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contributor.amount} ETH contributed
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No contributors yet"
                description="Be the first to support this campaign!"
                variant="card"
                size="sm"
                primaryAction={
                  isActiveCampaign ? {
                    label: 'Contribute Now',
                    onClick: () => {
                      console.log('Contribute to campaign:', campaign.id)
                    }
                  } : undefined
                }
              />
            )}
          </div>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
