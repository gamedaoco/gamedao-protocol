'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { useToast } from './useToast'
import { useTokenApproval } from './useTokenApproval'

export interface CreateProfileParams {
  organizationId: string
  metadata: string
  gameDeposit?: string // GAME token deposit for profile creation
}

export interface ClaimNameParams {
  name: string
  stakeAmount: string
  stakeDuration: string
  nameType: number
}

export function useSense() {
  const { address } = useAccount()
  const { contracts, isConnected } = useGameDAO()
  const toast = useToast()

  // Add token approval hook for GAME token deposits
  const {
    handleApproval: handleTokenApproval,
    isApproving: isTokenApproving,
    isApprovalConfirming: isTokenApprovalConfirming,
    approvalSuccess: tokenApprovalSuccess,
    approvalError: tokenApprovalError,
    safeBigInt
  } = useTokenApproval()

  // Contract write for creating profile (using Identity module)
  const {
    writeContract: createProfile,
    isPending: isCreatingProfile,
    data: createProfileTxHash,
    error: createProfileError,
    reset: resetCreateProfile
  } = useWriteContract()

  // Wait for create profile transaction confirmation
  const {
    isLoading: isCreateProfileConfirming,
    isSuccess: createProfileSuccess,
    error: createProfileConfirmError,
  } = useWaitForTransactionReceipt({
    hash: createProfileTxHash,
  })

  // Contract write for claiming name (using Identity module)
  const {
    writeContract: claimName,
    isPending: isClaimingName,
    data: claimNameTxHash,
    error: claimNameError,
    reset: resetClaimName
  } = useWriteContract()

  // Wait for claim name transaction confirmation
  const {
    isLoading: isClaimNameConfirming,
    isSuccess: claimNameSuccess,
    error: claimNameConfirmError,
  } = useWaitForTransactionReceipt({
    hash: claimNameTxHash,
  })

  // Function to create a profile with GAME token approval
  const handleCreateProfile = async (params: CreateProfileParams) => {
    if (!isConnected || !contracts.IDENTITY) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Creating profile with Identity module:', {
        organizationId: params.organizationId,
        metadata: params.metadata,
        gameDeposit: params.gameDeposit
      })

      // Handle GAME token approval for profile creation if needed
      if (params.gameDeposit && parseFloat(params.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required for profile creation:', params.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.IDENTITY,
          amount: params.gameDeposit,
          purpose: 'profile creation'
        })

        if (!approvalNeeded) {
          // Approval is pending, profile creation will be handled after approval
          return
        }
      }

      // Convert organization ID to bytes8 format
      const orgIdBytes8 = params.organizationId.padEnd(16, '0') // Convert to 8-byte hex

      // Proceed with profile creation using Identity module
      const result = await createProfile({
        address: contracts.IDENTITY,
        abi: ABIS.IDENTITY,
        functionName: 'createProfile',
        args: [
          orgIdBytes8,
          params.metadata,
        ],
      })

      toast.loading('Creating profile...')
      return result
    } catch (error) {
      console.error('❌ Failed to create profile:', error)
      toast.error('Failed to create profile')
      throw error
    }
  }

  // Function to claim a name with GAME token approval
  const handleClaimName = async (params: ClaimNameParams) => {
    if (!isConnected || !contracts.IDENTITY) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Claiming name with Identity module:', {
        name: params.name,
        stakeAmount: params.stakeAmount,
        stakeDuration: params.stakeDuration,
        nameType: params.nameType
      })

      // Handle GAME token approval for name claiming
      if (params.stakeAmount && parseFloat(params.stakeAmount) > 0) {
        console.log('🔍 GAME token deposit required for name claiming:', params.stakeAmount)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.IDENTITY,
          amount: params.stakeAmount,
          purpose: 'name claiming'
        })

        if (!approvalNeeded) {
          // Approval is pending, name claiming will be handled after approval
          return
        }
      }

      // Convert name to bytes8 format
      const nameBytes8 = params.name.padEnd(16, '0') // Convert to 8-byte hex

      // Proceed with name claiming using Identity module
      const result = await claimName({
        address: contracts.IDENTITY,
        abi: ABIS.IDENTITY,
        functionName: 'claimName',
        args: [
          nameBytes8,
          safeBigInt(params.stakeAmount),
          safeBigInt(params.stakeDuration),
          params.nameType,
        ],
      })

      toast.loading('Claiming name...')
      return result
    } catch (error) {
      console.error('❌ Failed to claim name:', error)
      toast.error('Failed to claim name')
      throw error
    }
  }

  // Function to check if user has a profile in an organization
  const checkUserProfile = (organizationId: string) => {
    const orgIdBytes8 = organizationId.padEnd(16, '0') // Convert to 8-byte hex

    return useReadContract({
      address: contracts.IDENTITY,
      abi: ABIS.IDENTITY,
      functionName: 'getProfileByOwner',
      args: [address, orgIdBytes8],
      query: {
        enabled: !!address && !!contracts.IDENTITY && !!organizationId,
      },
    })
  }

  // Function to get profile information
  const getProfile = (profileId: string) => {
    const profileIdBytes8 = profileId.padEnd(16, '0') // Convert to 8-byte hex

    return useReadContract({
      address: contracts.IDENTITY,
      abi: ABIS.IDENTITY,
      functionName: 'getProfile',
      args: [profileIdBytes8],
      query: {
        enabled: !!contracts.IDENTITY && !!profileId,
      },
    })
  }

  // Function to get reputation data (using Sense module)
  const getReputation = (profileId: string) => {
    const profileIdBytes8 = profileId.padEnd(16, '0') // Convert to 8-byte hex

    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getReputation',
      args: [profileIdBytes8],
      query: {
        enabled: !!contracts.SENSE && !!profileId,
      },
    })
  }

  return {
    // Profile creation
    createProfile: handleCreateProfile,
    isCreatingProfile: isCreatingProfile || isCreateProfileConfirming || isTokenApproving || isTokenApprovalConfirming,
    createProfileSuccess,
    createProfileError: createProfileError || createProfileConfirmError || tokenApprovalError,

    // Name claiming
    claimName: handleClaimName,
    isClaimingName: isClaimingName || isClaimNameConfirming || isTokenApproving || isTokenApprovalConfirming,
    claimNameSuccess,
    claimNameError: claimNameError || claimNameConfirmError || tokenApprovalError,

    // Profile queries
    checkUserProfile,
    getProfile,
    getReputation,

    // Reset functions
    resetCreateProfile,
    resetClaimName,

    // Utilities
    safeBigInt,
  }
}
