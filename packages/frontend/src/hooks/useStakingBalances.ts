'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { Address, erc20Abi, maxUint256 } from 'viem'

// Contract addresses from deployment
const GAME_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address
const USDC_TOKEN_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address
const GAME_STAKING_ADDRESS = '0x0B306BF915C4d645ff596e518fAf3F9669b97016' as Address

export function useStakingBalances() {
  const { address } = useAccount()
  const [isApproving, setIsApproving] = useState(false)
  const { writeContract, data: hash } = useWriteContract()

  // GAME Token Balance
  const { data: gameBalance, refetch: refetchGameBalance } = useReadContract({
    address: GAME_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // USDC Token Balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // GAME Token Allowance for Staking
  const { data: gameAllowance, refetch: refetchGameAllowance } = useReadContract({
    address: GAME_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, GAME_STAKING_ADDRESS] : undefined,
    query: { enabled: !!address }
  })

  // USDC Token Allowance for Campaigns (placeholder for now)
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: USDC_TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, GAME_STAKING_ADDRESS] : undefined, // This should be campaign contract
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
        address: GAME_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GAME_STAKING_ADDRESS, maxUint256],
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
        address: USDC_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GAME_STAKING_ADDRESS, maxUint256], // This should be campaign contract
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
