import { useState, useEffect, useCallback } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { MEMBERSHIP_ABI } from '@/lib/abis'
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
  const { toast } = useToast()

  // Add member
  const { write: addMember, isLoading: isAddingMember } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'addMember',
    onSuccess: () => {
      toast({
        title: 'Member Added',
        description: 'Member has been successfully added to the organization.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Adding Member',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Remove member
  const { write: removeMember, isLoading: isRemovingMember } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'removeMember',
    onSuccess: () => {
      toast({
        title: 'Member Removed',
        description: 'Member has been successfully removed from the organization.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Removing Member',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update member state
  const { write: updateMemberState, isLoading: isUpdatingState } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'updateMemberState',
    onSuccess: () => {
      toast({
        title: 'Member State Updated',
        description: 'Member state has been successfully updated.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Updating Member State',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update member tier
  const { write: updateMemberTier, isLoading: isUpdatingTier } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'updateMemberTier',
    onSuccess: () => {
      toast({
        title: 'Member Tier Updated',
        description: 'Member tier has been successfully updated.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Updating Member Tier',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delegate voting power
  const { write: delegateVotingPower, isLoading: isDelegating } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'delegateVotingPower',
    onSuccess: () => {
      toast({
        title: 'Voting Power Delegated',
        description: 'Voting power has been successfully delegated.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Delegating Voting Power',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Undelegate voting power
  const { write: undelegateVotingPower, isLoading: isUndelegating } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'undelegateVotingPower',
    onSuccess: () => {
      toast({
        title: 'Voting Power Undelegated',
        description: 'Voting power has been successfully undelegated.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Undelegating Voting Power',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Reward reputation
  const { write: rewardReputation, isLoading: isRewardingReputation } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'rewardMemberReputation',
    onSuccess: () => {
      toast({
        title: 'Reputation Rewarded',
        description: 'Member reputation has been successfully rewarded.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Rewarding Reputation',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Slash reputation
  const { write: slashReputation, isLoading: isSlashingReputation } = useContractWrite({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'slashMemberReputation',
    onSuccess: () => {
      toast({
        title: 'Reputation Slashed',
        description: 'Member reputation has been successfully slashed.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error Slashing Reputation',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return {
    // Write functions
    addMember: (organizationId: string, member: string, profileId: string, tier: MembershipTier, membershipFee: bigint) =>
      addMember({
        args: [organizationId, member, profileId, tier, membershipFee],
      }),
    removeMember: (organizationId: string, member: string) =>
      removeMember({
        args: [organizationId, member],
      }),
    updateMemberState: (organizationId: string, member: string, state: MemberState) =>
      updateMemberState({
        args: [organizationId, member, state],
      }),
    updateMemberTier: (organizationId: string, member: string, tier: MembershipTier) =>
      updateMemberTier({
        args: [organizationId, member, tier],
      }),
    delegateVotingPower: (organizationId: string, delegatee: string, amount: bigint) =>
      delegateVotingPower({
        args: [organizationId, delegatee, amount],
      }),
    undelegateVotingPower: (organizationId: string, delegatee: string, amount: bigint) =>
      undelegateVotingPower({
        args: [organizationId, delegatee, amount],
      }),
    rewardReputation: (organizationId: string, member: string, amount: bigint, reason: string) =>
      rewardReputation({
        args: [organizationId, member, amount, reason],
      }),
    slashReputation: (organizationId: string, member: string, amount: bigint, reason: string) =>
      slashReputation({
        args: [organizationId, member, amount, reason],
      }),

    // Loading states
    isAddingMember,
    isRemovingMember,
    isUpdatingState,
    isUpdatingTier,
    isDelegating,
    isUndelegating,
    isRewardingReputation,
    isSlashingReputation,
  }
}

/**
 * Hook for membership queries
 */
export function useMembershipQueries(organizationId?: string) {
  const { address } = useAccount()
  const contracts = useContracts()

  // Get member data
  const { data: memberData, isLoading: isMemberLoading, refetch: refetchMember } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMember',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Check if user is a member
  const { data: isMember, isLoading: isMembershipLoading, refetch: refetchMembership } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'isMember',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Check if user is an active member
  const { data: isActiveMember, isLoading: isActiveMemberLoading, refetch: refetchActiveMember } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'isActiveMember',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Get member count
  const { data: memberCount, isLoading: isMemberCountLoading, refetch: refetchMemberCount } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMemberCount',
    args: [organizationId],
    enabled: !!organizationId,
  })

  // Get all members
  const { data: members, isLoading: isMembersLoading, refetch: refetchMembers } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMembers',
    args: [organizationId],
    enabled: !!organizationId,
  })

  // Get active members
  const { data: activeMembers, isLoading: isActiveMembersLoading, refetch: refetchActiveMembers } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getActiveMembers',
    args: [organizationId],
    enabled: !!organizationId,
  })

  // Get membership stats
  const { data: membershipStats, isLoading: isStatsLoading, refetch: refetchStats } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMembershipStats',
    args: [organizationId],
    enabled: !!organizationId,
  })

  // Get voting power
  const { data: votingPower, isLoading: isVotingPowerLoading, refetch: refetchVotingPower } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPower',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Get voting power with delegation
  const { data: votingPowerWithDelegation, isLoading: isVotingPowerWithDelegationLoading, refetch: refetchVotingPowerWithDelegation } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPowerWithDelegation',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Get delegations
  const { data: delegations, isLoading: isDelegationsLoading, refetch: refetchDelegations } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getDelegations',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Check if user can vote
  const { data: canVote, isLoading: isCanVoteLoading, refetch: refetchCanVote } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'canVote',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

  // Check if user can propose
  const { data: canPropose, isLoading: isCanProposeLoading, refetch: refetchCanPropose } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'canPropose',
    args: [organizationId, address],
    enabled: !!organizationId && !!address,
  })

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
    functionName: 'isMemberBatch',
    args: [[], address], // organizationIds array will be passed when calling
    enabled: false, // Will be enabled when organizationIds are provided
  })

  // Get member counts for multiple organizations
  const { data: batchMemberCounts, isLoading: isBatchMemberCountsLoading } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getMemberCountBatch',
    args: [[]], // organizationIds array will be passed when calling
    enabled: false, // Will be enabled when organizationIds are provided
  })

  // Get voting power for multiple organizations
  const { data: batchVotingPower, isLoading: isBatchVotingPowerLoading } = useContractRead({
    address: contracts.membership,
    abi: MEMBERSHIP_ABI,
    functionName: 'getVotingPowerBatch',
    args: [[], address], // organizationIds array will be passed when calling
    enabled: false, // Will be enabled when organizationIds are provided
  })

  return {
    batchMembership: batchMembership as boolean[] | undefined,
    batchMemberCounts: batchMemberCounts as bigint[] | undefined,
    batchVotingPower: batchVotingPower as bigint[] | undefined,
    isBatchMembershipLoading,
    isBatchMemberCountsLoading,
    isBatchVotingPowerLoading,
  }
}
