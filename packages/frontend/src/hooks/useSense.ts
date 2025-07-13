'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { useToast } from './use-toast'
import { useTokenApproval } from './useTokenApproval'

export interface CreateProfileParams {
  organizationId: string
  metadata: string
  gameDeposit?: string // GAME token deposit for profile creation
}

export interface ClaimNameParams {
  profileId: string
  name: string
  gameDeposit?: string // GAME token deposit for name claiming
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

  // Contract write for creating profile
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

  // Contract write for claiming name
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
    if (!isConnected || !contracts.SENSE) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Creating profile with GAME token approval:', {
        organizationId: params.organizationId,
        metadata: params.metadata,
        gameDeposit: params.gameDeposit
      })

      // Handle GAME token approval for profile creation
      if (params.gameDeposit && parseFloat(params.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required for profile creation:', params.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.SENSE,
          amount: params.gameDeposit,
          purpose: 'profile creation'
        })

        if (!approvalNeeded) {
          // Approval is pending, profile creation will be handled after approval
          return
        }
      }

      // Proceed with profile creation
      const result = await createProfile({
        address: contracts.SENSE,
        abi: ABIS.SENSE,
        functionName: 'createProfile',
        args: [
          params.organizationId,
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
    if (!isConnected || !contracts.SENSE) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Claiming name with GAME token approval:', {
        profileId: params.profileId,
        name: params.name,
        gameDeposit: params.gameDeposit
      })

      // Handle GAME token approval for name claiming
      if (params.gameDeposit && parseFloat(params.gameDeposit) > 0) {
        console.log('🔍 GAME token deposit required for name claiming:', params.gameDeposit)

        const approvalNeeded = await handleTokenApproval({
          token: 'GAME',
          spender: contracts.SENSE,
          amount: params.gameDeposit,
          purpose: 'name claiming'
        })

        if (!approvalNeeded) {
          // Approval is pending, name claiming will be handled after approval
          return
        }
      }

      // Proceed with name claiming (update profile metadata)
      const result = await claimName({
        address: contracts.SENSE,
        abi: ABIS.SENSE,
        functionName: 'updateProfile',
        args: [
          params.profileId,
          JSON.stringify({ name: params.name }),
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
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getProfileByOwner',
      args: [address, organizationId],
      query: {
        enabled: !!address && !!contracts.SENSE && !!organizationId,
      },
    })
  }

  // Function to get profile information
  const getProfile = (profileId: string) => {
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getProfile',
      args: [profileId],
      query: {
        enabled: !!contracts.SENSE && !!profileId,
      },
    })
  }

  // Function to get reputation data
  const getReputation = (profileId: string) => {
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getReputation',
      args: [profileId],
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
