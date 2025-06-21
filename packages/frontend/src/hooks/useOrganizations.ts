'use client'

import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { TEST_DATA } from '@/lib/contracts'
import { useState, useEffect } from 'react'
import { formatEther } from 'viem'

export interface Organization {
  id: string
  name: string
  creator: string
  treasury: string
  accessModel: number
  feeModel: number
  memberLimit: number
  memberCount: number
  state: number
  createdAt: number
}

export interface CreateOrgParams {
  name: string
  accessModel: number
  memberLimit: number
}

export function useOrganizations() {
  const { contracts, isConnected, address } = useGameDAO()
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Get organization count from contract
  const { data: orgCount, refetch: refetchCount } = useReadContract({
    address: contracts.CONTROL,
    abi: ABIS.CONTROL,
    functionName: 'getOrganizationCount',
    query: { enabled: isConnected },
  })

  // Get the test organization details
  const { data: testOrgData, refetch: refetchTestOrg } = useReadContract({
    address: contracts.CONTROL,
    abi: ABIS.CONTROL,
    functionName: 'getOrganization',
    args: [TEST_DATA.organizationId as `0x${string}`],
    query: { enabled: isConnected },
  })

  // Contract write for creating organization
  const {
    writeContract: createOrg,
    isPending: isCreating,
    isSuccess: createSuccess,
    error: createError
  } = useWriteContract()

  // Watch for organization creation events
  useWatchContractEvent({
    address: contracts.CONTROL,
    abi: ABIS.CONTROL,
    eventName: 'OrganizationCreated',
    onLogs(logs) {
      console.log('New organization created:', logs)
      // Refetch data when new organization is created
      refetchCount()
      refetchTestOrg()
    },
  })

  // Update organizations state when contract data changes
  useEffect(() => {
    if (testOrgData && Array.isArray(testOrgData)) {
      const [name, creator, treasury, accessModel, feeModel, memberLimit, memberCount, state, createdAt] = testOrgData

      const org: Organization = {
        id: TEST_DATA.organizationId,
        name: name as string,
        creator: creator as string,
        treasury: treasury as string,
        accessModel: accessModel as number,
        feeModel: feeModel as number,
        memberLimit: memberLimit as number,
        memberCount: Number(memberCount),
        state: state as number,
        createdAt: Number(createdAt),
      }

      setOrganizations([org])
    }
  }, [testOrgData])

  const createOrganization = async (params: CreateOrgParams) => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    return createOrg({
      address: contracts.CONTROL,
      abi: ABIS.CONTROL,
      functionName: 'createOrganization',
      args: [params.name, params.accessModel, params.memberLimit],
    })
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

  return {
    // Data
    organizations,
    orgCount: orgCount ? Number(orgCount) : 0,

    // Actions
    createOrganization,

    // Status
    isLoading: !testOrgData && isConnected,
    isCreating,
    createSuccess,
    createError,

    // Utils
    getAccessModelString,
    getStateString,

    // Refetch
    refetch: () => {
      refetchCount()
      refetchTestOrg()
    },
  }
}
