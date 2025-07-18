'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { Address, erc20Abi, maxUint256 } from 'viem'
import { useContracts } from './useContracts'

export function useStakingBalances() {
  const { address } = useAccount()
  const { gameToken, usdcToken, staking } = useContracts()
  const [isApproving, setIsApproving] = useState(false)
  const { writeContract, data: hash } = useWriteContract()

  // GAME Token Balance
  const { data: gameBalance, refetch: refetchGameBalance } = useReadContract({
    address: gameToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // USDC Token Balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // GAME Token Allowance for Staking
  const { data: gameAllowance, refetch: refetchGameAllowance } = useReadContract({
    address: gameToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, staking as Address] : undefined,
    query: { enabled: !!address }
  })

  // USDC Token Allowance for Campaigns (placeholder for now)
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: usdcToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, staking as Address] : undefined, // This should be campaign contract
    query: { enabled: !!address }
  })

  // Wait for transaction confirmation
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // Approve GAME tokens for staking
  const approveGame = async () => {
    if (!address) return

    setIsApproving(true)
    try {
      writeContract({
        address: gameToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [staking as Address, maxUint256],
      })
    } catch (error) {
      console.error('Error approving GAME:', error)
      setIsApproving(false)
    }
  }

  // Approve USDC tokens for campaigns
  const approveUsdc = async () => {
    if (!address) return

    setIsApproving(true)
    try {
      writeContract({
        address: usdcToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [staking as Address, maxUint256], // This should be campaign contract
      })
    } catch (error) {
      console.error('Error approving USDC:', error)
      setIsApproving(false)
    }
  }

  // Refetch balances and allowances after transaction confirmation
  useEffect(() => {
    if (hash && !isConfirming) {
      // Transaction confirmed, refetch data
      refetchGameBalance()
      refetchUsdcBalance()
      refetchGameAllowance()
      refetchUsdcAllowance()
      setIsApproving(false)
    }
  }, [hash, isConfirming, refetchGameBalance, refetchUsdcBalance, refetchGameAllowance, refetchUsdcAllowance])

  const isLoading = !address || (!gameBalance && !usdcBalance)

  return {
    gameBalance,
    usdcBalance,
    gameAllowance,
    usdcAllowance,
    isLoading,
    approveGame,
    approveUsdc,
    isApproving: isApproving || isConfirming,
    refetchBalances: () => {
      refetchGameBalance()
      refetchUsdcBalance()
      refetchGameAllowance()
      refetchUsdcAllowance()
    }
  }
}
