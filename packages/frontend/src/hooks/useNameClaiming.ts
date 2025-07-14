'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { ABIS } from '@/lib/abis'
import { parseEther } from 'viem'

export interface NameClaim {
  name: string
  owner: string
  stakeAmount: string
  stakeDuration: number
  claimedAt: number
  expiresAt: number
  isActive: boolean
  nameType: 'PERSONAL' | 'ORGANIZATION'
}

export interface NameClaimingParams {
  name: string
  stakeAmount: string
  stakeDuration: number
  nameType: 'PERSONAL' | 'ORGANIZATION'
}

export interface NameValidation {
  isValid: boolean
  isAvailable: boolean
  error?: string
  suggestion?: string
}

export function useNameClaiming() {
  const { address } = useAccount()
  const { contracts, isConnected } = useGameDAO()
  const { gameBalance } = useTokenBalances()

  const [validation] = useState<NameValidation>({ isValid: false, isAvailable: false })
  const [isValidating] = useState(false)

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

  // Contract write for releasing name
  const {
    writeContract: releaseName,
    isPending: isReleasingName,
    data: releaseNameTxHash,
    error: releaseNameError,
    reset: resetReleaseName
  } = useWriteContract()

  // Wait for release name transaction confirmation
  const {
    isLoading: isReleaseNameConfirming,
    isSuccess: releaseNameSuccess,
    error: releaseNameConfirmError,
  } = useWaitForTransactionReceipt({
    hash: releaseNameTxHash,
  })

  // Validate name format (8 characters, alphanumeric)
  const validateNameFormat = (name: string): boolean => {
    const nameRegex = /^[A-Z0-9]{8}$/
    return nameRegex.test(name.toUpperCase())
  }

  // Get names owned by user
  const useGetUserNames = () => {
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getNamesOwnedBy',
      args: [address],
      query: {
        enabled: !!contracts.SENSE && !!address,
      },
    })
  }

  // Check if name is available
  const useCheckNameAvailability = (name: string) => {
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'isNameAvailable',
      args: [name],
      query: {
        enabled: !!contracts.SENSE && !!name && validateNameFormat(name),
      },
    })
  }

  // Get name claim details
  const useGetNameClaim = (name: string) => {
    return useReadContract({
      address: contracts.SENSE,
      abi: ABIS.SENSE,
      functionName: 'getNameClaim',
      args: [name],
      query: {
        enabled: !!contracts.SENSE && !!name,
      },
    })
  }

  // Validate name with comprehensive checks
  const validateName = async (name: string): Promise<NameValidation> => {
    if (!name) {
      return { isValid: false, isAvailable: false }
    }

    // Format validation
    if (!validateNameFormat(name)) {
      return {
        isValid: false,
        isAvailable: false,
        error: 'Name must be exactly 8 characters (A-Z, 0-9 only)',
        suggestion: name.length < 8 ? 'Add more characters' : 'Remove extra characters'
      }
    }

            // For now, just return valid format check
        // Actual availability check would be done in the component using useCheckNameAvailability

    return {
      isValid: true,
      isAvailable: true
    }
  }

  // Claim a name
  const handleClaimName = async (params: NameClaimingParams) => {
    if (!isConnected || !contracts.SENSE) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Claiming name:', params)

      // Validate parameters
      if (!validateNameFormat(params.name)) {
        throw new Error('Invalid name format')
      }

      const stakeAmountWei = parseEther(params.stakeAmount)
      const nameTypeIndex = params.nameType === 'PERSONAL' ? 0 : 1

      // Convert name to bytes8
      const nameBytes8 = stringToBytes8(params.name)

      const result = await claimName({
        address: contracts.SENSE,
        abi: ABIS.SENSE,
        functionName: 'claimName',
        args: [
          nameBytes8,
          stakeAmountWei,
          BigInt(params.stakeDuration),
          nameTypeIndex,
        ],
      })

      return result
    } catch (error) {
      console.error('❌ Failed to claim name:', error)
      throw error
    }
  }

  // Release a name
  const handleReleaseName = async (name: string) => {
    if (!isConnected || !contracts.SENSE) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    try {
      console.log('🔍 Releasing name:', name)

      // Convert name to bytes8
      const nameBytes8 = stringToBytes8(name)

      const result = await releaseName({
        address: contracts.SENSE,
        abi: ABIS.SENSE,
        functionName: 'releaseName',
        args: [nameBytes8],
      })

      return result
    } catch (error) {
      console.error('❌ Failed to release name:', error)
      throw error
    }
  }

  // Check if user can afford staking
  const canAffordStaking = (stakeAmount: string): boolean => {
    const requiredAmount = parseFloat(stakeAmount)
    const availableAmount = parseFloat(gameBalance.balance)
    return availableAmount >= requiredAmount
  }

  // Get suggested stake amounts based on tiers
  const getStakingTiers = () => {
    return [
      {
        name: 'Basic',
        gameAmount: '100',
        duration: 30 * 24 * 60 * 60, // 30 days in seconds
        benefits: ['Name reservation', 'Basic profile features'],
        multiplier: 1,
        color: 'text-gray-600',
      },
      {
        name: 'Premium',
        gameAmount: '500',
        duration: 90 * 24 * 60 * 60, // 90 days in seconds
        benefits: ['Name reservation', 'Premium profile features', 'Priority support'],
        multiplier: 1.5,
        color: 'text-blue-600',
      },
      {
        name: 'Elite',
        gameAmount: '1000',
        duration: 180 * 24 * 60 * 60, // 180 days in seconds
        benefits: ['Name reservation', 'Elite profile features', 'Priority support', 'Exclusive badges'],
        multiplier: 2,
        color: 'text-purple-600',
      }
    ]
  }

  // Helper function to convert string to bytes8
  const stringToBytes8 = (str: string): `0x${string}` => {
    // Ensure string is exactly 8 characters and uppercase
    const normalizedStr = str.toUpperCase().padEnd(8, '\0').slice(0, 8)

    // Convert to hex bytes
    let hex = '0x'
    for (let i = 0; i < 8; i++) {
      const charCode = normalizedStr.charCodeAt(i)
      hex += charCode.toString(16).padStart(2, '0')
    }

    return hex as `0x${string}`
  }

  // Helper function to convert bytes8 to string
  const bytes8ToString = (bytes8: `0x${string}`): string => {
    // Remove 0x prefix
    const hex = bytes8.slice(2)

    // Convert hex pairs to characters
    let result = ''
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.slice(i, i + 2), 16)
      if (charCode !== 0) { // Skip null characters
        result += String.fromCharCode(charCode)
      }
    }

    return result
  }

  // Format stake duration for display
  const formatStakeDuration = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    if (days < 365) {
      const months = Math.floor(days / 30)
      return months === 1 ? '1 month' : `${months} months`
    }
    const years = Math.floor(days / 365)
    return years === 1 ? '1 year' : `${years} years`
  }

  return {
    // State
    validation,
    isValidating,

    // Actions
    validateName,
    handleClaimName,
    handleReleaseName,
    canAffordStaking,

    // Queries
    useCheckNameAvailability,
    useGetNameClaim,
    useGetUserNames,

    // Transaction states
    isClaimingName: isClaimingName || isClaimNameConfirming,
    claimNameSuccess,
    claimNameError: claimNameError || claimNameConfirmError,
    resetClaimName,

    isReleasingName: isReleasingName || isReleaseNameConfirming,
    releaseNameSuccess,
    releaseNameError: releaseNameError || releaseNameConfirmError,
    resetReleaseName,

    // Utilities
    getStakingTiers,
    validateNameFormat,
    stringToBytes8,
    bytes8ToString,
    formatStakeDuration,
  }
}
