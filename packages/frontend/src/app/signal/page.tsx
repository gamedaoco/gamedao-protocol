'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Vote, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useProposals } from '@/hooks/useProposals'
import { useState } from 'react'

export default function SignalPage() {
  const { isConnected } = useGameDAO()
  const { proposals, stats, isLoading, isVoting, castVote, error } = useProposals()
  const [selectedStatus, setSelectedStatus] = useState('All')

  const handleVote = async (proposalId: string, choice: 0 | 1 | 2) => {
    try {
      await castVote(proposalId, choice)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Governance</h1>
          <p className="text-muted-foreground">
            Participate in DAO governance and shape the future of gaming communities
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-1">
              ⚠️ Unable to connect to subgraph: {error.message}
            </p>
          )}
        </div>
        <Button disabled={!isConnected} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Proposal</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Vote className="h-4 w-4" />
              <span>Active Proposals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.activeProposals}</div>
            <p className="text-xs text-muted-foreground">Awaiting votes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Proposals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalProposals}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Execution Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.executionRate}%</div>
            <p className="text-xs text-muted-foreground">Proposals executed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isConnected ? stats.userVotes : '0'}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Votes cast' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Active', 'Pending', 'Executed', 'Defeated', 'Expired'].map((status) => (
          <Badge
            key={status}
            variant={status === selectedStatus ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedStatus(status)}
          >
            {status}
          </Badge>
        ))}
      </div>

      {/* Proposals List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Proposals</CardTitle>
          <CardDescription>
            Vote on proposals that shape the future of gaming DAOs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading proposals...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">Unable to load proposals</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error connecting to the subgraph. Please check that:
                </p>
                <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                  <li>• The subgraph is deployed and running</li>
                  <li>• The local blockchain has proposal data</li>
                  <li>• The GraphQL endpoint is accessible</li>
                </ul>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No proposals found</p>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? 'Create the first proposal!' : 'Connect your wallet to see proposals'}
                </p>
              </div>
            ) : (
              proposals.slice(0, 5).map((proposal, index) => (
              <div key={proposal.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">{proposal.id.slice(0, 8)}...</Badge>
                      <Badge variant="secondary" className="text-xs">{proposal.proposalType}</Badge>
                      <Badge variant="default" className="text-xs">{proposal.state}</Badge>
                    </div>
                    <h3 className="font-medium text-lg mb-2">{proposal.title || `Proposal ${index + 1}`}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{proposal.description || 'Loading proposal details...'}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>DAO: {proposal.organization?.name || 'Loading...'}</span>
                      <span>Proposer: {proposal.proposer?.id?.slice(0, 6) || 'Loading'}...</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{proposal.endTime ? new Date(parseInt(proposal.endTime.toString()) * 1000).toLocaleDateString() : '2 days'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Voting Progress</span>
                    <span>{proposal.totalVotes} / {proposal.quorum || 100} votes</span>
                  </div>

                  <div className="space-y-2">
                    {/* For votes */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 text-xs text-muted-foreground">For</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-green-500 rounded-full h-2" style={{ width: `${proposal.totalVotes > 0 ? (proposal.votesFor / proposal.totalVotes) * 100 : 0}%` }} />
                      </div>
                      <div className="w-12 text-xs text-right">{proposal.votesFor}</div>
                    </div>

                    {/* Against votes */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 text-xs text-muted-foreground">Against</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-red-500 rounded-full h-2" style={{ width: `${proposal.totalVotes > 0 ? (proposal.votesAgainst / proposal.totalVotes) * 100 : 0}%` }} />
                      </div>
                      <div className="w-12 text-xs text-right">{proposal.votesAgainst}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleVote(proposal.id, 1)}
                        disabled={isVoting}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Vote For
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleVote(proposal.id, 0)}
                        disabled={isVoting}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Vote Against
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVote(proposal.id, 2)}
                        disabled={isVoting}
                      >
                        Abstain
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => window.location.href = `/signal/${proposal.id}`}>
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>

          {!isConnected && (
            <div className="text-center py-8 border-t mt-6">
              <p className="text-muted-foreground mb-4">
                Connect your wallet to participate in governance and vote on proposals
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
