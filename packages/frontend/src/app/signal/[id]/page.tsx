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
import { useProposal } from '@/hooks/useProposals'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Vote, Users, Calendar, MessageSquare, Activity, Share2, Heart, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const { id } = use(params)
  const {
    proposal,
    hasVoted,
    canVote,
    votingPower,
    timeRemaining,
    isLoading,
    refetch
  } = useProposal(id)
  const { organizations } = useOrganizations()

  // Get the organization for this proposal
  const organization = proposal ? organizations?.find(org => org.id === proposal.organizationId) : null

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Signal', href: '/signal' },
          { label: 'Proposals', href: '/signal/proposals' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading proposal details...</div>
      </DetailPageLayout>
    )
  }

  // Not found state
  if (!proposal) {
    return (
      <DetailPageLayout
        title="Proposal Not Found"
        breadcrumbs={[
          { label: 'Signal', href: '/signal' },
          { label: 'Proposals', href: '/signal/proposals' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/signal/proposals"
      >
        <EmptyState
          title="Proposal not found"
          description="The proposal you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Proposals',
            onClick: () => window.location.href = '/signal/proposals'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate voting metrics
  const totalVotes = proposal.votes.for + proposal.votes.against + proposal.votes.abstain
  const forPercentage = totalVotes > 0 ? (proposal.votes.for / totalVotes) * 100 : 0
  const againstPercentage = totalVotes > 0 ? (proposal.votes.against / totalVotes) * 100 : 0
  const abstainPercentage = totalVotes > 0 ? (proposal.votes.abstain / totalVotes) * 100 : 0

  // Get proposal status for badge
  const getProposalStatus = () => {
    switch (proposal.status.toLowerCase()) {
      case 'active': return { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' }
      case 'passed': return { label: 'Passed', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' }
      case 'failed': return { label: 'Failed', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
      case 'executed': return { label: 'Executed', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' }
      case 'cancelled': return { label: 'Cancelled', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' }
      default: return { label: 'Pending', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' }
    }
  }

  const status = getProposalStatus()
  const isActive = proposal.status.toLowerCase() === 'active'

  return (
    <ErrorBoundary>
      <DetailPageLayout
        title={proposal.title || `Proposal ${proposal.id.slice(0, 8)}`}
        subtitle={proposal.description}
        breadcrumbs={[
          { label: 'Signal', href: '/signal' },
          { label: 'Proposals', href: '/signal' },
          { label: proposal.title || 'Proposal', current: true }
        ]}
        backHref="/signal"
        status={status}
        metadata={[
          {
            label: 'Organization',
            value: organization?.name || proposal.dao,
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Type',
            value: proposal.type,
            icon: <Vote className="h-4 w-4" />
          },
          {
            label: 'Time Left',
            value: proposal.timeLeft,
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: 'Total Votes',
            value: totalVotes.toString(),
            icon: <Users className="h-4 w-4" />
          }
        ]}
        primaryAction={
          isActive && canVote && !hasVoted ? {
            label: 'Cast Vote',
            onClick: () => {
              // TODO: Implement voting modal
              console.log('Cast vote on proposal:', proposal.id)
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
          { id: 'overview', label: 'Overview', href: `/signal/${id}`, current: true },
          { id: 'discussion', label: 'Discussion', href: `/signal/${id}/discussion`, badge: 0 },
          { id: 'votes', label: 'Votes', href: `/signal/${id}/votes`, badge: totalVotes },
          { id: 'history', label: 'History', href: `/signal/${id}/history`, badge: 0 }
        ]}
        sidebar={
          <div className="space-y-6">
            {/* Voting Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Vote className="h-5 w-5 mr-2" />
                  Voting Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* For Votes */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">For</span>
                    </div>
                    <span className="text-sm font-medium">{proposal.votes.for} ({forPercentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={forPercentage} className="h-2 bg-gray-200">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${forPercentage}%` }} />
                  </Progress>
                </div>

                {/* Against Votes */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Against</span>
                    </div>
                    <span className="text-sm font-medium">{proposal.votes.against} ({againstPercentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={againstPercentage} className="h-2 bg-gray-200">
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${againstPercentage}%` }} />
                  </Progress>
                </div>

                {/* Abstain Votes */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Abstain</span>
                    </div>
                    <span className="text-sm font-medium">{proposal.votes.abstain} ({abstainPercentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={abstainPercentage} className="h-2 bg-gray-200">
                    <div className="h-full bg-gray-500 transition-all" style={{ width: `${abstainPercentage}%` }} />
                  </Progress>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quorum</span>
                    <span>{proposal.quorum}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Votes</span>
                    <span>{totalVotes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voting Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Voting Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{formatDistanceToNow(new Date(proposal.startTime * 1000), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ends</span>
                    <span>{formatDistanceToNow(new Date(proposal.endTime * 1000), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{Math.ceil((proposal.endTime - proposal.startTime) / 86400)} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Voting Power */}
            {isActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Voting Power</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{votingPower}</div>
                    <p className="text-sm text-muted-foreground">Voting tokens</p>
                  </div>

                  {hasVoted ? (
                    <div className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✓ Vote Cast
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        You have already voted on this proposal
                      </p>
                    </div>
                  ) : canVote ? (
                    <div className="space-y-2">
                      <Button className="w-full" size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Vote For
                      </Button>
                      <Button className="w-full" variant="destructive" size="sm">
                        <XCircle className="h-4 w-4 mr-2" />
                        Vote Against
                      </Button>
                      <Button className="w-full" variant="outline" size="sm">
                        <MinusCircle className="h-4 w-4 mr-2" />
                        Abstain
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        Cannot Vote
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        You don't have voting power for this proposal
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
          </div>
        }
      >
        <div className="space-y-8">
          {/* Proposal Overview */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Proposal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Voting Stats Cards */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">For Votes</p>
                      <p className="text-3xl font-bold text-green-600">{proposal.votes.for}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {forPercentage.toFixed(1)}% of total votes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Against Votes</p>
                      <p className="text-3xl font-bold text-red-600">{proposal.votes.against}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {againstPercentage.toFixed(1)}% of total votes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Participation</p>
                      <p className="text-3xl font-bold">{totalVotes}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total votes cast
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Proposal Description */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">About This Proposal</h2>
            <Card>
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {proposal.description || 'No description provided for this proposal.'}
                  </p>

                  {/* Proposal Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Proposal Type</h4>
                      <Badge variant="outline">{proposal.type}</Badge>

                      <h4 className="font-semibold">Status</h4>
                      <Badge className={status.color}>{proposal.status}</Badge>

                      <h4 className="font-semibold">Quorum Required</h4>
                      <p>{proposal.quorum}%</p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Proposed By</h4>
                      <p className="font-mono text-sm">
                        {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                      </p>

                      <h4 className="font-semibold">Organization</h4>
                      <p>{organization?.name || proposal.dao}</p>

                      <h4 className="font-semibold">Time Remaining</h4>
                      <p>{proposal.timeLeft}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Votes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recent Votes</h2>
              <Button variant="outline" size="sm">
                View All Votes
              </Button>
            </div>

            {totalVotes > 0 ? (
              <div className="space-y-3">
                {/* Mock recent votes - would be replaced with actual vote data */}
                {Array.from({ length: Math.min(5, totalVotes) }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">
                              0x{Math.random().toString(16).substr(2, 6)}...{Math.random().toString(16).substr(2, 4)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {Math.floor(Math.random() * 60)} minutes ago
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={index % 3 === 0 ? 'default' : index % 3 === 1 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {index % 3 === 0 ? 'For' : index % 3 === 1 ? 'Against' : 'Abstain'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(Math.random() * 100)} votes
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No votes yet"
                description="Be the first to vote on this proposal!"
                variant="card"
                size="sm"
                primaryAction={
                  isActive && canVote && !hasVoted ? {
                    label: 'Cast Your Vote',
                    onClick: () => {
                      console.log('Cast vote on proposal:', proposal.id)
                    }
                  } : undefined
                }
              />
            )}
          </div>

          {/* Discussion Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Discussion</h2>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Join Discussion
              </Button>
            </div>

            <EmptyState
              title="No comments yet"
              description="Start the conversation about this proposal."
              variant="card"
              size="sm"
              primaryAction={{
                label: 'Add Comment',
                onClick: () => {
                  console.log('Add comment to proposal:', proposal.id)
                }
              }}
            />
          </div>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
