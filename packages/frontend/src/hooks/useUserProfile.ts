'use client'

import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'
import { GET_USER_PROFILE, GET_ALL_USER_MEMBERSHIPS, GET_USER_ACTIVITY } from '@/lib/queries'
import { useMemo } from 'react'
import { useReputation } from './useReputation'

export interface UserProfile {
  address: string
  totalOrganizations: number
  totalContributions: number
  totalProposals: number
  totalVotes: number
  firstSeenAt: number
  lastActiveAt: number
  // Reputation data from Sense module
  reputation?: {
    experience: number
    reputation: number
    trustScore: number
    convictionScore: number
    achievementCount: number
    feedbackCount: number
    positiveFeedbacks: number
    negativeFeedbacks: number
    verificationLevel: string
    hasProfile: boolean
  }
  memberships: Array<{
    id: string
    organization: {
      id: string
      name: string
      state: string
    }
    role: string
    state: string
    joinedAt: number
  }>
}

export interface UserMembership {
  id: string
  organization: {
    id: string
    name: string
    creator: string
    memberCount: number
    state: string
    createdAt: number
  }
  role: string
  state: string
  joinedAt: number
}

export function useUserProfile(userAddress?: string) {
  const { address } = useAccount()
  const targetAddress = userAddress || address

  // Get reputation data for the user
  const { profiles, userProfile: reputationProfile, isLoading: reputationLoading } = useReputation()

  // Query user profile with aggregated stats (using new User entity)
  const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_USER_PROFILE, {
    variables: { address: targetAddress?.toLowerCase() },
    skip: !targetAddress,
    errorPolicy: 'all',
  })

  // Fallback query using current Member entities (for backward compatibility)
  const { data: membershipsData, loading: membershipsLoading, error: membershipsError } = useQuery(GET_ALL_USER_MEMBERSHIPS, {
    variables: { address: targetAddress },
    skip: !targetAddress || !!profileData?.user, // Skip if User entity exists
    errorPolicy: 'all',
  })

  const userProfile: UserProfile | null = useMemo(() => {
    // Get reputation data for the target address
    const targetReputationProfile = targetAddress ?
      profiles.find(p => p.owner.address.toLowerCase() === targetAddress.toLowerCase()) :
      reputationProfile

    const reputationData = targetReputationProfile ? {
      experience: targetReputationProfile.experience,
      reputation: targetReputationProfile.reputation,
      trustScore: targetReputationProfile.trustScore,
      convictionScore: targetReputationProfile.convictionScore,
      achievementCount: targetReputationProfile.achievementCount,
      feedbackCount: targetReputationProfile.feedbackCount,
      positiveFeedbacks: targetReputationProfile.positiveFeedbacks,
      negativeFeedbacks: targetReputationProfile.negativeFeedbacks,
      verificationLevel: targetReputationProfile.verificationLevel.toString(),
      hasProfile: !!targetReputationProfile.id
    } : undefined

    if (profileData?.user) {
      // Use new User entity data
      const user = profileData.user
      return {
        address: user.address,
        totalOrganizations: parseInt(user.totalOrganizations),
        totalContributions: parseInt(user.totalContributions),
        totalProposals: parseInt(user.totalProposals),
        totalVotes: parseInt(user.totalVotes),
        firstSeenAt: parseInt(user.firstSeenAt),
        lastActiveAt: parseInt(user.lastActiveAt),
        reputation: reputationData,
        memberships: user.memberships || []
      }
    } else if (membershipsData?.members) {
      // Fallback to aggregating from Member entities
      const members = membershipsData.members
      return {
        address: targetAddress || '',
        totalOrganizations: members.length,
        totalContributions: 0, // Would need separate query
        totalProposals: 0, // Would need separate query
        totalVotes: 0, // Would need separate query
        firstSeenAt: Math.min(...members.map((m: any) => parseInt(m.joinedAt))),
        lastActiveAt: Math.max(...members.map((m: any) => parseInt(m.joinedAt))),
        reputation: reputationData,
        memberships: members.map((member: any) => ({
          id: member.id,
          organization: member.organization,
          role: member.role,
          state: member.state,
          joinedAt: parseInt(member.joinedAt)
        }))
      }
    }
    return null
  }, [profileData, membershipsData, targetAddress, profiles, reputationProfile])

  const activeMemberships = useMemo(() => {
    return userProfile?.memberships.filter(m => m.state === 'ACTIVE') || []
  }, [userProfile])

  return {
    userProfile,
    activeMemberships,
    isLoading: profileLoading || membershipsLoading || reputationLoading,
    error: profileError || membershipsError,
    // Helper functions
    isCreator: (orgId: string) => {
      const membership = activeMemberships.find(m => m.organization.id === orgId)
      return membership?.role === 'PRIME'
    },
    isMemberOf: (orgId: string) => {
      return activeMemberships.some(m => m.organization.id === orgId)
    },
    getMembershipRole: (orgId: string) => {
      const membership = activeMemberships.find(m => m.organization.id === orgId)
      return membership?.role || null
    }
  }
}

export function useUserActivity(userAddress?: string) {
  const { address } = useAccount()
  const targetAddress = userAddress || address

  const { data, loading, error } = useQuery(GET_USER_ACTIVITY, {
    variables: { address: targetAddress?.toLowerCase() },
    skip: !targetAddress,
    errorPolicy: 'all',
  })

  const userActivity = useMemo(() => {
    if (!data?.user) return null

    const user = data.user
    return {
      memberships: user.memberships || [],
      contributions: user.contributions || [],
      proposals: user.proposals || [],
      votes: user.votes || []
    }
  }, [data])

  return {
    userActivity,
    isLoading: loading,
    error,
    // Computed stats
    stats: userActivity ? {
      activeOrganizations: userActivity.memberships.length,
      totalContributions: userActivity.contributions.length,
      totalProposals: userActivity.proposals.length,
      totalVotes: userActivity.votes.length,
      leadershipRoles: userActivity.memberships.filter((m: any) => m.role === 'PRIME').length
    } : null
  }
}
