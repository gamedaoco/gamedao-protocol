import { useState, useEffect, useCallback } from 'react'
import { useAccount, useContractRead, useWriteContract } from 'wagmi'
import { MEMBERSHIP_ABI } from '@/lib/abis'
import { toContractId } from '@/lib/id-utils'
import { useContracts } from '@/hooks/useContracts'
import { useToast } from '@/hooks/useToast'
import { formatUnits, parseUnits } from 'viem'

// Types matching the contract
export enum MemberState {
  Inactive = 0,
  Active = 1,
  Paused = 2,
  Kicked = 3,
  Banned = 4
}

export enum MembershipTier {
  Basic = 0,
  Premium = 1,
  VIP = 2,
  Founder = 3
}

export interface Member {
  account: string
  profileId: string
  state: MemberState
  tier: MembershipTier
  joinedAt: bigint
  lastActiveAt: bigint
  reputation: bigint
  votingPower: bigint
  delegatedPower: bigint
  canVote: boolean
  canPropose: boolean
  membershipFee: bigint
  metadata: string
}

export interface MembershipStats {
  totalMembers: bigint
  activeMembers: bigint
  totalVotingPower: bigint
  averageReputation: bigint
  lastUpdated: bigint
}

export interface VotingDelegation {
  delegator: string
  delegatee: string
  amount: bigint
  timestamp: bigint
  active: boolean
}

/**
 * Hook for membership operations
 */
export function useMembership() {
  const { address } = useAccount()
  const contracts = useContracts()
  const toast = useToast()

  const { writeContract } = useWriteContract()

  return {
    // Write functions
    addMember: (organizationId: string, member: string, profileId: string, tier: MembershipTier, membershipFee: bigint) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'addMember', args: [toContractId(organizationId), member as `0x${string}`, toContractId(profileId), tier as number, membershipFee] as any }),
    removeMember: (organizationId: string, member: string) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'removeMember', args: [toContractId(organizationId), member as `0x${string}`] as any }),
    updateMemberState: (organizationId: string, member: string, state: MemberState) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'updateMemberState', args: [toContractId(organizationId), member as `0x${string}`, state as number] as any }),
    updateMemberTier: (organizationId: string, member: string, tier: MembershipTier) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'updateMemberTier', args: [toContractId(organizationId), member as `0x${string}`, tier as number] as any }),
    delegateVotingPower: (organizationId: string, delegatee: string, amount: bigint) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'delegateVotingPower', args: [toContractId(organizationId), delegatee as `0x${string}`, amount] as any }),
    undelegateVotingPower: (organizationId: string, delegatee: string, amount: bigint) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'undelegateVotingPower', args: [toContractId(organizationId), delegatee as `0x${string}`, amount] as any }),
    rewardReputation: (organizationId: string, member: string, amount: bigint, reason: string) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'updateVotingPower' as any, args: [toContractId(organizationId), member as `0x${string}`, amount, reason] as any }),
    slashReputation: (organizationId: string, member: string, amount: bigint, reason: string) =>
      writeContract({ address: contracts.membership as `0x${string}`, abi: MEMBERSHIP_ABI, functionName: 'updateVotingPower' as any, args: [toContractId(organizationId), member as `0x${string}`, amount, reason] as any }),

    // Loading states (not tracked here with writeContract)
    isAddingMember: false,
    isRemovingMember: false,
    isUpdatingState: false,
    isUpdatingTier: false,
    isDelegating: false,
    isUndelegating: false,
    isRewardingReputation: false,
    isSlashingReputation: false,
  }
}

/**
 * Hook for membership queries
 */
export function useMembershipQueries(organizationId?: string) {
  const { address } = useAccount()
  const contracts = useContracts()
  const orgId = organizationId as `0x${string}` | undefined
  const addr = address as `0x${string}` | undefined

  const { data: memberData, isLoading: isMemberLoading, refetch: refetchMember } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMember',
    args: [orgId!, addr!],
    query: { enabled: !!orgId && !!addr },
  } as any)

  const { data: isMember, isLoading: isMembershipLoading, refetch: refetchMembership } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'isMember',
    args: [orgId!, addr!],
    query: { enabled: !!orgId && !!addr },
  } as any)

  const { data: isActiveMember, isLoading: isActiveMemberLoading, refetch: refetchActiveMember } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'isActiveMember',
    args: [orgId!, addr!],
    query: { enabled: !!orgId && !!addr },
  } as any)

  const { data: memberCount, isLoading: isMemberCountLoading, refetch: refetchMemberCount } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMemberCount',
    args: [orgId!],
    query: { enabled: !!orgId },
  } as any)

  const { data: members, isLoading: isMembersLoading, refetch: refetchMembers } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMembers',
    args: [orgId!],
    query: { enabled: !!orgId },
  } as any)

  const { data: activeMembers, isLoading: isActiveMembersLoading, refetch: refetchActiveMembers } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getActiveMembers',
    args: [orgId!],
    query: { enabled: !!orgId },
  } as any)

  const { data: membershipStats, isLoading: isStatsLoading, refetch: refetchStats } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMembershipStats',
    args: [orgId!],
    query: { enabled: !!orgId },
  } as any)

  // Get voting power
  const { data: votingPower, isLoading: isVotingPowerLoading, refetch: refetchVotingPower } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPower',
    args: [organizationId as `0x${string}`, address as `0x${string}`],
    enabled: !!organizationId && !!address,
  } as any)

  // Get voting power with delegation
  const { data: votingPowerWithDelegation, isLoading: isVotingPowerWithDelegationLoading, refetch: refetchVotingPowerWithDelegation } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPowerWithDelegation',
    args: [organizationId as `0x${string}`, address as `0x${string}`],
    enabled: !!organizationId && !!address,
  } as any)

  // Get delegations
  const { data: delegations, isLoading: isDelegationsLoading, refetch: refetchDelegations } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getDelegations',
    args: [organizationId as `0x${string}`, address as `0x${string}`],
    enabled: !!organizationId && !!address,
  } as any)

  // Check if user can vote
  const { data: canVote, isLoading: isCanVoteLoading, refetch: refetchCanVote } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'canVote',
    args: [organizationId as `0x${string}`, address as `0x${string}`],
    enabled: !!organizationId && !!address,
  } as any)

  // Check if user can propose (uses canVote as proxy -- canPropose not in ABI)
  const { data: canPropose, isLoading: isCanProposeLoading, refetch: refetchCanPropose } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'canVote',
    args: [organizationId as `0x${string}`, address as `0x${string}`],
    query: { enabled: !!organizationId && !!address },
  } as any)

  // Helper function to get member tier name
  const getMemberTierName = useCallback((tier: MembershipTier) => {
    switch (tier) {
      case MembershipTier.Basic:
        return 'Basic'
      case MembershipTier.Premium:
        return 'Premium'
      case MembershipTier.VIP:
        return 'VIP'
      case MembershipTier.Founder:
        return 'Founder'
      default:
        return 'Unknown'
    }
  }, [])

  // Helper function to get member state name
  const getMemberStateName = useCallback((state: MemberState) => {
    switch (state) {
      case MemberState.Inactive:
        return 'Inactive'
      case MemberState.Active:
        return 'Active'
      case MemberState.Paused:
        return 'Paused'
      case MemberState.Kicked:
        return 'Kicked'
      case MemberState.Banned:
        return 'Banned'
      default:
        return 'Unknown'
    }
  }, [])

  // Helper function to format reputation
  const formatReputation = useCallback((reputation: bigint) => {
    return Number(reputation) / 1000 // Reputation is scaled by 1000
  }, [])

  // Helper function to format voting power
  const formatVotingPower = useCallback((power: bigint) => {
    return Number(power) / 1000 // Voting power is scaled by 1000
  }, [])

  return {
    // Data
    memberData: memberData as Member | undefined,
    isMember: isMember as boolean | undefined,
    isActiveMember: isActiveMember as boolean | undefined,
    memberCount: memberCount as bigint | undefined,
    members: members as string[] | undefined,
    activeMembers: activeMembers as string[] | undefined,
    membershipStats: membershipStats as MembershipStats | undefined,
    votingPower: votingPower as bigint | undefined,
    votingPowerWithDelegation: votingPowerWithDelegation as bigint | undefined,
    delegations: delegations as VotingDelegation[] | undefined,
    canVote: canVote as boolean | undefined,
    canPropose: canPropose as boolean | undefined,

    // Loading states
    isLoading: isMemberLoading || isMembershipLoading || isActiveMemberLoading || isMemberCountLoading || isMembersLoading || isActiveMembersLoading || isStatsLoading || isVotingPowerLoading || isVotingPowerWithDelegationLoading || isDelegationsLoading || isCanVoteLoading || isCanProposeLoading,
    isMemberLoading,
    isMembershipLoading,
    isActiveMemberLoading,
    isMemberCountLoading,
    isMembersLoading,
    isActiveMembersLoading,
    isStatsLoading,
    isVotingPowerLoading,
    isVotingPowerWithDelegationLoading,
    isDelegationsLoading,
    isCanVoteLoading,
    isCanProposeLoading,

    // Refetch functions
    refetchMember,
    refetchMembership,
    refetchActiveMember,
    refetchMemberCount,
    refetchMembers,
    refetchActiveMembers,
    refetchStats,
    refetchVotingPower,
    refetchVotingPowerWithDelegation,
    refetchDelegations,
    refetchCanVote,
    refetchCanPropose,

    // Helper functions
    getMemberTierName,
    getMemberStateName,
    formatReputation,
    formatVotingPower,
  }
}

/**
 * Hook for batch membership operations
 */
export function useBatchMembership() {
  const { address } = useAccount()
  const contracts = useContracts()

  // Check membership in multiple organizations
  const { data: batchMembership, isLoading: isBatchMembershipLoading } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'isMember',
    args: [('0x0000000000000000' as `0x${string}`), address as `0x${string}`],
    query: { enabled: false },
  } as any)

  // Get member counts for multiple organizations
  const { data: batchMemberCounts, isLoading: isBatchMemberCountsLoading } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMemberCount',
    args: [('0x0000000000000000' as `0x${string}`)],
    query: { enabled: false },
  } as any)

  // Get voting power for multiple organizations
  const { data: batchVotingPower, isLoading: isBatchVotingPowerLoading } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPower',
    args: [('0x0000000000000000' as `0x${string}`), address as `0x${string}`],
    query: { enabled: false },
  } as any)

  return {
    batchMembership: batchMembership as boolean[] | undefined,
    batchMemberCounts: batchMemberCounts as bigint[] | undefined,
    batchVotingPower: batchVotingPower as bigint[] | undefined,
    isBatchMembershipLoading,
    isBatchMemberCountsLoading,
    isBatchVotingPowerLoading,
  }
}
