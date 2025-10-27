'use client'

import { use } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DetailPageLayout } from '@/components/layout/detailPageLayout'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { TransactionOverlay } from '@/components/ui/transaction-overlay'
import { useProposals, useProposal } from '@/hooks/useProposals'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useState } from 'react'
import { Vote, Users, Clock, CheckCircle, XCircle, Pause } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import { ConvictionVotingModal } from '@/components/ui/conviction-voting-modal'
import { DelegationModal } from '@/components/ui/delegation-modal'

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()

  // Use the proper useProposal hook for individual proposal data
  const { proposal, isLoading, error, refetch } = useProposal(id)

  // Use useProposals for voting actions and utility functions
  const {
    getStateString,
    castVote,
    castVoteWithConviction,
    delegateVotingPower,
    undelegateVotingPower,
    isVoting,
    canUserVote,
    hasUserVoted,
    getVotingPowerForProposal,
    voteSuccess,
    voteError
  } = useProposals()

  // Get organization data
  const { organizations } = useOrganizations()
  const organization = proposal ? organizations?.find(org => org.id === proposal.organization.id) : null

  const [votingPower, setVotingPower] = useState<number>(0)
  const [showConvictionModal, setShowConvictionModal] = useState(false)
  const [showDelegationModal, setShowDelegationModal] = useState(false)
  const [currentVoteChoice, setCurrentVoteChoice] = useState<0 | 1 | 2 | null>(null)

  // Load voting power when component mounts
  React.useEffect(() => {
    if (proposal && canUserVote(proposal.id)) {
      getVotingPowerForProposal(proposal.id).then(setVotingPower)
    }
  }, [proposal, canUserVote, getVotingPowerForProposal])

  // Handle voting success
  React.useEffect(() => {
    if (voteSuccess) {
      // Reset voting power after successful vote
      setVotingPower(0)
      setCurrentVoteChoice(null)
    }
  }, [voteSuccess])

  // Handle voting
  const handleVote = async (choice: 0 | 1 | 2) => {
    if (!proposal || !canUserVote(proposal.id)) return

    setCurrentVoteChoice(choice)
    try {
      await castVote(proposal.id, choice)
      // Voting power will be recalculated after vote
      setVotingPower(0)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  // Handle conviction voting
  const handleConvictionVote = async (choice: 0 | 1 | 2, convictionTime: number, reason: string) => {
    if (!proposal || !canUserVote(proposal.id)) return

    setCurrentVoteChoice(choice)
    try {
      await castVoteWithConviction(proposal.id, choice, convictionTime, reason)
      setVotingPower(0)
    } catch (error) {
      console.error('Error conviction voting:', error)
    }
  }

  // Handle delegation
  const handleDelegate = async (delegatee: string, amount: number) => {
    try {
      await delegateVotingPower(delegatee, amount)
      setVotingPower(prev => prev - amount)
    } catch (error) {
      console.error('Error delegating:', error)
    }
  }

  const handleUndelegate = async (delegatee: string, amount: number) => {
    try {
      await undelegateVotingPower(delegatee, amount)
      setVotingPower(prev => prev + amount)
    } catch (error) {
      console.error('Error undelegating:', error)
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

  const getVoteChoiceLabel = (choice: 0 | 1 | 2) => {
    switch (choice) {
      case 1: return 'For'
      case 0: return 'Against'
      case 2: return 'Abstain'
      default: return 'Unknown'
    }
  }

  return (
    <ErrorBoundary>
      {/* Transaction Overlay for Voting */}
      <TransactionOverlay
        isVisible={isVoting}
        title="Casting Vote"
        description={`Please wait while we cast your vote ${currentVoteChoice !== null ? `"${getVoteChoiceLabel(currentVoteChoice)}"` : ''} on this proposal.`}
        currentStep={voteSuccess ? 'success' : isVoting ? 'creating' : voteError ? 'error' : 'idle'}
        error={voteError ? (voteError as Error).message : null}
        onRetry={() => {
          // Reset vote error and try again
          if (currentVoteChoice !== null) {
            handleVote(currentVoteChoice)
          }
        }}
        successMessage="Vote cast successfully!"
        successAction={{
          label: 'View Proposal',
          onClick: () => window.location.reload()
        }}
        showProgressBar={false}
      />

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
            onClick: () => setShowConvictionModal(true)
          } : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDelegationModal(true)}
            >
              <Users className="h-4 w-4 mr-1" />
              Delegate
            </Button>
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
                <CardContent>
                  <div className="space-y-4">
                    {/* For votes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">For</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${proposal.totalVotes > 0 ? (proposal.votesFor / proposal.totalVotes) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{proposal.votesFor}</span>
                      </div>
                    </div>

                    {/* Against votes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Against</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${proposal.totalVotes > 0 ? (proposal.votesAgainst / proposal.totalVotes) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{proposal.votesAgainst}</span>
                      </div>
                    </div>

                    {/* Abstain votes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pause className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Abstain</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-500 h-2 rounded-full"
                            style={{ width: `${proposal.totalVotes > 0 ? (proposal.votesAbstain / proposal.totalVotes) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{proposal.votesAbstain}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p>{proposal.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Voting Actions */}
              {isActive && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cast Your Vote</CardTitle>
                  </CardHeader>
                  <CardContent className={`space-y-4 ${isVoting ? 'opacity-50 pointer-events-none' : ''}`}>
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
                        {isVoting && currentVoteChoice === 1 ? 'Voting...' : 'Vote For'}
                      </Button>
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={() => handleVote(0)}
                        disabled={isVoting || !canUserVote(proposal.id) || hasUserVoted(proposal.id) || votingPower === 0}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isVoting && currentVoteChoice === 0 ? 'Voting...' : 'Vote Against'}
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleVote(2)}
                        disabled={isVoting || !canUserVote(proposal.id) || hasUserVoted(proposal.id) || votingPower === 0}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        {isVoting && currentVoteChoice === 2 ? 'Voting...' : 'Abstain'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Conviction Voting Modal */}
        <ConvictionVotingModal
          isOpen={showConvictionModal}
          onClose={() => setShowConvictionModal(false)}
          proposalId={proposal.id}
          proposalTitle={proposal.title}
          onVote={handleConvictionVote}
          isVoting={isVoting}
        />

        {/* Delegation Modal */}
        <DelegationModal
          isOpen={showDelegationModal}
          onClose={() => setShowDelegationModal(false)}
          onDelegate={handleDelegate}
          onUndelegate={handleUndelegate}
          isDelegating={isVoting}
          currentVotingPower={votingPower}
        />
      </DetailPageLayout>
    </ErrorBoundary>
  )
}
