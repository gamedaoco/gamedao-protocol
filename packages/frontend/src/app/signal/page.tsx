'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Vote, Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'

export default function SignalPage() {
  const { isConnected } = useGameDAO()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Governance</h1>
          <p className="text-muted-foreground">
            Participate in DAO governance and shape the future of gaming communities
          </p>
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
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Awaiting votes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Voters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,847</div>
            <p className="text-xs text-muted-foreground">Across all DAOs</p>
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
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Proposals executed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isConnected ? '23' : '0'}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Votes cast this month' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Active', 'Pending', 'Executed', 'Defeated', 'Expired'].map((status) => (
          <Badge key={status} variant={status === 'All' ? 'default' : 'outline'} className="cursor-pointer">
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
            {/* Sample Proposal Items */}
            {[
              {
                id: 'PROP-001',
                title: 'Increase Development Fund Allocation',
                description: 'Proposal to allocate additional 50,000 USDC from treasury to game development initiatives',
                dao: 'GameDev Collective',
                type: 'Treasury',
                status: 'active',
                votes: { for: 234, against: 45, abstain: 12 },
                quorum: 300,
                timeLeft: '2 days',
                proposer: '0x1234...5678'
              },
              {
                id: 'PROP-002',
                title: 'Add New Gaming Category',
                description: 'Proposal to add "Metaverse Gaming" as a new category for campaign submissions',
                dao: 'Esports Alliance',
                type: 'Parametric',
                status: 'active',
                votes: { for: 156, against: 23, abstain: 8 },
                quorum: 200,
                timeLeft: '5 days',
                proposer: '0xabcd...efgh'
              },
              {
                id: 'PROP-003',
                title: 'Partnership with Gaming Studio',
                description: 'Establish strategic partnership with Indie Studios Inc. for exclusive game development',
                dao: 'NFT Gaming Hub',
                type: 'Simple',
                status: 'executed',
                votes: { for: 345, against: 67, abstain: 23 },
                quorum: 400,
                timeLeft: 'Completed',
                proposer: '0x9876...5432'
              }
            ].map((proposal, index) => (
              <div key={index} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">{proposal.id}</Badge>
                      <Badge variant="secondary" className="text-xs">{proposal.type}</Badge>
                      <Badge
                        variant={proposal.status === 'active' ? 'default' : proposal.status === 'executed' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {proposal.status}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-lg mb-2">{proposal.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{proposal.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>DAO: {proposal.dao}</span>
                      <span>Proposer: {proposal.proposer}</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{proposal.timeLeft}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Voting Progress</span>
                    <span>{proposal.votes.for + proposal.votes.against + proposal.votes.abstain} / {proposal.quorum} votes</span>
                  </div>

                  <div className="space-y-2">
                    {/* For votes */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 text-xs text-muted-foreground">For</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 rounded-full h-2"
                          style={{ width: `${(proposal.votes.for / proposal.quorum) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{proposal.votes.for}</div>
                    </div>

                    {/* Against votes */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 text-xs text-muted-foreground">Against</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-red-500 rounded-full h-2"
                          style={{ width: `${(proposal.votes.against / proposal.quorum) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{proposal.votes.against}</div>
                    </div>

                    {/* Abstain votes */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 text-xs text-muted-foreground">Abstain</div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-gray-500 rounded-full h-2"
                          style={{ width: `${(proposal.votes.abstain / proposal.quorum) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-xs text-right">{proposal.votes.abstain}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="flex space-x-2">
                      {proposal.status === 'active' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Vote For
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <XCircle className="h-3 w-3 mr-1" />
                            Vote Against
                          </Button>
                          <Button size="sm" variant="outline">
                            Abstain
                          </Button>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
