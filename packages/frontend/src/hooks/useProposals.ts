'use client'

import { useQuery } from '@apollo/client'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_PROPOSALS, GET_PROPOSAL_BY_ID, GET_USER_VOTES } from '@/lib/queries'
import { useMemo, useEffect, useState } from 'react'
import { useTokenApproval } from './useTokenApproval'
import { toContractId } from '@/lib/id-utils'
import { useToast } from './useToast'
import { useNonce } from './useNonce'
import { useSmartTx } from './useSmartTx'
import type { Hash } from 'viem'


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
  const { getNextNonce } = useNonce()

  // Wait for create transaction confirmation
  const {
    isLoading: isCreateConfirming,
    isSuccess: createSuccess,
    error: createConfirmError,
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  // Contract write for voting (EOA fallback path).
  const {
    writeContract: writeVote,
    isPending: isVotePending,
    data: voteTxHash,
    error: voteError,
    reset: resetVote
  } = useWriteContract()

  // Smart-account path. When the Privy smart wallet is provisioned, the
  // vote tx is sent via the bundler (paymaster-sponsored, gas-free for
  // the user). The returned hash lives in local state and feeds the same
  // useWaitForTransactionReceipt downstream — receipt waiting works
  // identically for both code paths.
  const smartTx = useSmartTx()
  const [smartVoteHash, setSmartVoteHash] = useState<Hash | undefined>(undefined)
  const [isSmartVoteSubmitting, setIsSmartVoteSubmitting] = useState(false)
  const [smartVoteError, setSmartVoteError] = useState<Error | undefined>(undefined)

  // Wait for vote transaction confirmation. Smart-tx hash takes precedence
  // when the smart-account path was used; otherwise we wait on the wagmi
  // EOA hash.
  const activeVoteHash = smartVoteHash ?? voteTxHash
  const {
    isLoading: isVoteConfirming,
    isSuccess: voteSuccess,
    error: voteConfirmError,
  } = useWaitForTransactionReceipt({
    hash: activeVoteHash,
  })

  const resetVoteState = () => {
    resetVote()
    setSmartVoteHash(undefined)
    setSmartVoteError(undefined)
    setIsSmartVoteSubmitting(false)
  }

  // Auto-reset voting state after timeout to prevent UI locking. The
  // pending check now spans both EOA (`isVotePending`) and smart-account
  // (`isSmartVoteSubmitting`) paths.
  useEffect(() => {
    if (isVotePending || isSmartVoteSubmitting || isVoteConfirming) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Vote transaction timeout - resetting state to unlock UI')
        resetVoteState()
      }, 60000) // 60 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isVotePending, isSmartVoteSubmitting, isVoteConfirming, resetVote])

  // Fetch proposals from subgraph (declare before effects that use `refetch`)
  const { data, loading, error, refetch } = useQuery(GET_PROPOSALS, {
    variables: { first: 100, skip: 0 },
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Auto-refetch data after successful vote
  useEffect(() => {
    if (voteSuccess) {
      refetch()
      setTimeout(() => refetch(), 3000) // Refetch again after 3 seconds for subgraph indexing
    }
  }, [voteSuccess, refetch])

  // Add token approval hook for GAME token deposits
  const {
    handleApproval: handleTokenApproval,
    isApproving: isTokenApproving,
    isApprovalConfirming: isTokenApprovalConfirming,
    approvalSuccess: tokenApprovalSuccess,
    approvalError: tokenApprovalError
  } = useTokenApproval()

  // Fetch user's votes from subgraph
  const { data: userVotesData, loading: userVotesLoading } = useQuery(GET_USER_VOTES, {
    variables: { user: address, first: 50 },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Handle vote success
  useEffect(() => {
    if (voteSuccess) {
      toast.success('Vote cast successfully!')
      refetch()
      resetVoteState()
    }
  }, [voteSuccess, refetch])

  // Handle vote error — surface either the wagmi-side or the smart-tx-side
  // failure to the user.
  useEffect(() => {
    if (voteError || smartVoteError) {
      toast.error('Failed to cast vote. Please try again.')
    }
  }, [voteError, smartVoteError])

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

  const proposalCount = proposals.length
  const refetchCount = refetch

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

  // Cast vote with hierarchical IDs. Routes through the Privy smart
  // account (sponsored by the paymaster configured in Privy dashboard)
  // when one is provisioned; falls back to the EOA via wagmi otherwise,
  // so the flow keeps working pre-sign-in or for power users on
  // injected wallets.
  const castVote = async (proposalId: string, choice: 0 | 1 | 2, reason?: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }
    if (!contracts.SIGNAL || contracts.SIGNAL === '0x0000000000000000000000000000000000000000') {
      throw new Error('Signal contract not deployed on this network. Switch to a supported chain (chainId 31337 / 80002 / 137).')
    }

    try {
      resetVoteState()

      if (smartTx.ready) {
        setIsSmartVoteSubmitting(true)
        const hash = await smartTx.writeContract({
          address: contracts.SIGNAL,
          abi: ABIS.SIGNAL,
          functionName: 'castVote',
          args: [proposalId, choice, reason || ''],
        })
        setSmartVoteHash(hash)
        setIsSmartVoteSubmitting(false)
        return
      }

      // EOA fallback. Use the manual nonce — wagmi can race when several
      // writes interleave, and the Signal module has had reverts when
      // the nonce is wrong.
      const nonce = await getNextNonce().catch(() => undefined)
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'castVote',
        args: [proposalId, choice, reason || ''],
        nonce: nonce as any,
      })

    } catch (error) {
      console.error('❌ Error casting vote:', error)
      setSmartVoteError(error instanceof Error ? error : new Error(String(error)))
      resetVoteState()
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
      // Handle GAME token approval for proposal deposits if needed
      if (proposalData.gameDeposit && parseFloat(proposalData.gameDeposit) > 0) {
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

      // Proceed with proposal creation. Smart-account path is preferred
      // — gas sponsored by the bundler/paymaster (per the new "every tx
      // is gas-free; fees captured via in-token protocol fee" model).
      // EOA fallback covers pre-sign-in / power-user wagmi connectors.
      const args = [
        toContractId(proposalData.organizationId),
        proposalData.title,
        proposalData.description,
        '',
        proposalData.proposalType,
        proposalData.votingType,
        1,
        BigInt(proposalData.votingPeriod),
        '0x' as `0x${string}`,
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
      ] as const

      if (smartTx.ready) {
        await smartTx.writeContract({
          address: contracts.SIGNAL,
          abi: ABIS.SIGNAL,
          functionName: 'createProposal',
          args,
        })
      } else {
        const nonce = await getNextNonce().catch(() => undefined)
        await writeCreateProposal({
          address: contracts.SIGNAL,
          abi: ABIS.SIGNAL,
          functionName: 'createProposal',
          args,
          nonce: nonce as any,
        })
      }

      refetch()
      refetchCount()
    } catch (error) {
      console.error('Error creating proposal:', error)
      throw error
    }
  }

  // V2 function with hierarchical IDs (delegates to createProposal)
  const createProposalV2 = async (proposalData: {
    organizationId: string
    title: string
    description: string
    proposalType: number
    votingType: number
    votingPeriod: number
    gameDeposit?: string
  }) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    try {
      if (proposalData.gameDeposit && parseFloat(proposalData.gameDeposit) > 0) {
        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.SIGNAL as `0x${string}`,
          amount: proposalData.gameDeposit,
          purpose: 'proposal creation'
        })

        if (!approvalNeeded) {
          return
        }
      }

      // Same smart-tx-preferred / EOA-fallback pattern as createProposal.
      const args = [
        toContractId(proposalData.organizationId),
        proposalData.title,
        proposalData.description,
        '',
        proposalData.proposalType,
        proposalData.votingType,
        1,
        BigInt(proposalData.votingPeriod),
        '0x' as `0x${string}`,
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
      ] as const

      if (smartTx.ready) {
        await smartTx.writeContract({
          address: contracts.SIGNAL,
          abi: ABIS.SIGNAL,
          functionName: 'createProposal',
          args,
        })
      } else {
        const nonce2 = await getNextNonce().catch(() => undefined)
        await writeCreateProposal({
          address: contracts.SIGNAL,
          abi: ABIS.SIGNAL,
          functionName: 'createProposal',
          args,
          nonce: nonce2 as any,
        })
      }

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
    functionName: 'getVotingPowerWithDelegation',
    args: proposals.length > 0 ? [proposals[0].id.startsWith('0x') ? proposals[0].id as `0x${string}` : `0x${proposals[0].id}` as `0x${string}`, address as `0x${string}`, 0] : undefined,
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
    if (!contracts.SIGNAL || contracts.SIGNAL === '0x0000000000000000000000000000000000000000') {
      throw new Error('Signal contract not deployed on this network. Switch to a supported chain (chainId 31337 / 80002 / 137).')
    }

    try {
      const nonce = await getNextNonce().catch(() => undefined)
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'castVoteWithConviction',
        args: [
          proposalId, // Use hierarchical ID directly
          choice,
          BigInt(convictionTime),
          reason || ''
        ],
        nonce: nonce as any,
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
      const nonce = await getNextNonce().catch(() => undefined)
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'delegateVotingPower',
        args: [delegatee as `0x${string}`, BigInt(amount)],
        nonce: nonce as any,
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
      const nonce = await getNextNonce().catch(() => undefined)
      await writeVote({
        address: contracts.SIGNAL,
        abi: ABIS.SIGNAL,
        functionName: 'undelegateVotingPower',
        args: [delegatee as `0x${string}`, BigInt(amount)],
        nonce: nonce as any,
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
    isVoting: isVotePending || isSmartVoteSubmitting || isVoteConfirming,
    voteSuccess,
    voteError: voteError || voteConfirmError || smartVoteError,
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
