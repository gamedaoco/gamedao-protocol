'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { useOrganizations } from './useOrganizations'
import { useGameTokenApproval } from './useGameTokenApproval'
import { useToast } from './useToast'
// Token utilities are handled by the underlying hooks
import { uploadFileToIPFS, uploadOrganizationMetadata } from '@/lib/ipfs'

export interface OrganizationCreationParams {
  name: string
  description: string
  longDescription?: string
  website?: string
  twitter?: string
  discord?: string
  github?: string
  tags?: string
  orgType: number
  accessModel: number
  feeModel: number
  memberLimit: number
  membershipFee: string
  stakeAmount: string
  profileImage?: File
  bannerImage?: File
}

export interface OrganizationCreationState {
  isCreating: boolean
  progress: string
  currentStep: 'idle' | 'uploading' | 'approving' | 'creating' | 'confirming' | 'success' | 'error'
  error: string | null
  createdOrgId: string | null
}

export function useOrganizationCreation() {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { createOrganization, isCreating, createSuccess, createError, createdOrgId } = useOrganizations()
  const { requestApproval, isApproving, isApprovalConfirming, approvalSuccess, approvalError } = useGameTokenApproval()
  // TODO: Add proper membership setup after fixing contract address typing issues
  const toast = useToast()

  const [state, setState] = useState<OrganizationCreationState>({
    isCreating: false,
    progress: '',
    currentStep: 'idle',
    error: null,
    createdOrgId: null
  })

  const [pendingCreation, setPendingCreation] = useState<any>(null)
  const [approvalCompleted, setApprovalCompleted] = useState(false)

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isCreating: false,
      progress: '',
      currentStep: 'idle',
      error: null,
      createdOrgId: null
    })
    setPendingCreation(null)
    setApprovalCompleted(false)
  }, [])

  // Handle approval success
  useEffect(() => {
    if (approvalSuccess && !approvalCompleted && pendingCreation) {
      console.log('✅ GAME token approval confirmed! Proceeding with organization creation...')
      setApprovalCompleted(true)

      setState(prev => ({
        ...prev,
        currentStep: 'creating',
        progress: 'Creating organization on blockchain...'
      }))

      createOrganization(pendingCreation)
        .then(() => {
          console.log('✅ Organization creation initiated after approval')
          setState(prev => ({
            ...prev,
            currentStep: 'confirming',
            progress: 'Waiting for transaction confirmation...'
          }))
        })
        .catch((error) => {
          console.error('❌ Organization creation failed after approval:', error)
          setState(prev => ({
            ...prev,
            currentStep: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: ''
          }))
        })
    }
  }, [approvalSuccess, approvalCompleted, pendingCreation, createOrganization])

      // Handle creation success
  useEffect(() => {
    if (createSuccess && createdOrgId && address) {
      console.log('🎉 Organization created successfully! ID:', createdOrgId)

      setState(prev => ({
        ...prev,
        currentStep: 'success',
        progress: 'Organization created successfully!',
        createdOrgId,
        isCreating: false
      }))

      toast.success('Organization created successfully!')

      // Reset pending states
      setApprovalCompleted(false)
      setPendingCreation(null)
    }
  }, [createSuccess, createdOrgId, address])

  // Handle creation error
  useEffect(() => {
    if (createError) {
      console.error('❌ Organization creation failed:', createError)
      setState(prev => ({
        ...prev,
        currentStep: 'error',
        error: createError.message || 'Failed to create organization',
        progress: '',
        isCreating: false
      }))
    }
  }, [createError])

  // Handle approval error
  useEffect(() => {
    if (approvalError) {
      console.error('❌ Token approval failed:', approvalError)
      setState(prev => ({
        ...prev,
        currentStep: 'error',
        error: approvalError.message || 'Token approval failed',
        progress: '',
        isCreating: false
      }))
    }
  }, [approvalError])

  const createOrganizationWithApproval = useCallback(async (params: OrganizationCreationParams) => {
    if (!isConnected || !contracts) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    console.log('🚀 Starting organization creation process...')
    console.log('📋 Parameters:', params)

    // Reset state
    resetState()

    setState(prev => ({
      ...prev,
      isCreating: true,
      currentStep: 'uploading',
      progress: 'Preparing metadata...'
    }))

    try {
      // Upload images to IPFS first
      let profileImageUrl = ''
      let bannerImageUrl = ''

      if (params.profileImage) {
        setState(prev => ({ ...prev, progress: 'Uploading profile image to IPFS...' }))
        console.log('📤 Uploading profile image...')

        const result = await uploadFileToIPFS(params.profileImage, {
          name: `${params.name} Profile Image`,
          description: `Profile image for ${params.name} organization`
        })
        profileImageUrl = result.url
        console.log('✅ Profile image uploaded:', result.url)
      }

      if (params.bannerImage) {
        setState(prev => ({ ...prev, progress: 'Uploading banner image to IPFS...' }))
        console.log('📤 Uploading banner image...')

        const result = await uploadFileToIPFS(params.bannerImage, {
          name: `${params.name} Banner Image`,
          description: `Banner image for ${params.name} organization`
        })
        bannerImageUrl = result.url
        console.log('✅ Banner image uploaded:', result.url)
      }

      // Create metadata object
      const metadata = {
        name: params.name,
        description: params.description,
        longDescription: params.longDescription || '',
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl,
        website: params.website || '',
        social: {
          twitter: params.twitter || '',
          discord: params.discord || '',
          github: params.github || ''
        },
        tags: params.tags ? params.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      }

      console.log('📋 Created metadata object:', metadata)

      // Upload metadata to IPFS
      setState(prev => ({ ...prev, progress: 'Uploading metadata to IPFS...' }))
      console.log('📤 Uploading metadata to IPFS...')

      const metadataResult = await uploadOrganizationMetadata(metadata)
      console.log('✅ Metadata uploaded:', metadataResult.url)

      // Prepare contract parameters
      const contractParams = {
        name: params.name,
        metadataURI: metadataResult.url,
        orgType: params.orgType,
        accessModel: params.accessModel,
        feeModel: params.feeModel,
        memberLimit: params.memberLimit,
        membershipFee: params.membershipFee,
        gameStakeRequired: params.stakeAmount,
      }

      console.log('📋 Final contract parameters:', contractParams)

      // Check if GAME token approval is needed
      const stakeAmount = parseFloat(params.stakeAmount)
      const membershipFee = parseFloat(params.membershipFee)
      const totalAmount = stakeAmount + membershipFee

      if (totalAmount > 0) {
        setState(prev => ({
          ...prev,
          currentStep: 'approving',
          progress: 'Requesting GAME token approval...'
        }))

        console.log('📤 Requesting GAME token approval for total amount:', {
          stakeAmount: params.stakeAmount,
          membershipFee: params.membershipFee,
          totalAmount: totalAmount.toString()
        })

        // Store the organization parameters to create after approval
        setPendingCreation(contractParams)

        try {
          await requestApproval({
            spender: contracts.STAKING,
            amount: totalAmount.toString(),
            purpose: 'organization creation'
          })
          console.log('✅ GAME token approval requested!')
          // Organization creation will continue in the approval success effect
        } catch (error) {
          console.error('❌ GAME token approval failed:', error)
          throw new Error(`GAME token approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        // No approval needed, create organization directly
        setState(prev => ({
          ...prev,
          currentStep: 'creating',
          progress: 'Creating organization on blockchain...'
        }))

        await createOrganization(contractParams)
        console.log('✅ createOrganization call completed!')

        setState(prev => ({
          ...prev,
          currentStep: 'confirming',
          progress: 'Waiting for transaction confirmation...'
        }))
      }

    } catch (error) {
      console.error('❌ Failed to create organization:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      setState(prev => ({
        ...prev,
        currentStep: 'error',
        error: errorMessage,
        progress: '',
        isCreating: false
      }))

      throw error
    }
  }, [isConnected, contracts, createOrganization, requestApproval, resetState])

  return {
    // State
    ...state,
    isApproving: isApproving || isApprovalConfirming,

    // Actions
    createOrganizationWithApproval,
    resetState,

    // Computed state
    canCreate: isConnected && contracts && !state.isCreating,
    isProcessing: state.isCreating || isCreating || isApproving || isApprovalConfirming,
  }
}
