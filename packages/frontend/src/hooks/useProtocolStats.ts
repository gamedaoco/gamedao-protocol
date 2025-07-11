'use client'

import { useQuery } from '@apollo/client'
import { GET_ORGANIZATIONS, GET_CAMPAIGNS, GET_PROPOSALS, GET_RECENT_ACTIVITIES } from '@/lib/queries'

export interface GlobalStats {
  totalModules: number
  activeModules: number
  totalOrganizations: number
  activeOrganizations: number
  totalMembers: number
  totalCampaigns: number
  activeCampaigns: number
  totalRaised: string
  totalProposals: number
  activeProposals: number
  totalVotes: number
  totalProfiles: number
  verifiedProfiles: number
  totalAchievements: number
  updatedAt: number
}

export interface RecentActivity {
  id: string
  type: 'organization' | 'campaign' | 'proposal' | 'vote' | 'profile'
  title: string
  description: string
  organization?: {
    id: string
    name: string
  }
  creator: string
  timestamp: number
  blockNumber: number
  transactionHash: string
}

export interface ProtocolStats {
  globalStats: GlobalStats // Remove | null
  recentActivities: RecentActivity[]
  isLoading: boolean
  error: any
  refetch: () => void
}

export function useProtocolStats(): ProtocolStats {
  // Fetch organizations from subgraph
  const { data: orgsData, loading: orgsLoading, error: orgsError, refetch: refetchOrgs } = useQuery(GET_ORGANIZATIONS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch campaigns from subgraph
  const { data: campaignsData, loading: campaignsLoading, error: campaignsError, refetch: refetchCampaigns } = useQuery(GET_CAMPAIGNS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch proposals from subgraph
  const { data: proposalsData, loading: proposalsLoading, error: proposalsError, refetch: refetchProposals } = useQuery(GET_PROPOSALS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch recent activities from subgraph
  const { data: activitiesData, loading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useQuery(GET_RECENT_ACTIVITIES, {
    variables: { first: 20 },
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Always return a defined GlobalStats object with default values
  const globalStats: GlobalStats = {
    totalModules: 5, // This would come from registry data
    activeModules: 5, // This would come from registry data
    totalOrganizations: orgsData?.organizations?.length || 0,
    activeOrganizations: orgsData?.organizations?.filter((org: any) => org.state === 'ACTIVE').length || 0,
    totalMembers: orgsData?.organizations?.reduce((sum: number, org: any) => sum + (parseInt(org.memberCount) || 0), 0) || 0,
    totalCampaigns: campaignsData?.campaigns?.length || 0,
    activeCampaigns: campaignsData?.campaigns?.filter((campaign: any) => campaign.state === 'ACTIVE').length || 0,
    totalRaised: campaignsData?.campaigns?.reduce((sum: number, campaign: any) => sum + (parseFloat(campaign.raised) || 0), 0).toString() || '0',
    totalProposals: proposalsData?.proposals?.length || 0,
    activeProposals: proposalsData?.proposals?.filter((proposal: any) => proposal.state === 'ACTIVE').length || 0,
    totalVotes: proposalsData?.proposals?.reduce((sum: number, proposal: any) => sum + (parseInt(proposal.voteCount) || 0), 0) || 0,
    totalProfiles: 0, // Would come from profile data
    verifiedProfiles: 0, // Would come from profile data
    totalAchievements: 0, // Would come from achievement data
    updatedAt: Math.floor(Date.now() / 1000),
  }

  // Transform activities data
  const recentActivities: RecentActivity[] = activitiesData?.recentActivities?.map((activity: any) => ({
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    organization: activity.organization,
    creator: activity.creator,
    timestamp: parseInt(activity.timestamp),
    blockNumber: parseInt(activity.blockNumber),
    transactionHash: activity.transactionHash,
  })) || []

  const isLoading = orgsLoading || campaignsLoading || proposalsLoading || activitiesLoading
  const error = orgsError || campaignsError || proposalsError || activitiesError

  const refetch = () => {
    refetchOrgs()
    refetchCampaigns()
    refetchProposals()
    refetchActivities()
  }

  return {
    globalStats,
    recentActivities,
    isLoading,
    error,
    refetch,
  }
}
