'use client'

import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'
import { GET_PROFILES, GET_PROFILE_BY_ID } from '@/lib/queries'
import { useState, useEffect } from 'react'

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
  achievements?: Achievement[]
  feedbacksReceived?: Feedback[]
}

export interface Achievement {
  id: string
  achievementId: string
  title: string
  description: string
  category: string
  points: number
  timestamp: number
}

export interface Feedback {
  id: string
  author: {
    id: string
    username: string
  }
  feedbackType: string
  rating: number
  comment: string
  timestamp: number
}

export interface ReputationStats {
  totalProfiles: number
  verifiedProfiles: number
  averageReputation: number
  totalAchievements: number
  activeUsers: number
}

export function useReputation() {
  const { address } = useAccount()
  const [mockProfiles, setMockProfiles] = useState<Profile[]>([])

  // Fetch all profiles from subgraph
  const { data: profilesData, loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useQuery(GET_PROFILES, {
    variables: { first: 100, skip: 0 },
    pollInterval: 60000, // Less frequent polling for profiles
    errorPolicy: 'ignore',
  })

  // Create mock data for development
  useEffect(() => {
    const mockProfilesData: Profile[] = [
      {
        id: '1',
        organization: { id: '1', name: 'GameDAO Alpha' },
        owner: { id: '1', address: '0x1234...5678' },
        username: 'alice_gamer',
        bio: 'Passionate gamer and DAO contributor',
        avatar: '/avatars/alice.png',
        website: 'https://alice.dev',
        verificationLevel: 3,
        experience: 1250,
        reputation: 850,
        trustScore: 92,
        convictionScore: 78,
        achievementCount: 12,
        feedbackCount: 45,
        positiveFeedbacks: 42,
        negativeFeedbacks: 3,
        createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
        updatedAt: Math.floor(Date.now() / 1000) - 86400 * 2,
      },
      {
        id: '2',
        organization: { id: '2', name: 'Beta Guild' },
        owner: { id: '2', address: '0x2345...6789' },
        username: 'bob_builder',
        bio: 'Building the future of gaming',
        avatar: '/avatars/bob.png',
        website: 'https://bobbuilds.com',
        verificationLevel: 2,
        experience: 950,
        reputation: 720,
        trustScore: 88,
        convictionScore: 85,
        achievementCount: 8,
        feedbackCount: 32,
        positiveFeedbacks: 29,
        negativeFeedbacks: 3,
        createdAt: Math.floor(Date.now() / 1000) - 86400 * 45,
        updatedAt: Math.floor(Date.now() / 1000) - 86400 * 1,
      },
      {
        id: '3',
        organization: { id: '1', name: 'GameDAO Alpha' },
        owner: { id: '3', address: '0x3456...7890' },
        username: 'charlie_dev',
        bio: 'Smart contract developer and gamer',
        avatar: '/avatars/charlie.png',
        website: '',
        verificationLevel: 4,
        experience: 1850,
        reputation: 1200,
        trustScore: 95,
        convictionScore: 90,
        achievementCount: 18,
        feedbackCount: 67,
        positiveFeedbacks: 64,
        negativeFeedbacks: 3,
        createdAt: Math.floor(Date.now() / 1000) - 86400 * 60,
        updatedAt: Math.floor(Date.now() / 1000) - 86400 * 1,
      },
    ]
    setMockProfiles(mockProfilesData)
  }, [])

  // Transform subgraph data or use mock data
  const profiles: Profile[] = profilesData?.profiles?.map((profile: any) => ({
    id: profile.id,
    organization: profile.organization,
    owner: profile.owner,
    username: profile.username || `User ${profile.id.slice(0, 8)}`,
    bio: profile.bio || '',
    avatar: profile.avatar || '/avatars/default.png',
    website: profile.website || '',
    verificationLevel: parseInt(profile.verificationLevel) || 0,
    experience: parseInt(profile.experience) || 0,
    reputation: parseInt(profile.reputation) || 0,
    trustScore: parseInt(profile.trustScore) || 0,
    convictionScore: parseInt(profile.convictionScore) || 0,
    achievementCount: parseInt(profile.achievementCount) || 0,
    feedbackCount: parseInt(profile.feedbackCount) || 0,
    positiveFeedbacks: parseInt(profile.positiveFeedbacks) || 0,
    negativeFeedbacks: parseInt(profile.negativeFeedbacks) || 0,
    createdAt: parseInt(profile.createdAt) || Math.floor(Date.now() / 1000),
    updatedAt: parseInt(profile.updatedAt) || Math.floor(Date.now() / 1000),
    achievements: profile.achievements || [],
    feedbacksReceived: profile.feedbacksReceived || [],
  })) || mockProfiles

  // Get user's profile
  const userProfile = address ? profiles.find(p => p.owner.address.toLowerCase() === address.toLowerCase()) : null

  // Calculate reputation stats
  const stats: ReputationStats = {
    totalProfiles: profiles.length,
    verifiedProfiles: profiles.filter(p => p.verificationLevel > 0).length,
    averageReputation: profiles.length > 0 ? profiles.reduce((sum, p) => sum + p.reputation, 0) / profiles.length : 0,
    totalAchievements: profiles.reduce((sum, p) => sum + p.achievementCount, 0),
    activeUsers: profiles.filter(p => p.updatedAt > Math.floor(Date.now() / 1000) - 86400 * 7).length,
  }

  // Utility functions
  const getVerificationLevelString = (level: number): string => {
    switch (level) {
      case 0: return 'Unverified'
      case 1: return 'Basic'
      case 2: return 'Verified'
      case 3: return 'Trusted'
      case 4: return 'Expert'
      case 5: return 'Master'
      default: return 'Unknown'
    }
  }

  const getVerificationLevelColor = (level: number): string => {
    switch (level) {
      case 0: return 'text-gray-500'
      case 1: return 'text-blue-500'
      case 2: return 'text-green-500'
      case 3: return 'text-yellow-500'
      case 4: return 'text-purple-500'
      case 5: return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getReputationTier = (reputation: number): string => {
    if (reputation >= 1000) return 'Legendary'
    if (reputation >= 750) return 'Elite'
    if (reputation >= 500) return 'Advanced'
    if (reputation >= 250) return 'Intermediate'
    if (reputation >= 100) return 'Beginner'
    return 'Newcomer'
  }

  const getReputationTierColor = (reputation: number): string => {
    if (reputation >= 1000) return 'text-yellow-500'
    if (reputation >= 750) return 'text-purple-500'
    if (reputation >= 500) return 'text-blue-500'
    if (reputation >= 250) return 'text-green-500'
    if (reputation >= 100) return 'text-orange-500'
    return 'text-gray-500'
  }

  const getTrustScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    if (score >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getTopProfiles = (limit: number = 10): Profile[] => {
    return [...profiles]
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit)
  }

  const getProfilesByOrganization = (organizationId: string): Profile[] => {
    return profiles.filter(p => p.organization.id === organizationId)
  }

  const searchProfiles = (query: string): Profile[] => {
    const lowercaseQuery = query.toLowerCase()
    return profiles.filter(p =>
      p.username.toLowerCase().includes(lowercaseQuery) ||
      p.bio.toLowerCase().includes(lowercaseQuery) ||
      p.organization.name.toLowerCase().includes(lowercaseQuery)
    )
  }

  return {
    // Data
    profiles,
    userProfile,
    stats,

    // Status
    isLoading: profilesLoading && profiles.length === 0,
    error: profilesError && profiles.length === 0 ? profilesError : null,

    // Utils
    getVerificationLevelString,
    getVerificationLevelColor,
    getReputationTier,
    getReputationTierColor,
    getTrustScoreColor,
    getTopProfiles,
    getProfilesByOrganization,
    searchProfiles,

    // Refetch
    refetch: refetchProfiles,
  }
}

// Individual profile hook
export function useProfile(profileId: string) {
  const { data, loading, error, refetch } = useQuery(GET_PROFILE_BY_ID, {
    variables: { id: profileId },
    skip: !profileId,
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  const profile = data?.profile ? {
    id: data.profile.id,
    organization: data.profile.organization,
    owner: data.profile.owner,
    username: data.profile.username,
    bio: data.profile.bio,
    avatar: data.profile.avatar,
    website: data.profile.website,
    verificationLevel: parseInt(data.profile.verificationLevel),
    experience: parseInt(data.profile.experience),
    reputation: parseInt(data.profile.reputation),
    trustScore: parseInt(data.profile.trustScore),
    convictionScore: parseInt(data.profile.convictionScore),
    achievementCount: parseInt(data.profile.achievementCount),
    feedbackCount: parseInt(data.profile.feedbackCount),
    positiveFeedbacks: parseInt(data.profile.positiveFeedbacks),
    negativeFeedbacks: parseInt(data.profile.negativeFeedbacks),
    createdAt: parseInt(data.profile.createdAt),
    updatedAt: parseInt(data.profile.updatedAt),
    achievements: data.profile.achievements || [],
    feedbacksReceived: data.profile.feedbacksReceived || [],
  } : null

  return {
    profile,
    isLoading: loading,
    error,
    refetch,
  }
}
