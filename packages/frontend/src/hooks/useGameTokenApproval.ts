import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { useToast } from './useToast'
import { parseTokenAmount } from '@/lib/tokenUtils'
import { readContract } from 'viem/actions'

export interface GameTokenApprovalParams {
  spender: `0x${string}`
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
  const publicClient = usePublicClient()

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

  // Helper function to safely convert GAME token amounts to BigInt
  const safeBigInt = (value: string | number, fallback = '0'): bigint => {
    return parseTokenAmount(value, 'GAME', fallback)
  }

  // Function to get current allowance for a specific spender
  const useCurrentAllowance = (spender: `0x${string}`) => {
    return useReadContract({
      address: contracts.GAME_TOKEN as `0x${string}`,
      abi: ABIS.GAME_TOKEN,
      functionName: 'allowance',
      args: [address as `0x${string}`, spender],
      query: {
        enabled: !!address && !!contracts.GAME_TOKEN && !!spender,
      },
    })
  }

  // Function to check if approval is needed
  const checkApprovalNeeded = async (spender: `0x${string}`, amount: string | number): Promise<boolean> => {
    if (!address || !contracts.GAME_TOKEN || !spender) return false

    const amountBigInt = safeBigInt(amount)
    if (amountBigInt === BigInt(0)) return false

    try {
      // Check if we have a public client available
      if (!publicClient) {
        console.warn('No public client available, assuming approval needed')
        return true
      }

      // Read current allowance from the contract
      const currentAllowance = await readContract(publicClient, {
        address: contracts.GAME_TOKEN as `0x${string}`,
        abi: ABIS.GAME_TOKEN,
        functionName: 'allowance',
        args: [address as `0x${string}`, spender],
      }) as bigint

      // Check if current allowance is sufficient
      const needsApproval = currentAllowance < amountBigInt

      return needsApproval
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

    try {
      toast.loading(`Requesting GAME token approval for ${purpose}...`)

      const result = await approveGameToken({
        address: contracts.GAME_TOKEN,
        abi: ABIS.GAME_TOKEN,
        functionName: 'approve',
        args: [spender, amountBigInt],
      })

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
      toast.dismiss()
      toast.success(`${pendingApproval.purpose} approval confirmed!`)
      setPendingApproval(null)
      resetApprove()
    }
  }, [approvalSuccess, pendingApproval, resetApprove])

  // Handle approval error
  useEffect(() => {
    if ((approveError || approveConfirmError) && pendingApproval) {
      const error = approveError || approveConfirmError
      console.error('❌ GAME token approval failed:', error)
      toast.dismiss()
      toast.error(`${pendingApproval.purpose} approval failed`)
      setPendingApproval(null)
    }
  }, [approveError, approveConfirmError, pendingApproval])

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
