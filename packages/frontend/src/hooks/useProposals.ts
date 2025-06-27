'use client'

import { useQuery } from '@apollo/client'
import { useReadContract, useWriteContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_PROPOSALS, GET_PROPOSAL_BY_ID, GET_USER_VOTES } from '@/lib/queries'
import { useState, useMemo, useEffect } from 'react'
import { getScaffoldData, ScaffoldProposal } from '@/lib/scaffold-data'

export interface Proposal {
  id: string
  title: string
  description: string
  organization: {
    id: string
    name: string
  }
  proposer: {
    id: string
    address: string
  }
  proposalType: string
  votingType: string
  state: string
  startTime: number
  endTime: number
  votesFor: number
  votesAgainst: number
  totalVotes: number
  quorum?: number
  threshold?: number
  createdAt: number
  updatedAt: number
}

export interface ProposalStats {
  totalProposals: number
  activeProposals: number
  userVotes: number
  executionRate: number
}

export function useProposals(organizationId?: string) {
  const { address } = useAccount()
  const { contracts, isConnected } = useGameDAO()
  const [isVoting, setIsVoting] = useState(false)
  const { writeContract } = useWriteContract()
  const [scaffoldProposals, setScaffoldProposals] = useState<Proposal[]>([])

  // Fetch proposals from subgraph
  const { data, loading, error, refetch } = useQuery(GET_PROPOSALS, {
    variables: { first: 100, skip: 0 },
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Fetch user's votes from subgraph
  const { data: userVotesData, loading: userVotesLoading } = useQuery(GET_USER_VOTES, {
    variables: { user: address, first: 50 },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Load scaffold data as fallback
  useEffect(() => {
    const scaffoldData = getScaffoldData()
    if (scaffoldData?.proposals) {
      const props: Proposal[] = scaffoldData.proposals.map((prop: ScaffoldProposal) => ({
        id: prop.id,
        title: prop.title,
        description: `A governance proposal for ${prop.daoName}`,
        organization: {
          id: prop.daoId,
          name: prop.daoName,
        },
        proposer: {
          id: prop.proposer,
          address: prop.proposer,
        },
        proposalType: 'SIMPLE',
        votingType: 'SIMPLE',
        state: Math.random() > 0.5 ? 'ACTIVE' : 'PENDING',
        startTime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
        endTime: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 86400 * 7),
        votesFor: Math.floor(Math.random() * 100),
        votesAgainst: Math.floor(Math.random() * 50),
        totalVotes: Math.floor(Math.random() * 150),
        quorum: 100,
        createdAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7),
        updatedAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 2),
      }))
      setScaffoldProposals(props)
    }
  }, [])

  // Get total proposal count
  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: contracts.SIGNAL,
    abi: ABIS.SIGNAL,
    functionName: 'getProposalCount',
    query: { enabled: isConnected },
  })

  // Transform subgraph data to match our interface, fallback to scaffold data
  const proposals: Proposal[] = data?.proposals?.map((prop: any) => ({
    id: prop.id,
    title: prop.title || `Proposal ${prop.id.slice(0, 8)}`,
    description: prop.description || `Governance proposal for ${prop.organization.name}`,
    organization: {
      id: prop.organization.id,
      name: prop.organization.name,
    },
    proposer: {
      id: prop.proposer.id,
      address: prop.proposer.address,
    },
    proposalType: prop.proposalType || 'SIMPLE',
    votingType: prop.votingType || 'SIMPLE',
    state: prop.state || 'PENDING',
    startTime: parseInt(prop.startTime) || 0,
    endTime: parseInt(prop.endTime) || 0,
    votesFor: parseInt(prop.votesFor) || 0,
    votesAgainst: parseInt(prop.votesAgainst) || 0,
    totalVotes: parseInt(prop.totalVotes) || 0,
    createdAt: parseInt(prop.createdAt) || Math.floor(Date.now() / 1000),
    updatedAt: parseInt(prop.updatedAt) || Math.floor(Date.now() / 1000),
  })) || scaffoldProposals

  // Filter by organization if specified
  const filteredProposals = organizationId
    ? proposals.filter(prop => prop.organization.id === organizationId)
    : proposals

  // Get user's votes
  const userVotes = userVotesData?.votes || []

  // Calculate stats
  const stats: ProposalStats = useMemo(() => {
    const total = filteredProposals.length
    const active = filteredProposals.filter(prop => prop.state === 'ACTIVE').length
    const executed = filteredProposals.filter(prop => prop.state === 'EXECUTED').length

    return {
      totalProposals: total,
      activeProposals: active,
      userVotes: userVotes.length,
      executionRate: total > 0 ? Math.round((executed / total) * 100) : 0,
    }
  }, [filteredProposals, userVotes])

  // Cast vote function
  const castVote = async (proposalId: string, choice: 0 | 1 | 2, reason?: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    setIsVoting(true)
    try {
      await writeContract({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'castVote',
        args: [proposalId, choice, reason || ''],
      })

      // Refetch data after voting
      refetch()
      refetchCount()
    } catch (error) {
      console.error('Error casting vote:', error)
      throw error
    } finally {
      setIsVoting(false)
    }
  }

  // Create proposal function
  const createProposal = async (proposalData: {
    organizationId: string
    title: string
    description: string
    proposalType: number
    votingType: number
    votingPeriod: number
  }) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      await writeContract({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'createProposal',
        args: [
          proposalData.organizationId,
          proposalData.title,
          proposalData.description,
          proposalData.proposalType,
          proposalData.votingType,
          proposalData.votingPeriod,
        ],
      })

      // Refetch data after creation
      refetch()
      refetchCount()
    } catch (error) {
      console.error('Error creating proposal:', error)
      throw error
    }
  }

  const getProposalTypeString = (proposalType: string): string => {
    switch (proposalType?.toUpperCase()) {
      case 'SIMPLE': return 'Simple'
      case 'WEIGHTED': return 'Weighted'
      case 'QUADRATIC': return 'Quadratic'
      case 'RANKED': return 'Ranked Choice'
      default: return 'Simple'
    }
  }

  const getVotingTypeString = (votingType: string): string => {
    switch (votingType?.toUpperCase()) {
      case 'SIMPLE': return 'Simple'
      case 'CONVICTION': return 'Conviction'
      case 'RANKED': return 'Ranked'
      default: return 'Simple'
    }
  }

  const getStateString = (state: string): string => {
    switch (state?.toUpperCase()) {
      case 'PENDING': return 'Pending'
      case 'ACTIVE': return 'Active'
      case 'CANCELLED': return 'Cancelled'
      case 'DEFEATED': return 'Defeated'
      case 'SUCCEEDED': return 'Succeeded'
      case 'QUEUED': return 'Queued'
      case 'EXPIRED': return 'Expired'
      case 'EXECUTED': return 'Executed'
      default: return 'Pending'
    }
  }

  const isActive = (proposal: Proposal): boolean => {
    const now = Math.floor(Date.now() / 1000)
    return proposal.state === 'ACTIVE' && proposal.endTime > now
  }

  const getTimeRemaining = (proposal: Proposal): string => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = Math.max(0, proposal.endTime - now)

    if (remaining <= 0) return 'Ended'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const hasUserVoted = (proposalId: string): boolean => {
    return userVotes.some((vote: any) => vote.proposal.id === proposalId)
  }

  return {
    // Data
    proposals: filteredProposals,
    userVotes,
    stats,

    // Actions
    castVote,
    createProposal,

    // Status
    isLoading: loading && filteredProposals.length === 0,
    isLoadingUserVotes: userVotesLoading,
    isVoting,
    error: error && filteredProposals.length === 0 ? error : null,

    // Utils
    getProposalTypeString,
    getVotingTypeString,
    getStateString,
    isActive,
    getTimeRemaining,
    hasUserVoted,

    // Refetch
    refetch: () => {
      refetch()
      refetchCount()
    },
  }
}

// Individual proposal hook
export function useProposal(proposalId: string) {
  const { data, loading, error, refetch } = useQuery(GET_PROPOSAL_BY_ID, {
    variables: { id: proposalId },
    skip: !proposalId,
    pollInterval: 15000, // More frequent polling for individual proposals
    errorPolicy: 'ignore',
  })

  const proposal = data?.proposal ? {
    id: data.proposal.id,
    title: data.proposal.title,
    description: data.proposal.description,
    organization: data.proposal.organization,
    proposer: data.proposal.proposer,
    proposalType: data.proposal.proposalType,
    votingType: data.proposal.votingType,
    state: data.proposal.state,
    startTime: parseInt(data.proposal.startTime),
    endTime: parseInt(data.proposal.endTime),
    votesFor: parseInt(data.proposal.votesFor),
    votesAgainst: parseInt(data.proposal.votesAgainst),
    totalVotes: parseInt(data.proposal.totalVotes),
    quorum: parseInt(data.proposal.quorum),
    threshold: parseInt(data.proposal.threshold),
    executedAt: data.proposal.executedAt ? parseInt(data.proposal.executedAt) : null,
    executionSuccess: data.proposal.executionSuccess,
    createdAt: parseInt(data.proposal.createdAt),
    updatedAt: parseInt(data.proposal.updatedAt),
    votes: data.proposal.votes || [],
  } : null

  return {
    proposal,
    isLoading: loading,
    error,
    refetch,
  }
}
