import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { ABIS } from '@/lib/abis'
import { useToast } from './useToast'
import { readContract } from 'viem/actions'

export interface TokenApprovalParams {
  token: 'GAME' | 'USDC'
  spender: string
  amount: string | number
  purpose?: string
}

export function useTokenApproval() {
  const { address } = useAccount()
  const { contracts } = useGameDAO()
  const toast = useToast()
  const publicClient = usePublicClient()

  const [pendingApproval, setPendingApproval] = useState<TokenApprovalParams | null>(null)

  // Contract write for token approval
  const {
    writeContract: approveToken,
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

  // Function to get token contract address
  const getTokenAddress = (token: 'GAME' | 'USDC') => {
    return token === 'GAME' ? contracts.GAME_TOKEN : contracts.USDC_TOKEN
  }

  // Function to get token ABI
  const getTokenABI = (token: 'GAME' | 'USDC') => {
    return token === 'GAME' ? ABIS.GAME_TOKEN : ABIS.USDC
  }

  // Function to get current allowance for a specific token and spender
  const useCurrentAllowance = (token: 'GAME' | 'USDC', spender: string) => {
    const tokenAddress = getTokenAddress(token)
    const tokenABI = getTokenABI(token)

    return useReadContract({
      address: tokenAddress,
      abi: tokenABI,
      functionName: 'allowance',
      args: [address, spender],
      query: {
        enabled: !!address && !!tokenAddress && !!spender,
      },
    })
  }

  // Function to check if approval is needed
  const checkApprovalNeeded = async (token: 'GAME' | 'USDC', spender: string, amount: string | number): Promise<boolean> => {
    if (!address || !spender) return false

    const tokenAddress = getTokenAddress(token)
    if (!tokenAddress) return false

    const amountBigInt = safeBigInt(amount)
    if (amountBigInt === BigInt(0)) return false

    try {
      console.log('🔍 Checking approval needed for:', { token, spender, amount: amountBigInt.toString() })

      // Check if we have a public client available
      if (!publicClient) {
        console.warn('No public client available, assuming approval needed')
        return true
      }

      // Read current allowance from the contract
      const currentAllowance = await readContract(publicClient, {
        address: tokenAddress,
        abi: getTokenABI(token),
        functionName: 'allowance',
        args: [address, spender],
      }) as bigint

      console.log('🔍 Current allowance:', {
        token,
        spender,
        currentAllowance: currentAllowance.toString(),
        requiredAmount: amountBigInt.toString(),
        needsApproval: currentAllowance < amountBigInt
      })

      // Check if current allowance is sufficient
      const needsApproval = currentAllowance < amountBigInt

      if (!needsApproval) {
        console.log(`✅ ${token} token allowance already sufficient: ${currentAllowance.toString()} >= ${amountBigInt.toString()}`)
      } else {
        console.log(`❌ ${token} token approval needed: ${currentAllowance.toString()} < ${amountBigInt.toString()}`)
      }

      return needsApproval
    } catch (error) {
      console.error('Error checking approval:', error)
      return true // Assume approval needed if we can't check
    }
  }

  // Function to request approval
  const requestApproval = async (params: TokenApprovalParams) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    const { token, spender, amount, purpose = 'token approval' } = params
    const tokenAddress = getTokenAddress(token)
    const tokenABI = getTokenABI(token)

    if (!tokenAddress) {
      throw new Error(`${token} token contract not found`)
    }

    const amountBigInt = safeBigInt(amount)

    if (amountBigInt === BigInt(0)) {
      throw new Error('Amount must be greater than 0')
    }

    console.log('🔍 Requesting token approval:', {
      token,
      spender,
      amount: amountBigInt.toString(),
      purpose
    })

    try {
      toast.loading(`Requesting ${token} token approval for ${purpose}...`)

      const result = await approveToken({
        address: tokenAddress,
        abi: tokenABI,
        functionName: 'approve',
        args: [spender, amountBigInt],
      })

      console.log('🎉 Token approval transaction submitted:', result)
      setPendingApproval(params)
      return result
    } catch (error) {
      console.error('❌ Failed to request approval:', error)
      toast.error(`Failed to request ${token} ${purpose} approval`)
      throw error
    }
  }

  // Function to handle approval with automatic checking
  const handleApproval = async (params: TokenApprovalParams): Promise<boolean> => {
    const { token, spender, amount, purpose = 'token approval' } = params

    try {
      // Check if approval is needed
      const needsApproval = await checkApprovalNeeded(token, spender, amount)

      if (!needsApproval) {
        console.log(`✅ ${token} token allowance already sufficient`)
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
      console.log('✅ Token approval confirmed for:', pendingApproval.purpose)
      toast.dismiss()
      toast.success(`${pendingApproval.token} ${pendingApproval.purpose} approval confirmed!`)
      setPendingApproval(null)
      resetApprove()
    }
  }, [approvalSuccess, pendingApproval, resetApprove])

  // Handle approval error
  useEffect(() => {
    if ((approveError || approveConfirmError) && pendingApproval) {
      const error = approveError || approveConfirmError
      console.error('❌ Token approval failed:', error)
      toast.dismiss()
      toast.error(`${pendingApproval.token} ${pendingApproval.purpose} approval failed`)
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
    getTokenAddress,
    getTokenABI,
  }
}
