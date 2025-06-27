'use client'

import { useQuery } from '@apollo/client'
import { GET_GLOBAL_STATS, GET_RECENT_ACTIVITIES } from '@/lib/queries'
import { useState, useEffect } from 'react'
import { formatEther } from 'viem'

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
  type: 'organization' | 'campaign' | 'proposal' | 'contribution'
  title: string
  description: string
  organization?: {
    id: string
    name: string
  }
  creator?: string
  amount?: string
  timestamp: number
  blockNumber: number
  transactionHash: string
}

export interface ProtocolStats {
  globalStats: GlobalStats
  recentActivities: RecentActivity[]
  stats: GlobalStats // Alias for backward compatibility
  isLoading: boolean
  error: any
}

export function useProtocolStats(): ProtocolStats {
  const [mockStats, setMockStats] = useState<GlobalStats | null>(null)
  const [mockActivities, setMockActivities] = useState<RecentActivity[]>([])

  // Fetch global stats from subgraph
  const { data: statsData, loading: statsLoading, error: statsError, refetch: refetchStats } = useQuery(GET_GLOBAL_STATS, {
    pollInterval: 60000, // Poll every minute for global stats
    errorPolicy: 'ignore',
  })

  // Fetch recent activities from subgraph
  const { data: activitiesData, loading: activitiesLoading, error: activitiesError, refetch: refetchActivities } = useQuery(GET_RECENT_ACTIVITIES, {
    variables: { first: 20 },
    pollInterval: 30000, // Poll every 30 seconds for activities
    errorPolicy: 'ignore',
  })

  // Create mock data for development
  useEffect(() => {
    const mockGlobalStats: GlobalStats = {
      totalModules: 5,
      activeModules: 5,
      totalOrganizations: 127,
      activeOrganizations: 98,
      totalMembers: 2847,
      totalCampaigns: 456,
      activeCampaigns: 89,
      totalRaised: '2847563.45',
      totalProposals: 234,
      activeProposals: 23,
      totalVotes: 1892,
      totalProfiles: 1654,
      verifiedProfiles: 892,
      totalAchievements: 3421,
      updatedAt: Math.floor(Date.now() / 1000),
    }
    setMockStats(mockGlobalStats)

    const mockRecentActivities: RecentActivity[] = [
      {
        id: '1',
        type: 'organization',
        title: 'GameDAO Alpha',
        description: 'New organization created',
        creator: '0x1234...5678',
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        blockNumber: 18500000,
        transactionHash: '0xabc123...',
      },
      {
        id: '2',
        type: 'campaign',
        title: 'Fund the Next Big Game',
        description: 'New campaign launched',
        organization: { id: '1', name: 'GameDAO Alpha' },
        creator: '0x2345...6789',
        timestamp: Math.floor(Date.now() / 1000) - 7200,
        blockNumber: 18499950,
        transactionHash: '0xdef456...',
      },
      {
        id: '3',
        type: 'contribution',
        title: 'Contribution to Fund the Next Big Game',
        description: 'User contributed to campaign',
        organization: { id: '1', name: 'GameDAO Alpha' },
        creator: '0x3456...7890',
        amount: '1000',
        timestamp: Math.floor(Date.now() / 1000) - 10800,
        blockNumber: 18499900,
        transactionHash: '0x789abc...',
      },
      {
        id: '4',
        type: 'proposal',
        title: 'Update Treasury Management',
        description: 'New governance proposal',
        organization: { id: '2', name: 'Beta Guild' },
        creator: '0x4567...8901',
        timestamp: Math.floor(Date.now() / 1000) - 14400,
        blockNumber: 18499850,
        transactionHash: '0x456def...',
      },
    ]
    setMockActivities(mockRecentActivities)
  }, [])

  // Transform subgraph data or use mock data
  const globalStats: GlobalStats = statsData?.globalStats ? {
    totalModules: parseInt(statsData.globalStats.totalModules) || 0,
    activeModules: parseInt(statsData.globalStats.activeModules) || 0,
    totalOrganizations: parseInt(statsData.globalStats.totalOrganizations) || 0,
    activeOrganizations: parseInt(statsData.globalStats.activeOrganizations) || 0,
    totalMembers: parseInt(statsData.globalStats.totalMembers) || 0,
    totalCampaigns: parseInt(statsData.globalStats.totalCampaigns) || 0,
    activeCampaigns: parseInt(statsData.globalStats.activeCampaigns) || 0,
    totalRaised: formatEther(BigInt(statsData.globalStats.totalRaised || '0')),
    totalProposals: parseInt(statsData.globalStats.totalProposals) || 0,
    activeProposals: parseInt(statsData.globalStats.activeProposals) || 0,
    totalVotes: parseInt(statsData.globalStats.totalVotes) || 0,
    totalProfiles: parseInt(statsData.globalStats.totalProfiles) || 0,
    verifiedProfiles: parseInt(statsData.globalStats.verifiedProfiles) || 0,
    totalAchievements: parseInt(statsData.globalStats.totalAchievements) || 0,
    updatedAt: parseInt(statsData.globalStats.updatedAt) || Math.floor(Date.now() / 1000),
  } : mockStats || {
    totalModules: 0,
    activeModules: 0,
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalMembers: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRaised: '0',
    totalProposals: 0,
    activeProposals: 0,
    totalVotes: 0,
    totalProfiles: 0,
    verifiedProfiles: 0,
    totalAchievements: 0,
    updatedAt: Math.floor(Date.now() / 1000),
  }

  // Transform activities data
  const recentActivities: RecentActivity[] = []

  // Add organizations
  if (activitiesData?.organizations) {
    activitiesData.organizations.forEach((org: any) => {
      recentActivities.push({
        id: `org-${org.id}`,
        type: 'organization',
        title: org.name,
        description: 'New organization created',
        creator: org.creator,
        timestamp: parseInt(org.createdAt),
        blockNumber: parseInt(org.blockNumber),
        transactionHash: org.transactionHash,
      })
    })
  }

  // Add campaigns
  if (activitiesData?.campaigns) {
    activitiesData.campaigns.forEach((campaign: any) => {
      recentActivities.push({
        id: `campaign-${campaign.id}`,
        type: 'campaign',
        title: campaign.title,
        description: 'New campaign launched',
        organization: campaign.organization,
        creator: campaign.creator,
        timestamp: parseInt(campaign.createdAt),
        blockNumber: parseInt(campaign.blockNumber),
        transactionHash: campaign.transactionHash,
      })
    })
  }

  // Add proposals
  if (activitiesData?.proposals) {
    activitiesData.proposals.forEach((proposal: any) => {
      recentActivities.push({
        id: `proposal-${proposal.id}`,
        type: 'proposal',
        title: proposal.title,
        description: 'New governance proposal',
        organization: proposal.organization,
        creator: proposal.proposer.address,
        timestamp: parseInt(proposal.createdAt),
        blockNumber: parseInt(proposal.blockNumber),
        transactionHash: proposal.transactionHash,
      })
    })
  }

  // Add contributions
  if (activitiesData?.contributions) {
    activitiesData.contributions.forEach((contribution: any) => {
      recentActivities.push({
        id: `contribution-${contribution.id}`,
        type: 'contribution',
        title: `Contribution to ${contribution.campaign.title}`,
        description: 'User contributed to campaign',
        organization: contribution.campaign.organization,
        creator: contribution.contributor.address,
        amount: formatEther(BigInt(contribution.amount)),
        timestamp: parseInt(contribution.timestamp),
        blockNumber: parseInt(contribution.blockNumber),
        transactionHash: contribution.transactionHash,
      })
    })
  }

  // Sort activities by timestamp and use mock data if no subgraph data
  const sortedActivities = recentActivities.length > 0
    ? recentActivities.sort((a, b) => b.timestamp - a.timestamp)
    : mockActivities

  const isLoading = statsLoading || activitiesLoading
  const error = statsError || activitiesError

  return {
    globalStats,
    recentActivities: sortedActivities,
    stats: globalStats, // Alias for backward compatibility
    isLoading: isLoading && !mockStats,
    error: error && !mockStats ? error : null,
  }
}
