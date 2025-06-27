'use client'

import { useQuery } from '@apollo/client'
import { useReadContract, useWriteContract } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_CAMPAIGNS, GET_USER_CONTRIBUTIONS } from '@/lib/queries'
import { formatEther, parseEther } from 'viem'
import { useAccount } from 'wagmi'

export interface Campaign {
  id: string
  organizationId: string
  organizationName?: string
  creator: string
  title: string
  description: string
  flowType: string
  target: bigint
  deposit: bigint
  raised: bigint
  contributorCount: number
  state: string
  expiry: number
  createdAt: number
  updatedAt: number
}

export interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalRaised: string
  avgContribution: string
  userContributions: number
}

export function useCampaigns() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()

  // Fetch campaigns from subgraph
  const { data, loading, error, refetch } = useQuery(GET_CAMPAIGNS, {
    variables: { first: 100, skip: 0 },
    pollInterval: 30000,
    errorPolicy: 'all', // Show errors so we can debug
  })

  // Fetch user's contributions from subgraph
  const { data: userContribsData, loading: userContribsLoading } = useQuery(GET_USER_CONTRIBUTIONS, {
    variables: { user: address, first: 50 },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'all',
  })

  // Get campaign count from contract
  const { data: campaignCount, refetch: refetchCount } = useReadContract({
    address: contracts.FLOW,
    abi: ABIS.FLOW,
    functionName: 'getCampaignCount',
    query: { enabled: isConnected },
  })

  // Contract write for contributing to campaign
  const {
    writeContract: contribute,
    isPending: isContributing,
    isSuccess: contributeSuccess,
    error: contributeError
  } = useWriteContract()

  // Transform subgraph data to match our interface
  const campaigns: Campaign[] = data?.campaigns?.map((camp: any) => ({
    id: camp.id,
    organizationId: camp.organization.id,
    organizationName: camp.organization.name,
    creator: camp.creator,
    title: camp.title || `Campaign ${camp.id.slice(0, 8)}`,
    description: camp.description || `Campaign created by ${camp.organization.name}`,
    flowType: camp.flowType || 'GRANT',
    target: BigInt(camp.target || '0'),
    deposit: BigInt(camp.deposit || '0'),
    raised: BigInt(camp.raised || '0'),
    contributorCount: parseInt(camp.contributorCount) || 0,
    state: camp.state || 'CREATED',
    expiry: parseInt(camp.expiry) || 0,
    createdAt: parseInt(camp.createdAt) || Math.floor(Date.now() / 1000),
    updatedAt: parseInt(camp.updatedAt) || Math.floor(Date.now() / 1000),
  })) || []

  // Debug logging
  console.log('🎯 Campaigns from subgraph:', {
    subgraphCampaigns: data?.campaigns?.length || 0,
    totalCampaigns: campaigns.length,
    loading,
    error: error?.message || 'No error'
  })

  // Get user's contributions
  const userContributions = userContribsData?.contributions || []

  const contributeToCampaign = async (campaignId: string, amount: string, token: 'ETH' | 'USDC' = 'USDC') => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    const value = token === 'ETH' ? parseEther(amount) : BigInt(0)
    const tokenAmount = token === 'USDC' ? parseEther(amount) : BigInt(0)

    return contribute({
      address: contracts.FLOW,
      abi: ABIS.FLOW,
      functionName: 'contribute',
      args: [campaignId, tokenAmount, ''],
      value,
    })
  }

  const getFlowTypeString = (flowType: string): string => {
    switch (flowType?.toUpperCase()) {
      case 'GRANT': return 'Grant'
      case 'RAISE': return 'Fundraise'
      case 'LEND': return 'Lending'
      case 'LOAN': return 'Loan'
      case 'SHARE': return 'Revenue Share'
      case 'POOL': return 'Pool'
      default: return 'Grant'
    }
  }

  const getStateString = (state: string): string => {
    switch (state?.toUpperCase()) {
      case 'CREATED': return 'Created'
      case 'ACTIVE': return 'Active'
      case 'PAUSED': return 'Paused'
      case 'SUCCEEDED': return 'Succeeded'
      case 'FAILED': return 'Failed'
      case 'FINALIZED': return 'Finalized'
      case 'CANCELLED': return 'Cancelled'
      default: return 'Created'
    }
  }

  const getProgress = (campaign: Campaign): number => {
    if (campaign.target === BigInt(0)) return 0
    return Number((campaign.raised * BigInt(100)) / campaign.target)
  }

  const getTimeRemaining = (campaign: Campaign): number => {
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, campaign.expiry - now)
  }

  const formatAmount = (amount: bigint): string => {
    return formatEther(amount)
  }

  const isActive = (campaign: Campaign): boolean => {
    const now = Math.floor(Date.now() / 1000)
    return campaign.state === 'ACTIVE' && campaign.expiry > now
  }

  const timeRemaining = (campaign: Campaign): string => {
    const remaining = getTimeRemaining(campaign)
    if (remaining <= 0) return 'Ended'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  // Calculate stats
  const totalRaised = campaigns.reduce((sum, camp) => sum + camp.raised, BigInt(0))
  const activeCampaigns = campaigns.filter(camp => isActive(camp))
  const avgContribution = campaigns.length > 0 ? totalRaised / BigInt(campaigns.length) : BigInt(0)

  const stats: CampaignStats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalRaised: formatEther(totalRaised),
    avgContribution: formatEther(avgContribution),
    userContributions: userContributions.length,
  }

  return {
    // Data
    campaigns,
    userContributions,
    campaignCount: campaignCount ? Number(campaignCount) : campaigns.length,
    stats,

    // Actions
    contributeToCampaign,

    // Status
    isLoading: loading,
    isLoadingUserContribs: userContribsLoading,
    isContributing,
    contributeSuccess,
    contributeError,
    error,

    // Utils
    getFlowTypeString,
    getStateString,
    getProgress,
    getTimeRemaining,
    formatAmount,
    isActive,
    timeRemaining,

    // Refetch
    refetch: () => {
      refetch()
      refetchCount()
    },
  }
}
