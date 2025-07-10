'use client'

import { useQuery } from '@apollo/client'
import { GET_ORGANIZATIONS, GET_CAMPAIGNS, GET_PROPOSALS, GET_RECENT_ACTIVITIES } from '@/lib/queries'
import { useState, useEffect } from 'react'
// Safe BigInt conversion helper
const safeBigInt = (value: any, fallback: string = '0'): bigint => {
  if (value === null || value === undefined || value === '') {
    return BigInt(fallback)
  }
  
  const stringValue = String(value).trim()
  if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
    return BigInt(fallback)
  }
  
  // Check if it's a valid number string
  if (!/^\d+$/.test(stringValue)) {
    console.warn(`Invalid BigInt value: "${value}", using fallback: ${fallback}`)
    return BigInt(fallback)
  }
  
  try {
    return BigInt(stringValue)
  } catch (error) {
    console.warn(`BigInt conversion failed for: "${value}", using fallback: ${fallback}`)
    return BigInt(fallback)
  }
}
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

  // Fetch organizations from subgraph
  const { data: orgsData, loading: orgsLoading, error: orgsError } = useQuery(GET_ORGANIZATIONS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch campaigns from subgraph
  const { data: campaignsData, loading: campaignsLoading, error: campaignsError } = useQuery(GET_CAMPAIGNS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch proposals from subgraph
  const { data: proposalsData, loading: proposalsLoading, error: proposalsError } = useQuery(GET_PROPOSALS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Fetch recent activities from subgraph
  const { data: activitiesData, loading: activitiesLoading, error: activitiesError } = useQuery(GET_RECENT_ACTIVITIES, {
    variables: { first: 20 },
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Create mock data for development fallback
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
    ]
    setMockActivities(mockRecentActivities)
  }, [])

  // Calculate global stats from actual subgraph data
  const calculateGlobalStats = (): GlobalStats => {
    const organizations = orgsData?.organizations || []
    const campaigns = campaignsData?.campaigns || []
    const proposals = proposalsData?.proposals || []

    // Calculate total members across all organizations
    const totalMembers = organizations.reduce((sum: number, org: any) => {
      return sum + parseInt(org.memberCount || '0')
    }, 0)

    // Calculate active organizations
    const activeOrganizations = organizations.filter((org: any) => org.state === 'ACTIVE').length

    // Calculate total raised across all campaigns
    const totalRaised = campaigns.reduce((sum: number, campaign: any) => {
      return sum + parseFloat(formatEther(safeBigInt(campaign.raised)))
    }, 0)

    // Calculate active campaigns
    const activeCampaigns = campaigns.filter((campaign: any) => campaign.state === 'ACTIVE').length

    // Calculate active proposals
    const activeProposals = proposals.filter((proposal: any) =>
      proposal.state === 'PENDING' || proposal.state === 'ACTIVE'
    ).length

    return {
      totalModules: 5, // Static for now
      activeModules: 5, // Static for now
      totalOrganizations: organizations.length,
      activeOrganizations,
      totalMembers,
      totalCampaigns: campaigns.length,
      activeCampaigns,
      totalRaised: totalRaised.toString(),
      totalProposals: proposals.length,
      activeProposals,
      totalVotes: 0, // Would need vote data
      totalProfiles: 0, // Would need profile data
      verifiedProfiles: 0, // Would need profile data
      totalAchievements: 0, // Would need achievement data
      updatedAt: Math.floor(Date.now() / 1000),
    }
  }

  // Use calculated stats if we have subgraph data, otherwise use mock data
  const hasSubgraphData = orgsData || campaignsData || proposalsData
  const globalStats: GlobalStats = hasSubgraphData ? calculateGlobalStats() : mockStats || {
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

  const isLoading = orgsLoading || campaignsLoading || proposalsLoading || activitiesLoading
  const error = orgsError || campaignsError || proposalsError || activitiesError

  return {
    globalStats,
    recentActivities: sortedActivities,
    stats: globalStats, // Alias for backward compatibility
    isLoading: isLoading && !hasSubgraphData,
    error: error && !hasSubgraphData ? error : null,
  }
}
