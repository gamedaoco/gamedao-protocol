'use client'

import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DetailPageLayout } from '@/components/layout/detailPageLayout'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { useProposals } from '@/hooks/useProposals'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useState } from 'react'
import { Vote, Users, Clock, CheckCircle, XCircle, Pause } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'

// Individual proposal hook (to be implemented)
function useProposal(id: string) {
  // For now, get from the proposals list
  // TODO: Implement individual proposal fetching
  const { proposals, isLoading, error, getStateString, castVote, isVoting, canUserVote, hasUserVoted, getVotingPowerForProposal } = useProposals()
  const { organizations } = useOrganizations()

  const proposal = proposals?.find(prop => prop.id === id)
  const organization = proposal ? organizations?.find(org => org.id === proposal.organization.id) : null

  return {
    proposal,
    organization,
    isLoading,
    error,
    // Utility functions
    getStateString,
    castVote,
    isVoting,
    canUserVote,
    hasUserVoted,
    getVotingPowerForProposal
  }
}

interface ProposalDetailPageProps {
  params: { id: string } | Promise<{ id: string }>
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  // Handle both Promise and resolved params
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { id } = resolvedParams
  const {
    proposal,
    organization,
    isLoading,
    error,
    getStateString,
    castVote,
    isVoting,
    canUserVote,
    hasUserVoted,
    getVotingPowerForProposal
  } = useProposal(id)

  const [votingPower, setVotingPower] = useState<number>(0)

  // Load voting power when component mounts
  React.useEffect(() => {
    if (proposal && canUserVote(proposal.id)) {
      getVotingPowerForProposal(proposal.id).then(setVotingPower)
    }
  }, [proposal, canUserVote, getVotingPowerForProposal])

  // Handle voting
  const handleVote = async (choice: 0 | 1 | 2) => {
    if (!proposal || !canUserVote(proposal.id)) return

    try {
      await castVote(proposal.id, choice)
      // Voting power will be recalculated after vote
      setVotingPower(0)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <DetailPageLayout
        title="Loading..."
        breadcrumbs={[
          { label: 'Signal', href: '/signal' },
          { label: 'Proposals', href: '/signal' },
          { label: 'Loading...', current: true }
        ]}
        loading={true}
      >
        <div>Loading proposal details...</div>
      </DetailPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <DetailPageLayout
        title="Error"
        breadcrumbs={[
          { label: 'Signal', href: '/signal' },
          { label: 'Proposals', href: '/signal' },
          { label: 'Error', current: true }
        ]}
      >
        <div>Error loading proposal</div>
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
          { label: 'Proposals', href: '/signal' },
          { label: 'Not Found', current: true }
        ]}
        backHref="/signal"
      >
        <EmptyState
          title="Proposal not found"
          description="The proposal you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Browse Proposals',
            onClick: () => window.location.href = '/signal'
          }}
        />
      </DetailPageLayout>
    )
  }

  // Calculate proposal metrics
  const isActive = proposal.state === 'ACTIVE'
  const timeLeft = proposal.endTime > Math.floor(Date.now() / 1000)
    ? `${Math.ceil((proposal.endTime - Math.floor(Date.now() / 1000)) / 86400)} days`
    : 'Ended'
  const state = getStateString(proposal.state)

  // Get proposal status for badge
  const getProposalStatus = () => {
    if (proposal.state === 'ACTIVE') return { label: 'Active', variant: 'default' as const }
    if (proposal.state === 'EXECUTED') return { label: 'Executed', variant: 'default' as const }
    if (proposal.state === 'DEFEATED') return { label: 'Defeated', variant: 'destructive' as const }
    if (proposal.state === 'CANCELLED') return { label: 'Cancelled', variant: 'secondary' as const }
    return { label: 'Pending', variant: 'secondary' as const }
  }

  const status = getProposalStatus()

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
            value: organization?.name || proposal.organization.name,
            icon: <Users className="h-4 w-4" />
          },
          {
            label: 'Proposer',
            value: `${proposal.proposer.address.slice(0, 8)}...${proposal.proposer.address.slice(-6)}`,
            icon: <Vote className="h-4 w-4" />
          },
          {
            label: 'Time Left',
            value: timeLeft,
            icon: <Clock className="h-4 w-4" />
          },
          {
            label: 'Total Votes',
            value: proposal.totalVotes.toString(),
            icon: <Vote className="h-4 w-4" />
          }
        ]}
        primaryAction={
          isActive ? {
            label: 'Cast Vote',
            onClick: () => {
              // TODO: Implement voting modal
              console.log('Vote on proposal:', proposal.id)
            }
          } : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Share
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Proposal Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Voting Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Voting Results</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>For</span>
                      </div>
                      <span className="font-semibold">{proposal.votesFor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Against</span>
                      </div>
                      <span className="font-semibold">{proposal.votesAgainst}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-gray-600" />
                        <span>Abstain</span>
                      </div>
                      <span className="font-semibold">{proposal.totalVotes - proposal.votesFor - proposal.votesAgainst}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Votes</span>
                      <span className="font-semibold">{proposal.totalVotes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p>{proposal.description || 'No description provided for this proposal.'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Proposal ID</p>
                      <p className="font-mono">{proposal.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p>{proposal.proposalType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Voting Type</p>
                      <p>{proposal.votingType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">State</p>
                      <p>{state}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Time</p>
                      <p>{formatDistanceToNow(new Date(proposal.startTime * 1000), { addSuffix: true })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Time</p>
                      <p>{formatDistanceToNow(new Date(proposal.endTime * 1000), { addSuffix: true })}</p>
                    </div>
                  </div>
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

              {/* Voting Action */}
              {isActive && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cast Your Vote</CardTitle>
                  </CardHeader>
                                    <CardContent className="space-y-4">
                    {/* Voting Status */}
                    <div className="text-sm text-muted-foreground space-y-1">
                      {hasUserVoted(proposal.id) ? (
                        <p className="text-green-600">✓ You have already voted on this proposal</p>
                      ) : votingPower === 0 ? (
                        <p className="text-red-600">⚠ You don&apos;t have voting power for this proposal</p>
                      ) : (
                        <p>Your voting power: {votingPower}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleVote(1)}
                        disabled={isVoting || !canUserVote(proposal.id) || hasUserVoted(proposal.id) || votingPower === 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isVoting ? 'Voting...' : 'Vote For'}
                      </Button>
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() => handleVote(0)}
                          disabled={isVoting || !canUserVote(proposal.id) || hasUserVoted(proposal.id) || votingPower === 0}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {isVoting ? 'Voting...' : 'Vote Against'}
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleVote(2)}
                          disabled={isVoting || !canUserVote(proposal.id) || hasUserVoted(proposal.id) || votingPower === 0}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          {isVoting ? 'Voting...' : 'Abstain'}
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
