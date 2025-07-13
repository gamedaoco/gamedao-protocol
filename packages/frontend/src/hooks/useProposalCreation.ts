'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useGameDAO } from './useGameDAO'
import { useProposals } from './useProposals'
import { useGameTokenApproval } from './useGameTokenApproval'
import { useToast } from './useToast'

export interface ProposalCreationParams {
  organizationId: string
  title: string
  description: string
  proposalType: number
  votingType: number
  votingPeriod: number
  gameDeposit: string
}

export interface ProposalCreationState {
  isCreating: boolean
  progress: string
  currentStep: 'idle' | 'approving' | 'creating' | 'confirming' | 'success' | 'error'
  error: string | null
  createdProposalId: string | null
}

export function useProposalCreation() {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { createProposal, createSuccess, createError } = useProposals()
  const { requestApproval, isApproving, isApprovalConfirming, approvalSuccess, approvalError } = useGameTokenApproval()
  const toast = useToast()

  const [state, setState] = useState<ProposalCreationState>({
    isCreating: false,
    progress: '',
    currentStep: 'idle',
    error: null,
    createdProposalId: null
  })

  const [pendingCreation, setPendingCreation] = useState<ProposalCreationParams | null>(null)
  const [approvalCompleted, setApprovalCompleted] = useState(false)

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isCreating: false,
      progress: '',
      currentStep: 'idle',
      error: null,
      createdProposalId: null
    })
    setPendingCreation(null)
    setApprovalCompleted(false)
  }, [])

  // Handle approval success
  useEffect(() => {
    if (approvalSuccess && !approvalCompleted && pendingCreation) {
      console.log('✅ GAME token approval confirmed! Proceeding with proposal creation...')
      setApprovalCompleted(true)

      setState(prev => ({
        ...prev,
        currentStep: 'creating',
        progress: 'Creating proposal on blockchain...'
      }))

      // Proceed with proposal creation
      createProposal({
        organizationId: pendingCreation.organizationId,
        title: pendingCreation.title,
        description: pendingCreation.description,
        proposalType: pendingCreation.proposalType,
        votingType: pendingCreation.votingType,
        votingPeriod: pendingCreation.votingPeriod,
        gameDeposit: pendingCreation.gameDeposit
      })
        .then(() => {
          console.log('✅ Proposal creation initiated after approval')
          setState(prev => ({
            ...prev,
            currentStep: 'confirming',
            progress: 'Waiting for transaction confirmation...'
          }))
        })
        .catch((error) => {
          console.error('❌ Proposal creation failed after approval:', error)
          setState(prev => ({
            ...prev,
            currentStep: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: ''
          }))
        })
    }
  }, [approvalSuccess, approvalCompleted, pendingCreation, createProposal])

  // Handle proposal creation success
  useEffect(() => {
    if (createSuccess && state.currentStep === 'confirming') {
      console.log('🎉 Proposal created successfully!')
      setState(prev => ({
        ...prev,
        currentStep: 'success',
        progress: 'Proposal created successfully!',
        isCreating: false
      }))

      // Reset pending states
      setApprovalCompleted(false)
      setPendingCreation(null)

      toast.success('Proposal created successfully!')
    }
  }, [createSuccess, state.currentStep, toast])

  // Handle proposal creation error
  useEffect(() => {
    if (createError && state.currentStep === 'confirming') {
      console.error('❌ Proposal creation failed:', createError)
      setState(prev => ({
        ...prev,
        currentStep: 'error',
        error: createError.message || 'Failed to create proposal',
        progress: '',
        isCreating: false
      }))
    }
  }, [createError, state.currentStep])

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

  const createProposalWithApproval = useCallback(async (params: ProposalCreationParams) => {
    if (!isConnected || !contracts) {
      throw new Error('Wallet not connected or contracts not loaded')
    }

    console.log('🚀 Starting proposal creation process...')
    console.log('📋 Parameters:', params)

    // Reset state
    resetState()

    setState(prev => ({
      ...prev,
      isCreating: true,
      currentStep: 'approving',
      progress: 'Preparing proposal creation...'
    }))

    try {
      // Check if GAME token approval is needed
      const gameDeposit = parseFloat(params.gameDeposit)

      if (gameDeposit > 0) {
        setState(prev => ({
          ...prev,
          currentStep: 'approving',
          progress: 'Requesting GAME token approval...'
        }))

        console.log('📤 Requesting GAME token approval for proposal creation:', {
          gameDeposit: params.gameDeposit,
          spender: contracts.SIGNAL
        })

        // Store the proposal parameters to create after approval
        setPendingCreation(params)

        try {
          await requestApproval({
            spender: contracts.SIGNAL,
            amount: params.gameDeposit,
            purpose: 'proposal creation'
          })
          console.log('✅ GAME token approval requested!')
          // Proposal creation will continue in the approval success effect
        } catch (error) {
          console.error('❌ GAME token approval failed:', error)
          throw new Error(`GAME token approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        // No approval needed, create proposal directly
        setState(prev => ({
          ...prev,
          currentStep: 'creating',
          progress: 'Creating proposal on blockchain...'
        }))

        await createProposal({
          organizationId: params.organizationId,
          title: params.title,
          description: params.description,
          proposalType: params.proposalType,
          votingType: params.votingType,
          votingPeriod: params.votingPeriod,
          gameDeposit: params.gameDeposit
        })

        console.log('✅ createProposal call completed!')

        setState(prev => ({
          ...prev,
          currentStep: 'confirming',
          progress: 'Waiting for transaction confirmation...'
        }))
      }

    } catch (error) {
      console.error('❌ Failed to create proposal:', error)
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
  }, [isConnected, contracts, createProposal, requestApproval, resetState])

  // TODO: Add success handling when proposal creation is confirmed
  // This would need to be integrated with the useProposals hook to detect when
  // the proposal creation transaction is confirmed

  return {
    // State
    ...state,
    isApproving: isApproving || isApprovalConfirming,

    // Actions
    createProposalWithApproval,
    resetState,

    // Computed state
    canCreate: isConnected && contracts && !state.isCreating,
    isProcessing: state.isCreating || isApproving || isApprovalConfirming,
  }
}
