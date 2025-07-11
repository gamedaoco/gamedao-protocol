'use client'

import { useQuery } from '@apollo/client'
import { GET_PROFILES } from '@/lib/queries'
import { useAccount } from 'wagmi'

export interface Profile {
  id: string
  organization: {
    id: string
    name: string
  }
  owner: {
    id: string
    address: string
  }
  username: string
  bio: string
  avatar: string
  website: string
  verificationLevel: number
  experience: number
  reputation: number
  trustScore: number
  convictionScore: number
  achievementCount: number
  feedbackCount: number
  positiveFeedbacks: number
  negativeFeedbacks: number
  createdAt: number
  updatedAt: number
}

export interface ReputationStats {
  totalProfiles: number
  totalExperience: number
  averageReputation: number
  totalAchievements: number
  topPerformers: Profile[]
  recentProfiles: Profile[]
}

export function useReputation() {
  const { address } = useAccount()

  // Fetch all profiles from subgraph
  const { data: profilesData, loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useQuery(GET_PROFILES, {
    variables: { first: 100, skip: 0 },
    pollInterval: 60000, // Less frequent polling for profiles
    errorPolicy: 'ignore',
  })

  // Transform profiles data
  const profiles: Profile[] = profilesData?.profiles?.map((profile: any) => ({
    id: profile.id,
    organization: profile.organization,
    owner: profile.owner,
    username: profile.username,
    bio: profile.bio,
    avatar: profile.avatar,
    website: profile.website,
    verificationLevel: parseInt(profile.verificationLevel),
    experience: parseInt(profile.experience),
    reputation: parseInt(profile.reputation),
    trustScore: parseInt(profile.trustScore),
    convictionScore: parseInt(profile.convictionScore),
    achievementCount: parseInt(profile.achievementCount),
    feedbackCount: parseInt(profile.feedbackCount),
    positiveFeedbacks: parseInt(profile.positiveFeedbacks),
    negativeFeedbacks: parseInt(profile.negativeFeedbacks),
    createdAt: parseInt(profile.createdAt),
    updatedAt: parseInt(profile.updatedAt),
  })) || []

  // Calculate reputation stats with default values
  const reputationStats: ReputationStats = {
    totalProfiles: profiles.length,
    totalExperience: profiles.reduce((sum, profile) => sum + profile.experience, 0),
    averageReputation: profiles.length > 0 ? profiles.reduce((sum, profile) => sum + profile.reputation, 0) / profiles.length : 0,
    totalAchievements: profiles.reduce((sum, profile) => sum + profile.achievementCount, 0),
    topPerformers: profiles
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, 10),
    recentProfiles: profiles
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10),
  }

  // Get current user's profile or return default
  const userProfile: Profile = address ?
    profiles.find(profile => profile.owner.address.toLowerCase() === address.toLowerCase()) || {
      id: '',
      organization: { id: '', name: '' },
      owner: { id: '', address: address },
      username: '',
      bio: '',
      avatar: '',
      website: '',
      verificationLevel: 0,
      experience: 0,
      reputation: 0,
      trustScore: 0,
      convictionScore: 0,
      achievementCount: 0,
      feedbackCount: 0,
      positiveFeedbacks: 0,
      negativeFeedbacks: 0,
      createdAt: 0,
      updatedAt: 0,
    } : {
      id: '',
      organization: { id: '', name: '' },
      owner: { id: '', address: '' },
      username: '',
      bio: '',
      avatar: '',
      website: '',
      verificationLevel: 0,
      experience: 0,
      reputation: 0,
      trustScore: 0,
      convictionScore: 0,
      achievementCount: 0,
      feedbackCount: 0,
      positiveFeedbacks: 0,
      negativeFeedbacks: 0,
      createdAt: 0,
      updatedAt: 0,
    }

  return {
    profiles,
    userProfile,
    reputationStats,
    isLoading: profilesLoading,
    error: profilesError,
    refetch: refetchProfiles,
  }
}
