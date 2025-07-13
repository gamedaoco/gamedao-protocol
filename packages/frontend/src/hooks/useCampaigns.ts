'use client'

import { useQuery } from '@apollo/client'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_CAMPAIGNS, GET_USER_CAMPAIGNS } from '@/lib/queries'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useToast } from './useToast'
import { toContractId } from '@/lib/id-utils'
import { useTokenApproval } from './useTokenApproval'

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
  gameDeposit?: string // Added for GAME token deposit
}

export function useCampaigns() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()
  const toast = useToast()

  // Add token approval hook
  const {
    handleApproval: handleTokenApproval,
    isApproving: isTokenApproving,
    isApprovalConfirming: isTokenApprovalConfirming,
    approvalSuccess: tokenApprovalSuccess,
    approvalError: tokenApprovalError,
    safeBigInt
  } = useTokenApproval()

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

    try {
      console.log('🔍 Creating campaign with GAME token approval:', {
        organizationId: params.organizationId,
        title: params.title,
        gameDeposit: params.gameDeposit
      })

      // Handle GAME token approval first if needed
      if (params.gameDeposit && parseFloat(params.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required:', params.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.FLOW,
          amount: params.gameDeposit,
          purpose: 'campaign creation'
        })

        if (!approvalNeeded) {
          // Approval is pending, campaign creation will be handled after approval
          return
        }
      }

      // Proceed with campaign creation
      const result = await createCampaign({
        address: contracts.FLOW,
        abi: ABIS.FLOW,
        functionName: 'createCampaign',
        args: [
          toContractId(params.organizationId),
          params.title,
          params.description || '',
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

  const handleContribute = async (campaignId: string, amount: string, token: 'USDC' | 'GAME' = 'USDC') => {
    if (!isConnected || !contracts.FLOW) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Contributing to campaign with token approval:', {
        campaignId,
        amount,
        token
      })

      // Handle token approval first
      const approvalNeeded = await handleTokenApproval({
        token,
        spender: contracts.FLOW,
        amount,
        purpose: 'campaign contribution'
      })

      if (!approvalNeeded) {
        // Approval is pending, contribution will be handled after approval
        return
      }

      // Proceed with contribution
      const result = await contributeToCampaign({
        address: contracts.FLOW,
        abi: ABIS.FLOW,
        functionName: 'contribute',
        args: [campaignId, safeBigInt(amount), ''],
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

  // Utility functions
  const getFlowTypeString = (flowType: string): string => {
    switch (flowType?.toUpperCase()) {
      case 'GRANT': return 'Grant'
      case 'RAISE': return 'Raise'
      case 'LEND': return 'Lend'
      case 'LOAN': return 'Loan'
      case 'SHARE': return 'Share'
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
      case 'LOCKED': return 'Locked'
      case 'FINALIZED': return 'Finalized'
      default: return 'Created'
    }
  }

  const getProgress = (campaign: Campaign): number => {
    const target = parseFloat(campaign.target)
    const raised = parseFloat(campaign.raised)
    return target > 0 ? Math.min((raised / target) * 100, 100) : 0
  }

  const formatAmount = (amount: string, decimals: number = 18): string => {
    try {
      const num = parseFloat(amount)
      if (num === 0) return '0'

      // Convert from wei to ether equivalent
      const divisor = Math.pow(10, decimals)
      const formatted = (num / divisor).toFixed(2)

      // Remove trailing zeros
      return parseFloat(formatted).toString()
    } catch (error) {
      return '0'
    }
  }

  const isActive = (campaign: Campaign): boolean => {
    const now = Math.floor(Date.now() / 1000)
    return campaign.state === 'ACTIVE' && campaign.expiry > now
  }

  const timeRemaining = (campaign: Campaign): string => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = Math.max(0, campaign.expiry - now)

    if (remaining <= 0) return 'Ended'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

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
    isCreating: isCreating || isConfirming || isTokenApproving || isTokenApprovalConfirming,
    createSuccess,
    createError: createError || confirmError || tokenApprovalError,

    // Campaign contribution
    contribute: handleContribute,
    isContributing: isContributing || isContributeConfirming,
    contributeSuccess,
    contributeError: contributeError || contributeConfirmError,

    // Utility functions
    getFlowTypeString,
    getStateString,
    getProgress,
    formatAmount,
    isActive,
    timeRemaining,
  }
}
