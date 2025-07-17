'use client'

import { useQuery } from '@apollo/client'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { GET_ORGANIZATIONS, GET_USER_ORGANIZATIONS } from '@/lib/queries'
import { useEffect, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useToast } from './useToast'
import { extractOrganizationIdFromLogs, toContractId } from '@/lib/id-utils'
import { parseTokenAmount } from '@/lib/tokenUtils'
import { formatUnits } from 'viem'


export interface Organization {
  id: string // 8-character alphanumeric ID from smart contract
  name: string
  creator: string
  metadataURI?: string
  treasury: string
  accessModel: number
  feeModel: number
  memberLimit: number
  memberCount: number
  totalCampaigns: number
  totalProposals: number
  membershipFee: number
  state: number
  createdAt: number
}

export interface OrganizationStats {
  totalOrganizations: number
  totalMembers: number
  totalTreasuries: number
  activeOrganizations: number
  totalValue: number
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

// Utility functions
function getAccessModelFromString(accessModel: string | undefined): number {
  if (!accessModel) return 0

  switch (accessModel.toLowerCase()) {
    case 'open': return 0
    case 'voting': return 1
    case 'invite': return 2
    default: return 0
  }
}

function getStateFromString(state: string | undefined): number {
  if (!state) return 1

  switch (state.toLowerCase()) {
    case 'inactive': return 0
    case 'active': return 1
    case 'locked': return 2
    default: return 1
  }
}

export function useOrganizations() {
  const { contracts, isConnected } = useGameDAO()
  const { address } = useAccount()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)

  // Fetch organizations from subgraph
  const { data: orgsData, loading: orgsLoading, error: orgsQueryError, refetch } = useQuery(GET_ORGANIZATIONS, {
    variables: { first: 100 },
    pollInterval: 60000,
    errorPolicy: 'ignore',
    notifyOnNetworkStatusChange: false,
    fetchPolicy: 'cache-and-network',
  })

  // Update error state
  useEffect(() => {
    if (orgsQueryError) {
      setError(orgsQueryError.message)
    } else {
      setError(null)
    }
  }, [orgsQueryError])

    // Transform organizations data
  const organizations: Organization[] = useMemo(() => {
    if (!orgsData?.organizations) return []

    return orgsData.organizations.map((org: any) => ({
      id: org.id, // Now comes directly as 8-character alphanumeric from smart contract
      name: org.name || `Organization ${org.id}`,
      creator: org.creator,
      metadataURI: org.metadataURI,
      treasury: org.treasury?.address || '0x0000000000000000000000000000000000000000',
      accessModel: getAccessModelFromString(org.accessModel),
      feeModel: 0, // Not in subgraph schema
      memberLimit: parseInt(org.memberLimit) || 100,
      memberCount: parseInt(org.memberCount) || 0,
      totalCampaigns: parseInt(org.totalCampaigns) || 0,
      totalProposals: parseInt(org.totalProposals) || 0,
      membershipFee: org.membershipFee ? parseFloat(formatUnits(BigInt(org.membershipFee), 18)) : 0,
      state: getStateFromString(org.state),
      createdAt: parseInt(org.createdAt) || Math.floor(Date.now() / 1000),
    }))
  }, [orgsData?.organizations])

  // Fetch user's organizations from subgraph
  const { data: userOrgsData, loading: userOrgsLoading, refetch: refetchUserOrgs } = useQuery(GET_USER_ORGANIZATIONS, {
    variables: { user: address?.toLowerCase() || '' },
    skip: !address,
    pollInterval: 30000,
    errorPolicy: 'ignore',
    notifyOnNetworkStatusChange: false,
    fetchPolicy: 'cache-first',
  })

  // Transform user organizations data
  const userOrganizations: Organization[] = useMemo(() => {
    console.log('🔍 useOrganizations userOrgsData:', {
      userOrgsData,
      members: userOrgsData?.members,
      membersLength: userOrgsData?.members?.length,
      address
    })

    if (!userOrgsData?.members) return []

    const activeMembers = userOrgsData.members.filter((member: any) => member.state === 'ACTIVE')
    console.log('🔍 Active members:', activeMembers)

    return activeMembers.map((member: any) => {
      const org = member.organization
      return {
        id: org.id, // Now comes directly as 8-character alphanumeric from smart contract
        name: org.name || `Organization ${org.id}`,
        creator: org.creator,
        metadataURI: org.metadataURI || '',
        treasury: org.treasury?.address || '0x0000000000000000000000000000000000000000',
        accessModel: getAccessModelFromString(org.accessModel),
        feeModel: 0,
        memberLimit: parseInt(org.memberLimit) || 100,
        memberCount: parseInt(org.memberCount) || 0,
        totalCampaigns: parseInt(org.totalCampaigns) || 0,
        totalProposals: parseInt(org.totalProposals) || 0,
        membershipFee: 0, // Not available in this query
        state: getStateFromString(org.state),
        createdAt: parseInt(org.createdAt) || Math.floor(Date.now() / 1000),
      }
    })
  }, [userOrgsData?.members, address])

  // Contract write for creating organization
  const {
    writeContract: createOrg,
    isPending: isCreating,
    data: createTxHash,
    error: createError,
    reset: resetCreate
  } = useWriteContract()

  console.log('🔍 Transaction state:', {
    isCreating,
    createTxHash,
    createError: createError?.message,
    hasCreateTxHash: !!createTxHash
  })

  // Wait for create transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: createSuccess,
    error: confirmError,
    data: transactionReceipt
  } = useWaitForTransactionReceipt({
    hash: createTxHash,
  })

  console.log('🔍 Transaction confirmation state:', {
    isConfirming,
    createSuccess,
    confirmError: confirmError?.message,
    txHash: createTxHash,
    hasReceipt: !!transactionReceipt
  })

  // Extract organization ID from transaction receipt
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null)

  useEffect(() => {
    if (createSuccess && transactionReceipt && contracts.CONTROL) {
      try {
        console.log('🔍 Parsing transaction receipt for organization ID...')
        console.log('🔍 Transaction logs:', transactionReceipt.logs.length)

        const orgId = extractOrganizationIdFromLogs(transactionReceipt.logs, contracts.CONTROL)
        if (orgId) {
          console.log('🎉 Found organization ID:', orgId)
          setCreatedOrgId(orgId)
        } else {
          console.warn('⚠️ OrganizationCreated event not found in transaction logs')
        }
      } catch (error) {
        console.error('❌ Error parsing transaction receipt:', error)
      }
    }
  }, [createSuccess, transactionReceipt, contracts.CONTROL])

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
    error: joinConfirmError,
  } = useWaitForTransactionReceipt({
    hash: joinTxHash,
  })

  const createOrganization = async (params: CreateOrgParams) => {
    if (!isConnected || !contracts.CONTROL) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    // Helper function to safely convert GAME token amounts to BigInt
    const safeBigInt = (value: string | number, fallback = '0'): bigint => {
      return parseTokenAmount(value, 'GAME', fallback)
    }

    console.log('🔍 Creating organization with params:', params)

    try {
      const result = await createOrg({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'createOrganization',
        args: [
          params.name,
          params.metadataURI || '',
          params.orgType,
          params.accessModel,
          params.feeModel,
          params.memberLimit,
          safeBigInt(params.membershipFee),
          safeBigInt(params.gameStakeRequired),
        ],
      })

      console.log('🎉 Organization creation transaction submitted:', result)
      toast.loading('Creating organization...')
      return result
    } catch (error) {
      console.error('❌ Failed to create organization:', error)
      toast.error('Failed to create organization')
      throw error
    }
  }

  const joinOrganization = async (organizationId: string) => {
    if (!isConnected || !contracts.CONTROL) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    console.log('🔍 Joining organization:', organizationId)

    try {
      const result = await joinOrg({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'addMember',
        args: [toContractId(organizationId), address],
      })

      console.log('🎉 Join organization transaction submitted:', result)
      toast.loading('Joining organization...')
      return result
    } catch (error) {
      console.error('❌ Failed to join organization:', error)
      toast.error('Failed to join organization')
      throw error
    }
  }

  // Refetch data after successful transactions
  useEffect(() => {
    if (createSuccess) {
      console.log('🎉 Organization created successfully!')
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
  }, [createSuccess, refetch, refetchUserOrgs, address, resetCreate])

  useEffect(() => {
    if (joinSuccess) {
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
  }, [joinSuccess, refetch, refetchUserOrgs, address, resetJoin])

  // Calculate stats from organizations data
  const stats: OrganizationStats = useMemo(() => {
    return {
      totalOrganizations: organizations.length,
      totalMembers: organizations.reduce((sum, org) => sum + org.memberCount, 0),
      totalTreasuries: organizations.length, // Each org has one treasury
      activeOrganizations: organizations.filter(org => org.state === 1).length,
      totalValue: 0, // TODO: Calculate from treasury data
    }
  }, [organizations])

  return {
    organizations,
    userOrganizations,
    isLoading: orgsLoading,
    isUserOrgsLoading: userOrgsLoading,
    error,
    refetch,
    refetchUserOrgs,
    stats,

    // Organization creation
    createOrganization,
    isCreating: isCreating || isConfirming,
    createSuccess,
    createError: createError || confirmError,
    createdOrgId,

    // Organization joining
    joinOrganization,
    isJoining: isJoining || isJoinConfirming,
    joinSuccess,
    joinError: joinError || joinConfirmError,

    // Utility functions
    getAccessModelFromString,
    getStateFromString,
    getStateString: (state: number): string => {
      switch (state) {
        case 0: return 'Inactive'
        case 1: return 'Active'
        case 2: return 'Suspended'
        default: return 'Unknown'
      }
    },
    getAccessModelString: (accessModel: number): string => {
      switch (accessModel) {
        case 0: return 'Open'
        case 1: return 'Voting Required'
        case 2: return 'Invite Only'
        default: return 'Unknown'
      }
    },
  }
}

// Helper function to get organization by ID (accepts both formats)
export function useOrganization(organizationId?: string) {
  const { organizations, isLoading, error } = useOrganizations()

    const organization = useMemo(() => {
    if (!organizationId || !organizations.length) return null

    // Find organization by ID
    return organizations.find(org => org.id === organizationId) || null
  }, [organizations, organizationId])

  return {
    organization,
    isLoading,
    error,
  }
}

export function useUserOrganizations() {
  const { address, contractsValid } = useGameDAO()
  const [error, setError] = useState<string | null>(null)

  const { data: userOrgsData, loading: userOrgsLoading, error: userOrgsQueryError } = useQuery(GET_USER_ORGANIZATIONS, {
    variables: { user: address?.toLowerCase() || '' },
    skip: !address || !contractsValid,
    pollInterval: 60000,
    errorPolicy: 'ignore',
  })

  // Transform user organizations data
  const userOrganizations: Organization[] = useMemo(() => {
    if (!userOrgsData?.members) return []

    return userOrgsData.members
      .filter((member: any) => member.state === 'ACTIVE') // Only active members
      .map((member: any) => {
        const org = member.organization
        return {
          id: org.id, // Now comes directly as 8-character alphanumeric from smart contract
          name: org.name || `Organization ${org.id}`,
          creator: org.creator,
          metadataURI: org.metadataURI || '',
          treasury: org.treasury?.address || '0x0000000000000000000000000000000000000000',
          accessModel: getAccessModelFromString(org.accessModel),
          feeModel: 0,
          memberLimit: parseInt(org.memberLimit) || 100,
          memberCount: parseInt(org.memberCount) || 0,
          totalCampaigns: parseInt(org.totalCampaigns) || 0,
          totalProposals: parseInt(org.totalProposals) || 0,
          membershipFee: 0, // Not available in this query
          state: getStateFromString(org.state),
          createdAt: parseInt(org.createdAt) || Math.floor(Date.now() / 1000),
        }
      })
  }, [userOrgsData])

  // Update error state
  useEffect(() => {
    if (userOrgsQueryError) {
      setError(userOrgsQueryError.message)
    } else {
      setError(null)
    }
  }, [userOrgsQueryError])

  return {
    userOrganizations,
    isLoading: userOrgsLoading,
    error,
  }
}
