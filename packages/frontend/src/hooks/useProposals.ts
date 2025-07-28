'use client'

import { useQuery } from '@apollo/client'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_PROPOSALS, GET_PROPOSAL_BY_ID, GET_USER_VOTES } from '@/lib/queries'
import { useMemo, useEffect } from 'react'
import { useTokenApproval } from './useTokenApproval'
import { toContractId } from '@/lib/id-utils'
import { useToast } from './useToast'


export interface Proposal {
  id: string // Now hierarchical ID like "GAMEDAO-P-PROP001"
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
  votesAbstain: number
  totalVotes: number
  quorum?: number
  threshold?: number
  createdAt: number
  updatedAt: number
  // New fields for enhanced voting
  convictionSupported: boolean
  delegationSupported: boolean
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
  // Remove unused setIsVoting state - we use contract state instead
  const toast = useToast()

  // Contract write for creating proposals
  const {
    writeContract: writeCreateProposal,
    isPending: isCreating,
    data: createTxHash,
    error: createError,
    reset: resetCreate
  } = useWriteContract()

  // Wait for create transaction confirmation
  const {
    isLoading: isCreateConfirming,
    isSuccess: createSuccess,
    error: createConfirmError,
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  // Contract write for voting
  const {
    writeContract: writeVote,
    isPending: isVotePending,
    data: voteTxHash,
    error: voteError,
    reset: resetVote
  } = useWriteContract()

  // Wait for vote transaction confirmation
  const {
    isLoading: isVoteConfirming,
    isSuccess: voteSuccess,
    error: voteConfirmError,
  } = useWaitForTransactionReceipt({
    hash: voteTxHash,
  })

  // Add token approval hook for GAME token deposits
  const {
    handleApproval: handleTokenApproval,
    isApproving: isTokenApproving,
    isApprovalConfirming: isTokenApprovalConfirming,
    approvalSuccess: tokenApprovalSuccess,
    approvalError: tokenApprovalError
  } = useTokenApproval()

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

  // Get total proposal count
  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: contracts.SIGNAL,
    abi: ABIS.SIGNAL,
    functionName: 'getProposalCount',
    query: { enabled: isConnected },
  })

  // Handle vote success
  useEffect(() => {
    if (voteSuccess) {
      toast.success('Vote cast successfully!')
      refetch()
      refetchCount()
      resetVote()
    }
  }, [voteSuccess, refetch, refetchCount, resetVote])

  // Handle vote error
  useEffect(() => {
    if (voteError) {
      toast.error('Failed to cast vote. Please try again.')
    }
  }, [voteError])

  // Transform subgraph data to match our interface
  const proposals: Proposal[] = data?.proposals?.map((prop: any) => ({
    id: prop.id,
    title: prop.title || `Proposal ${prop.id.slice(0, 8)}`,
    description: prop.description || `Governance proposal for ${prop.organization.name}`,
    organization: {
      id: prop.organization.id,
      name: prop.organization.name,
    },
    proposer: {
      id: prop.creator.id,
      address: prop.creator.address,
    },
    proposalType: prop.proposalType || 'SIMPLE',
    votingType: prop.votingType || 'SIMPLE',
    state: prop.state || 'PENDING',
    startTime: parseInt(prop.startTime) || 0,
    endTime: parseInt(prop.endTime) || 0,
    votesFor: parseInt(prop.forVotes) || 0,
    votesAgainst: parseInt(prop.againstVotes) || 0,
    votesAbstain: parseInt(prop.abstainVotes) || 0,
    totalVotes: parseInt(prop.totalVotes) || 0,
    createdAt: parseInt(prop.createdAt) || Math.floor(Date.now() / 1000),
    updatedAt: parseInt(prop.updatedAt) || Math.floor(Date.now() / 1000),
    convictionSupported: prop.convictionSupported || true, // New contracts support conviction voting
    delegationSupported: prop.delegationSupported || true, // New contracts support delegation
  })) || []

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

    // Cast vote function with hierarchical IDs
  const castVote = async (proposalId: string, choice: 0 | 1 | 2, reason?: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      // Use hierarchical ID directly (no conversion needed)
      await writeVote({
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
    gameDeposit?: string // GAME token deposit for proposal creation
  }) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('🔍 Creating proposal with GAME token approval:', {
        organizationId: proposalData.organizationId,
        title: proposalData.title,
        gameDeposit: proposalData.gameDeposit
      })

      // Handle GAME token approval for proposal deposits if needed
      if (proposalData.gameDeposit && parseFloat(proposalData.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required for proposal:', proposalData.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.SIGNAL,
          amount: proposalData.gameDeposit,
          purpose: 'proposal creation'
        })

        if (!approvalNeeded) {
          // Approval is pending, proposal creation will be handled after approval
          return
        }
      }

      // Proceed with proposal creation
      await writeCreateProposal({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'createProposal',
        args: [
          toContractId(proposalData.organizationId), // Convert to bytes8 format
          proposalData.title,
          proposalData.description,
          '', // metadataURI
          proposalData.proposalType,
          proposalData.votingType,
          1, // votingPower (TokenWeighted)
          proposalData.votingPeriod,
          '0x', // executionData
          '0x0000000000000000000000000000000000000000', // targetContract
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

  // New V2 function with hierarchical IDs
  const createProposalV2 = async (proposalData: {
    organizationId: string
    title: string
    description: string
    proposalType: number
    votingType: number
    votingPeriod: number
    gameDeposit?: string // GAME token deposit for proposal creation
  }) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('🔍 Creating proposal V2 with hierarchical ID:', {
        organizationId: proposalData.organizationId,
        title: proposalData.title,
        gameDeposit: proposalData.gameDeposit
      })

      // Handle GAME token approval for proposal deposits if needed
      if (proposalData.gameDeposit && parseFloat(proposalData.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required for proposal:', proposalData.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.SIGNAL,
          amount: proposalData.gameDeposit,
          purpose: 'proposal creation'
        })

        if (!approvalNeeded) {
          // Approval is pending, proposal creation will be handled after approval
          return
        }
      }

      // Proceed with proposal creation using V2 function
      await writeCreateProposal({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'createProposalV2',
        args: [
          toContractId(proposalData.organizationId), // Convert to bytes8 format
          proposalData.title,
          proposalData.description,
          '', // metadataURI
          proposalData.proposalType,
          proposalData.votingType,
          1, // votingPower (TokenWeighted)
          proposalData.votingPeriod,
          '0x', // executionData
          '0x0000000000000000000000000000000000000000', // targetContract
        ],
      })

      // Refetch data after creation
      refetch()
      refetchCount()
    } catch (error) {
      console.error('Error creating proposal V2:', error)
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

  // Check if user can vote on a proposal
  const canUserVote = (proposalId: string): boolean => {
    if (!isConnected || !address) return false

    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) return false

    // Check if proposal is active
    if (!isActive(proposal)) return false

    // Check if user has already voted
    if (hasUserVoted(proposalId)) return false

    return true
  }

  // Get voting power for current user on a proposal
  const { data: userVotingPower, refetch: refetchVotingPower } = useReadContract({
    address: contracts.SIGNAL,
    abi: ABIS.SIGNAL,
    functionName: 'getVotingPower',
    args: proposals.length > 0 ? [proposals[0].id.startsWith('0x') ? proposals[0].id as `0x${string}` : `0x${proposals[0].id}` as `0x${string}`, address] : undefined,
    query: { enabled: isConnected && address && proposals.length > 0 },
  })

      // Get voting power for a specific proposal
  const getVotingPowerForProposal = async (_proposalId: string): Promise<number> => {
    if (!isConnected || !address) return 0

    try {
      // For now, return 1 as default voting power (democratic voting)
      // TODO: Implement proper voting power calculation based on proposal type
      return 1
    } catch (error) {
      console.error('Error getting voting power:', error)
      return 0
    }
  }

  // Conviction voting function
  const castVoteWithConviction = async (proposalId: string, choice: 0 | 1 | 2, convictionTime: number, reason?: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      console.log('🔍 Casting conviction vote:', {
        proposalId,
        choice,
        convictionTime,
        reason
      })

      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'castVoteWithConviction',
        args: [
          proposalId, // Use hierarchical ID directly
          choice,
          convictionTime,
          reason || ''
        ],
      })

      // Refetch data after voting
      refetch()
      refetchCount()
    } catch (error) {
      console.error('Error casting conviction vote:', error)
      throw error
    }
  }

  // Delegation functions
  const delegateVotingPower = async (delegatee: string, amount: number) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'delegateVotingPower',
        args: [delegatee, BigInt(amount)],
      })
    } catch (error) {
      console.error('Error delegating voting power:', error)
      throw error
    }
  }

  const undelegateVotingPower = async (delegatee: string, amount: number) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'undelegateVotingPower',
        args: [delegatee, BigInt(amount)],
      })
    } catch (error) {
      console.error('Error undelegating voting power:', error)
      throw error
    }
  }

  return {
    // Data
    proposals: filteredProposals,
    userVotes,
    stats,

    // Actions
    castVote,
    castVoteWithConviction, // Conviction voting function
    createProposal,
    createProposalV2, // New V2 function with hierarchical IDs
    delegateVotingPower, // Delegation functions
    undelegateVotingPower,

    // Status
    isLoading: loading && filteredProposals.length === 0,
    isLoadingUserVotes: userVotesLoading,
    isVoting: isVotePending || isVoteConfirming,
    voteSuccess,
    voteError: voteError || voteConfirmError,
    isCreatingProposal: isCreating || isCreateConfirming || isTokenApproving || isTokenApprovalConfirming,
    createSuccess,
    createError: createError || createConfirmError,
    error: error && filteredProposals.length === 0 ? error : tokenApprovalError,

    // Utils
    getProposalTypeString,
    getVotingTypeString,
    getStateString,
    isActive,
    getTimeRemaining,
    hasUserVoted,
    canUserVote,
    getVotingPowerForProposal,
    userVotingPower: Number(userVotingPower || 0),

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

  // Always return a defined proposal object with default values
  const proposal: Proposal = data?.proposal ? {
    id: data.proposal.id,
    title: data.proposal.title,
    description: data.proposal.description,
    organization: data.proposal.organization,
    proposer: {
      id: data.proposal.creator.id,
      address: data.proposal.creator.address,
    },
    proposalType: data.proposal.proposalType,
    votingType: data.proposal.votingType,
    state: data.proposal.state,
    startTime: parseInt(data.proposal.startTime),
    endTime: parseInt(data.proposal.endTime),
    votesFor: parseInt(data.proposal.forVotes),
    votesAgainst: parseInt(data.proposal.againstVotes),
    votesAbstain: parseInt(data.proposal.abstainVotes) || 0,
    totalVotes: parseInt(data.proposal.totalVotes),
    quorum: parseInt(data.proposal.quorum),
    threshold: parseInt(data.proposal.threshold),
    createdAt: parseInt(data.proposal.createdAt),
    updatedAt: parseInt(data.proposal.updatedAt),
    convictionSupported: true, // New contracts support conviction voting
    delegationSupported: true, // New contracts support delegation
  } : {
    id: proposalId || '',
    title: '',
    description: '',
    organization: { id: '', name: '' },
    proposer: { id: '', address: '' },
    proposalType: 'SIMPLE',
    votingType: 'SIMPLE',
    state: 'PENDING',
    startTime: 0,
    endTime: 0,
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    totalVotes: 0,
    createdAt: 0,
    updatedAt: 0,
    convictionSupported: true,
    delegationSupported: true,
  }

  return {
    proposal,
    isLoading: loading,
    error,
    refetch,
  }
}
