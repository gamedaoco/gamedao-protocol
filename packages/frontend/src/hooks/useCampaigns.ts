'use client'

import { useQuery } from '@apollo/client'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_CAMPAIGNS, GET_USER_CAMPAIGNS } from '@/lib/queries'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useToast } from './use-toast'

export interface Campaign {
  id: string
  organization: {
    id: string
    name: string
  }
  creator: string
  title: string
  description: string
  target: string
  raised: string
  contributorCount: number
  state: string
  flowType: string
  expiry: number
  createdAt: number
  updatedAt: number
}

export interface CreateCampaignParams {
  organizationId: string
  title: string
  description: string
  metadataURI?: string
  flowType: number
  paymentToken: string
  target: string
  min: string
  max: string
  duration: number
  autoFinalize: boolean
}

export function useCampaigns() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()
  const toast = useToast()

  // Fetch campaigns from subgraph
  const { data, loading, error, refetch } = useQuery(GET_CAMPAIGNS, {
    variables: { first: 100, skip: 0 },
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Fetch user's campaigns from subgraph
  const { data: userCampaignsData, loading: userCampaignsLoading, refetch: refetchUserCampaigns } = useQuery(GET_USER_CAMPAIGNS, {
    variables: { user: address },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Contract write for creating campaign
  const {
    writeContract: createCampaign,
    isPending: isCreating,
    data: createTxHash,
    error: createError,
    reset: resetCreate
  } = useWriteContract()

  // Wait for create transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: createSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  // Contract write for contributing to campaign
  const {
    writeContract: contributeToCampaign,
    isPending: isContributing,
    data: contributeTxHash,
    error: contributeError,
    reset: resetContribute
  } = useWriteContract()

  // Wait for contribute transaction confirmation
  const {
    isLoading: isContributeConfirming,
    isSuccess: contributeSuccess,
    error: contributeConfirmError,
  } = useWaitForTransactionReceipt({
    hash: contributeTxHash,
  })

  const handleCreateCampaign = async (params: CreateCampaignParams) => {
    if (!isConnected || !contracts.FLOW) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    const safeBigInt = (value: string | number, fallback = '0'): bigint => {
      try {
        if (typeof value === 'number') {
          return BigInt(value)
        }
        if (typeof value === 'string' && value.trim() !== '') {
          const cleaned = value.replace(/[^0-9.]/g, '')
          if (cleaned === '' || cleaned === '.') {
            return BigInt(fallback)
          }
          if (cleaned.includes('.')) {
            const [whole, decimal] = cleaned.split('.')
            const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18)
            return BigInt(whole + paddedDecimal)
          }
          return BigInt(cleaned)
        }
        return BigInt(fallback)
      } catch (error) {
        console.warn('Failed to convert to BigInt:', value, error)
        return BigInt(fallback)
      }
    }

    try {
      const result = await createCampaign({
        address: contracts.FLOW,
        abi: ABIS.FLOW,
        functionName: 'createCampaign',
        args: [
          params.organizationId,
          params.title,
          params.metadataURI || '',
          params.flowType,
          params.paymentToken,
          safeBigInt(params.target),
          safeBigInt(params.min),
          safeBigInt(params.max),
          params.duration,
          params.autoFinalize,
        ],
      })

      toast.loading('Creating campaign...')
      return result
    } catch (error) {
      console.error('❌ Failed to create campaign:', error)
      toast.error('Failed to create campaign')
      throw error
    }
  }

  const handleContribute = async (campaignId: string, amount: string) => {
    if (!isConnected || !contracts.FLOW) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    const safeBigInt = (value: string): bigint => {
      try {
        const cleaned = value.replace(/[^0-9.]/g, '')
        if (cleaned.includes('.')) {
          const [whole, decimal] = cleaned.split('.')
          const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18)
          return BigInt(whole + paddedDecimal)
        }
        return BigInt(cleaned)
      } catch (error) {
        console.warn('Failed to convert to BigInt:', value, error)
        return BigInt('0')
      }
    }

    try {
      const result = await contributeToCampaign({
        address: contracts.FLOW,
        abi: ABIS.FLOW,
        functionName: 'contribute',
        args: [campaignId, safeBigInt(amount)],
      })

      toast.loading('Contributing to campaign...')
      return result
    } catch (error) {
      console.error('❌ Failed to contribute:', error)
      toast.error('Failed to contribute')
      throw error
    }
  }

  // Refetch data after successful transactions
  useEffect(() => {
    if (createSuccess) {
      toast.dismiss()
      refetch()
      if (address) {
        refetchUserCampaigns()
      }
      setTimeout(() => resetCreate(), 1000)
      toast.success('Campaign created successfully!')
    }
  }, [createSuccess, refetch, refetchUserCampaigns, address, resetCreate, toast])

  useEffect(() => {
    if (contributeSuccess) {
      toast.dismiss()
      refetch()
      if (address) {
        refetchUserCampaigns()
      }
      setTimeout(() => resetContribute(), 1000)
      toast.success('Contribution successful!')
    }
  }, [contributeSuccess, refetch, refetchUserCampaigns, address, resetContribute, toast])

  // Transform subgraph data
  const campaigns: Campaign[] = data?.campaigns?.map((campaign: any) => ({
    id: campaign.id,
    organization: campaign.organization,
    creator: campaign.creator,
    title: campaign.title,
    description: campaign.description,
    target: campaign.target,
    raised: campaign.raised,
    contributorCount: parseInt(campaign.contributorCount) || 0,
    state: campaign.state,
    flowType: campaign.flowType,
    expiry: parseInt(campaign.expiry),
    createdAt: parseInt(campaign.createdAt),
    updatedAt: parseInt(campaign.updatedAt),
  })) || []

  // Transform user campaigns data
  const userCampaigns: Campaign[] = userCampaignsData?.campaigns?.map((campaign: any) => ({
    id: campaign.id,
    organization: campaign.organization,
    creator: campaign.creator,
    title: campaign.title,
    description: campaign.description,
    target: campaign.target,
    raised: campaign.raised,
    contributorCount: parseInt(campaign.contributorCount) || 0,
    state: campaign.state,
    flowType: campaign.flowType,
    expiry: parseInt(campaign.expiry),
    createdAt: parseInt(campaign.createdAt),
    updatedAt: parseInt(campaign.updatedAt),
  })) || []

  return {
    campaigns,
    userCampaigns,
    isLoading: loading,
    isUserCampaignsLoading: userCampaignsLoading,
    error,
    refetch,
    refetchUserCampaigns,

    // Campaign creation
    createCampaign: handleCreateCampaign,
    isCreating: isCreating || isConfirming,
    createSuccess,
    createError: createError || confirmError,

    // Campaign contribution
    contribute: handleContribute,
    isContributing: isContributing || isContributeConfirming,
    contributeSuccess,
    contributeError: contributeError || contributeConfirmError,
  }
}
