'use client'

import { useQuery } from '@apollo/client'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_ORGANIZATIONS, GET_USER_ORGANIZATIONS } from '@/lib/queries'
import { getScaffoldData, ScaffoldDAO } from '@/lib/scaffold-data'
import { useEffect, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useToast } from './use-toast'

export interface Organization {
  id: string
  name: string
  creator: string
  treasury: string
  accessModel: number
  feeModel: number
  memberLimit: number
  memberCount: number
  totalCampaigns: number
  totalProposals: number
  state: number
  createdAt: number
}

export interface CreateOrgParams {
  name: string
  metadataURI?: string
  orgType: number
  accessModel: number
  feeModel: number
  memberLimit: number
  membershipFee: string
  gameStakeRequired: string
}

// Utility functions - moved to top to avoid temporal dead zone
const getAccessModelFromString = (accessModel: string): number => {
  switch (accessModel?.toUpperCase()) {
    case 'OPEN': return 0
    case 'VOTING': return 1
    case 'INVITE': return 2
    default: return 0
  }
}

const getStateFromString = (state: string): number => {
  switch (state?.toUpperCase()) {
    case 'INACTIVE': return 0
    case 'ACTIVE': return 1
    case 'LOCKED': return 2
    default: return 1
  }
}

const getAccessModelString = (accessModel: number): string => {
  switch (accessModel) {
    case 0: return 'Open'
    case 1: return 'Voting'
    case 2: return 'Invite'
    default: return 'Unknown'
  }
}

const getStateString = (state: number): string => {
  switch (state) {
    case 0: return 'Inactive'
    case 1: return 'Active'
    case 2: return 'Locked'
    default: return 'Unknown'
  }
}

export function useOrganizations() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()
  const [scaffoldOrgs, setScaffoldOrgs] = useState<Organization[]>([])
  const toast = useToast()

  // Fetch organizations from subgraph
  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATIONS, {
    variables: { first: 100, skip: 0 },
    pollInterval: 30000, // Poll every 30 seconds
    errorPolicy: 'ignore', // Don't throw errors, we'll use scaffold data as fallback
  })

  // Fetch user's organizations from subgraph
  const { data: userOrgsData, loading: userOrgsLoading, refetch: refetchUserOrgs } = useQuery(GET_USER_ORGANIZATIONS, {
    variables: { user: address },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
  })

  // Load scaffold data as fallback
  useEffect(() => {
    const scaffoldData = getScaffoldData()
    if (scaffoldData?.daos) {
      const orgs: Organization[] = scaffoldData.daos.map((dao: ScaffoldDAO) => ({
        id: dao.id,
        name: dao.name,
        creator: dao.creator,
        treasury: dao.treasury,
        accessModel: 0, // Default to Open
        feeModel: 0,
        memberLimit: 100,
        memberCount: dao.members.length,
        totalCampaigns: 0, // Will be calculated from campaigns
        totalProposals: 0, // Will be calculated from proposals
        state: 1, // Active
        createdAt: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 30), // Random time in last 30 days
      }))
      setScaffoldOrgs(orgs)
    }
  }, [])

  // Contract write for creating organization
  const {
    writeContract: createOrg,
    isPending: isCreating,
    data: createTxHash,
    error: createError,
    reset: resetCreate
  } = useWriteContract()

  // Wait for create transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: createSuccess,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  // Contract write for joining organization
  const {
    writeContract: joinOrg,
    isPending: isJoining,
    data: joinTxHash,
    error: joinError,
    reset: resetJoin
  } = useWriteContract()

  // Wait for join transaction confirmation
  const {
    isLoading: isJoinConfirming,
    isSuccess: joinSuccess,
    error: joinConfirmError
  } = useWaitForTransactionReceipt({
    hash: joinTxHash,
  })

  // Handle transaction pending state
  useEffect(() => {
    if (createTxHash && isCreating) {
      toast.loading('Creating organization... Please wait for confirmation.')
    }
  }, [createTxHash, isCreating, toast])

  useEffect(() => {
    if (joinTxHash && isJoining) {
      toast.loading('Joining organization... Please wait for confirmation.')
    }
  }, [joinTxHash, isJoining, toast])

  // Handle transaction errors
  useEffect(() => {
    if (createError || confirmError) {
      const error = createError || confirmError
      console.error('❌ Organization creation failed:', error)
      // Remove automatic toast - let the component handle error display
      // toast.error('Failed to create organization. Please try again.')
    }
  }, [createError, confirmError])

  useEffect(() => {
    if (joinError || joinConfirmError) {
      const error = joinError || joinConfirmError
      console.error('❌ Organization join failed:', error)
      toast.error('Failed to join organization. Please try again.')
    }
  }, [joinError, joinConfirmError, toast])

  // Refetch data after successful transactions
  useEffect(() => {
    if (createSuccess) {
      console.log('✅ Organization creation confirmed on-chain!')
      // Dismiss any loading toasts
      toast.dismiss()
      // Refetch data to show the new organization
      refetch()
      if (address) {
        refetchUserOrgs()
      }
      // Reset the transaction state
      setTimeout(() => resetCreate(), 1000)
      toast.success('Organization created successfully!')
    }
  }, [createSuccess, refetch, refetchUserOrgs, address, resetCreate, toast])

  useEffect(() => {
    if (joinSuccess) {
      console.log('✅ Organization join confirmed on-chain!')
      // Dismiss any loading toasts
      toast.dismiss()
      // Refetch data to show updated membership
      refetch()
      if (address) {
        refetchUserOrgs()
      }
      // Reset the transaction state
      setTimeout(() => resetJoin(), 1000)
      toast.success('Organization joined successfully!')
    }
  }, [joinSuccess, refetch, refetchUserOrgs, address, resetJoin, toast])

  // Transform subgraph data to match our interface, fallback to scaffold data
  const organizations: Organization[] = data?.organizations?.map((org: any) => ({
    id: org.id,
    name: org.name || `Organization ${org.id.slice(0, 8)}`,
    creator: org.creator,
    treasury: org.treasury?.address || '0x0000000000000000000000000000000000000000',
    accessModel: getAccessModelFromString(org.accessModel) || 0,
    feeModel: 0, // Not in subgraph schema
    memberLimit: parseInt(org.memberLimit) || 100,
    memberCount: parseInt(org.memberCount) || 0,
    totalCampaigns: parseInt(org.totalCampaigns) || 0,
    totalProposals: parseInt(org.totalProposals) || 0,
    state: getStateFromString(org.state) || 1,
    createdAt: parseInt(org.createdAt) || Math.floor(Date.now() / 1000),
  })) || scaffoldOrgs

  // Get user's organizations from subgraph data
  const userOrganizations = userOrgsData?.members?.map((member: any) => ({
    ...member.organization,
    memberRole: member.role,
    memberState: member.state,
    joinedAt: member.joinedAt,
  })) || []

  const createOrganization = async (params: CreateOrgParams) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    console.log('🔧 Creating organization with processed params:', {
      name: params.name,
      metadataURI: params.metadataURI || '',
      orgType: params.orgType,
      accessModel: params.accessModel,
      feeModel: params.feeModel,
      memberLimit: params.memberLimit,
      membershipFee: params.membershipFee,
      gameStakeRequired: params.gameStakeRequired,
    })

    // Helper function to safely convert to BigInt
    const safeBigInt = (value: string | number, fallback = '0'): bigint => {
      if (value === null || value === undefined || value === '') {
        return BigInt(fallback)
      }

      const stringValue = String(value).trim()
      if (stringValue === '' || stringValue === 'null' || stringValue === 'undefined') {
        return BigInt(fallback)
      }

      // Check for invalid patterns
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

    const membershipFeeBigInt = safeBigInt(params.membershipFee, '0')
    const gameStakeRequiredBigInt = safeBigInt(params.gameStakeRequired, '0')

    console.log('🔧 BigInt conversions:', {
      membershipFee: `${params.membershipFee} -> ${membershipFeeBigInt}`,
      gameStakeRequired: `${params.gameStakeRequired} -> ${gameStakeRequiredBigInt}`,
    })

    try {
      return createOrg({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'createOrganization',
        args: [
          params.name,
          params.metadataURI || '',
          params.orgType,
          params.accessModel,
          params.feeModel,
          Number(params.memberLimit), // Ensure it's a proper number for uint32
          membershipFeeBigInt,
          gameStakeRequiredBigInt,
        ],
      })
    } catch (error) {
      console.error('❌ Contract call failed:', error)
      throw error
    }
  }

  const joinOrganization = async (organizationId: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    return joinOrg({
      address: contracts.CONTROL,
      abi: ABIS.CONTROL,
      functionName: 'addMember',
      args: [organizationId, address],
    })
  }

  // Calculate stats
  const stats = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter(org => org.state === 1).length,
    totalMembers: organizations.reduce((sum, org) => sum + org.memberCount, 0),
    userMemberships: userOrganizations.length,
  }

  return {
    // Data
    organizations,
    userOrganizations,
    orgCount: organizations.length,
    stats,

    // Actions
    createOrganization,
    joinOrganization,
    resetCreate,

    // Status - show loading only if we have no data at all
    isLoading: loading && organizations.length === 0,
    isLoadingUserOrgs: userOrgsLoading,
    isCreating: isCreating || isConfirming,
    createSuccess,
    createError: createError || confirmError,
    isJoining: isJoining || isJoinConfirming,
    joinSuccess,
    joinError: joinError || joinConfirmError,
    error: error && organizations.length === 0 ? error : null, // Hide error if we have scaffold data

    // Utils
    getAccessModelString,
    getStateString,

    // Refetch
    refetch: () => {
      refetch()
      if (address) {
        refetchUserOrgs()
      }
    },
  }
}
