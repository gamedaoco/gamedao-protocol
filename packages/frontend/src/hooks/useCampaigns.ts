'use client'

import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { TEST_DATA } from '@/lib/contracts'
import { useState, useEffect } from 'react'
import { formatEther, parseEther } from 'viem'

export interface Campaign {
  id: string
  organizationId: string
  creator: string
  title: string
  description: string
  flowType: number
  target: bigint
  min: bigint
  max: bigint
  raised: bigint
  state: number
  startTime: number
  endTime: number
}

export interface ContributeParams {
  campaignId: string
  amount: string // ETH amount as string
}

export function useCampaigns() {
  const { contracts, isConnected, address } = useGameDAO()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  // Get campaign count from contract
  const { data: campaignCount, refetch: refetchCount } = useReadContract({
    address: contracts.FLOW,
    abi: ABIS.FLOW,
    functionName: 'getCampaignCount',
    query: { enabled: isConnected },
  })

  // Get the test campaign details
  const { data: testCampaignData, refetch: refetchTestCampaign } = useReadContract({
    address: contracts.FLOW,
    abi: ABIS.FLOW,
    functionName: 'getCampaign',
    args: [TEST_DATA.campaignId as `0x${string}`],
    query: { enabled: isConnected },
  })

  // Contract write for contributing to campaign
  const {
    writeContract: contribute,
    isPending: isContributing,
    isSuccess: contributeSuccess,
    error: contributeError
  } = useWriteContract()

  // Update campaigns state when contract data changes
  useEffect(() => {
    if (testCampaignData && Array.isArray(testCampaignData)) {
      const [
        organizationId,
        creator,
        title,
        description,
        flowType,
        target,
        min,
        max,
        raised,
        state,
        startTime,
        endTime
      ] = testCampaignData

      const campaign: Campaign = {
        id: TEST_DATA.campaignId,
        organizationId: organizationId as string,
        creator: creator as string,
        title: title as string,
        description: description as string,
        flowType: flowType as number,
        target: target as bigint,
        min: min as bigint,
        max: max as bigint,
        raised: raised as bigint,
        state: state as number,
        startTime: Number(startTime),
        endTime: Number(endTime),
      }

      setCampaigns([campaign])
    }
  }, [testCampaignData])

  const contributeToCampaign = async (params: ContributeParams) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    const value = parseEther(params.amount)

    return contribute({
      address: contracts.FLOW,
      abi: ABIS.FLOW,
      functionName: 'contribute',
      args: [params.campaignId as `0x${string}`],
      value,
    })
  }

  const getFlowTypeString = (flowType: number): string => {
    switch (flowType) {
      case 0: return 'Grant'
      case 1: return 'Raise'
      case 2: return 'Lend'
      case 3: return 'Loan'
      case 4: return 'Share'
      case 5: return 'Pool'
      default: return 'Unknown'
    }
  }

  const getStateString = (state: number): string => {
    switch (state) {
      case 0: return 'Created'
      case 1: return 'Active'
      case 2: return 'Succeeded'
      case 3: return 'Failed'
      case 4: return 'Cancelled'
      case 5: return 'Finalized'
      default: return 'Unknown'
    }
  }

  const getProgress = (campaign: Campaign): number => {
    if (campaign.target === BigInt(0)) return 0
    return Number((campaign.raised * BigInt(100)) / campaign.target)
  }

  const formatAmount = (amount: bigint): string => {
    return formatEther(amount)
  }

  const isActive = (campaign: Campaign): boolean => {
    const now = Math.floor(Date.now() / 1000)
    return campaign.state === 1 && now >= campaign.startTime && now <= campaign.endTime
  }

  const timeRemaining = (campaign: Campaign): string => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = campaign.endTime - now

    if (remaining <= 0) return 'Ended'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return {
    // Data
    campaigns,
    campaignCount: campaignCount ? Number(campaignCount) : 0,

    // Actions
    contributeToCampaign,

    // Status
    isLoading: !testCampaignData && isConnected,
    isContributing,
    contributeSuccess,
    contributeError,

    // Utils
    getFlowTypeString,
    getStateString,
    getProgress,
    formatAmount,
    isActive,
    timeRemaining,

    // Refetch
    refetch: () => {
      refetchCount()
      refetchTestCampaign()
    },
  }
}
