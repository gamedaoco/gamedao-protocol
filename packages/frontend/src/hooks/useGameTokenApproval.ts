import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { useToast } from './use-toast'

export interface GameTokenApprovalParams {
  spender: string
  amount: string | number
  purpose?: string
}

export interface GameTokenApprovalState {
  isApproving: boolean
  isApprovalConfirming: boolean
  approvalSuccess: boolean
  approvalError: Error | null
  currentAllowance: bigint
  needsApproval: boolean
}

export function useGameTokenApproval() {
  const { address } = useAccount()
  const { contracts } = useGameDAO()
  const toast = useToast()

  const [pendingApproval, setPendingApproval] = useState<GameTokenApprovalParams | null>(null)

  // Contract write for GAME token approval
  const {
    writeContract: approveGameToken,
    isPending: isApproving,
    data: approveTxHash,
    error: approveError,
    reset: resetApprove
  } = useWriteContract()

  // Wait for approval transaction confirmation
  const {
    isLoading: isApprovalConfirming,
    isSuccess: approvalSuccess,
    error: approveConfirmError,
  } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  })

  // Helper function to safely convert to BigInt
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

  // Function to get current allowance for a specific spender
  const useCurrentAllowance = (spender: string) => {
    return useReadContract({
      address: contracts.GAME_TOKEN,
      abi: ABIS.GAME_TOKEN,
      functionName: 'allowance',
      args: [address, spender],
      query: {
        enabled: !!address && !!contracts.GAME_TOKEN && !!spender,
      },
    })
  }

  // Function to check if approval is needed
  const checkApprovalNeeded = async (spender: string, amount: string | number): Promise<boolean> => {
    if (!address || !contracts.GAME_TOKEN || !spender) return false

    const amountBigInt = safeBigInt(amount)
    if (amountBigInt === BigInt(0)) return false

    try {
      // We need to make a direct contract call since we can't use hooks conditionally
      // This is a simplified check - in a real app you'd want to use a proper contract read
      console.log('🔍 Checking approval needed for:', { spender, amount: amountBigInt.toString() })

      // For now, assume approval is needed if amount > 0
      // This will be handled by the actual approval transaction
      return true
    } catch (error) {
      console.error('Error checking approval:', error)
      return true // Assume approval needed if we can't check
    }
  }

  // Function to request approval
  const requestApproval = async (params: GameTokenApprovalParams) => {
    if (!address || !contracts.GAME_TOKEN) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    const { spender, amount, purpose = 'token approval' } = params
    const amountBigInt = safeBigInt(amount)

    if (amountBigInt === BigInt(0)) {
      throw new Error('Amount must be greater than 0')
    }

    console.log('🔍 Requesting GAME token approval:', {
      spender,
      amount: amountBigInt.toString(),
      purpose
    })

    try {
      toast.loading(`Requesting GAME token approval for ${purpose}...`)

      const result = await approveGameToken({
        address: contracts.GAME_TOKEN,
        abi: ABIS.GAME_TOKEN,
        functionName: 'approve',
        args: [spender, amountBigInt],
      })

      console.log('🎉 GAME token approval transaction submitted:', result)
      setPendingApproval(params)
      return result
    } catch (error) {
      console.error('❌ Failed to request approval:', error)
      toast.error(`Failed to request ${purpose} approval`)
      throw error
    }
  }

  // Function to handle approval with automatic checking
  const handleApproval = async (params: GameTokenApprovalParams): Promise<boolean> => {
    const { spender, amount, purpose = 'token approval' } = params

    try {
      // Check if approval is needed
      const needsApproval = await checkApprovalNeeded(spender, amount)

      if (!needsApproval) {
        console.log('✅ GAME token allowance already sufficient')
        return true
      }

      // Request approval
      await requestApproval(params)
      return false // Approval pending, will be handled by useEffect
    } catch (error) {
      console.error('❌ Failed to handle approval:', error)
      throw error
    }
  }

  // Handle approval success
  useEffect(() => {
    if (approvalSuccess && pendingApproval) {
      console.log('✅ GAME token approval confirmed for:', pendingApproval.purpose)
      toast.dismiss()
      toast.success(`${pendingApproval.purpose} approval confirmed!`)
      setPendingApproval(null)
      resetApprove()
    }
  }, [approvalSuccess, pendingApproval, resetApprove, toast])

  // Handle approval error
  useEffect(() => {
    if ((approveError || approveConfirmError) && pendingApproval) {
      const error = approveError || approveConfirmError
      console.error('❌ GAME token approval failed:', error)
      toast.dismiss()
      toast.error(`${pendingApproval.purpose} approval failed`)
      setPendingApproval(null)
    }
  }, [approveError, approveConfirmError, pendingApproval, toast])

  return {
    // State
    isApproving,
    isApprovalConfirming,
    approvalSuccess,
    approvalError: approveError || approveConfirmError,
    pendingApproval,

    // Functions
    requestApproval,
    handleApproval,
    checkApprovalNeeded,
    useCurrentAllowance,
    resetApprove,

    // Utilities
    safeBigInt,
  }
}
