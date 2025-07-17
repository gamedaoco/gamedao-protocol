'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TransactionOverlay } from '@/components/ui/transaction-overlay'
import { useOrganizations, Organization } from '@/hooks/useOrganizations'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import { ABIS } from '@/lib/abis'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useGameTokenApproval } from '@/hooks/useGameTokenApproval'
import { useToast } from '@/hooks/useToast'
import { useMembership } from '@/hooks/useMembership'
import { toContractId } from '@/lib/id-utils'
import { AlertCircle, Shield, CreditCard, CheckCircle, Clock, UserPlus, UserMinus } from 'lucide-react'

interface JoinOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: Organization
  onSuccess?: () => void
  mode?: 'join' | 'leave'
}

export function JoinOrganizationModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
  mode = 'join'
}: JoinOrganizationModalProps) {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { refetch } = useOrganizations()
  const toast = useToast()

  // Check if user is already a member
  const { isMember } = useMembership(organization.id)

  const [isJoining, setIsJoining] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [leaveSuccess, setLeaveSuccess] = useState(false)
  const [pendingJoin, setPendingJoin] = useState(false)

  // Token approval for membership fee
  const {
    requestApproval,
    isApproving,
    isApprovalConfirming,
    approvalSuccess,
    approvalError,
    handleApproval
  } = useGameTokenApproval()

  // Organization joining/leaving contract calls
  const { writeContract: joinOrganization, isPending: isJoinPending } = useWriteContract()
  const { writeContract: leaveOrganization, isPending: isLeavePending } = useWriteContract()

  const membershipFee = organization.membershipFee || 0
  const isProcessing = isJoining || isLeaving || isApproving || isApprovalConfirming

  const handleJoin = async () => {
    if (!address || !organization) return

    setIsJoining(true)
    setJoinError(null)

    try {
      console.log('🚀 Joining organization:', {
        organizationId: organization.id,
        organizationName: organization.name,
        userAddress: address,
        contractAddress: contracts.CONTROL,
        membershipFee
      })

      // If there's a membership fee, handle GAME token approval first
      if (membershipFee > 0) {
        console.log('🔍 Membership fee detected:', membershipFee)

        const approvalNeeded = await handleApproval({
          spender: contracts.CONTROL,
          amount: membershipFee,
          purpose: 'organization membership'
        })

        if (!approvalNeeded) {
          // Approval is pending, join will be handled after approval
          setPendingJoin(true)
          return
        }
      }

      // Proceed with joining
      await proceedWithJoin()

    } catch (error) {
      console.error('❌ Failed to join organization:', error)
      setJoinError(error instanceof Error ? error.message : 'Failed to join organization')
      setIsJoining(false)
    }
  }

  const proceedWithJoin = async () => {
    try {
      await joinOrganization({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'addMember',
        args: [toContractId(organization.id), address],
      })

      setJoinSuccess(true)
      console.log('✅ Join transaction submitted')

      // Auto-close modal after success
      setTimeout(() => {
        handleClose()
        if (onSuccess) onSuccess()
      }, 2000)

    } catch (error) {
      console.error('❌ Join transaction failed:', error)
      setJoinError(error instanceof Error ? error.message : 'Failed to join organization')
    } finally {
      setIsJoining(false)
      setPendingJoin(false)
    }
  }

  const handleLeave = async () => {
    if (!address || !organization) return

    setIsLeaving(true)
    setLeaveError(null)

    try {
      await leaveOrganization({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'removeMember',
        args: [toContractId(organization.id), address],
      })

      setLeaveSuccess(true)
      console.log('✅ Leave transaction submitted')

      // Auto-close modal after success
      setTimeout(() => {
        handleClose()
        if (onSuccess) onSuccess()
      }, 2000)

    } catch (error) {
      console.error('❌ Failed to leave organization:', error)
      setLeaveError(error instanceof Error ? error.message : 'Failed to leave organization')
    } finally {
      setIsLeaving(false)
    }
  }

  const handleClose = () => {
    onClose()
    setJoinError(null)
    setLeaveError(null)
    setJoinSuccess(false)
    setLeaveSuccess(false)
    setPendingJoin(false)
  }

  const handleRetry = () => {
    if (mode === 'join') {
      setJoinError(null)
      setJoinSuccess(false)
      handleJoin()
    } else {
      setLeaveError(null)
      setLeaveSuccess(false)
      handleLeave()
    }
  }

  // Handle approval success
  useEffect(() => {
    if (approvalSuccess && pendingJoin) {
      console.log('✅ Approval successful, proceeding with join')
      proceedWithJoin()
    }
  }, [approvalSuccess, pendingJoin])

  // Handle approval error
  useEffect(() => {
    if (approvalError) {
      console.error('❌ Approval failed:', approvalError)
      setJoinError(approvalError.message || 'Token approval failed')
      setIsJoining(false)
      setPendingJoin(false)
    }
  }, [approvalError])

  if (!isConnected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Not Connected</DialogTitle>
            <DialogDescription>
              Please connect your wallet to {mode} this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const currentError = mode === 'join' ? joinError : leaveError
  const currentSuccess = mode === 'join' ? joinSuccess : leaveSuccess

  return (
    <>
      {/* Transaction Overlay */}
      <TransactionOverlay
        isVisible={isProcessing || currentSuccess}
        title={mode === 'join' ? 'Joining Organization' : 'Leaving Organization'}
        description={`Please wait while we ${mode === 'join' ? 'add you to' : 'remove you from'} ${organization.name}.`}
        currentStep={currentSuccess ? 'success' : isProcessing ? 'creating' : 'idle'}
        error={currentError}
        onRetry={handleRetry}
        onClose={handleClose}
        successMessage={`Successfully ${mode === 'join' ? 'joined' : 'left'} ${organization.name}!`}
        successAction={{
          label: mode === 'join' ? 'View Organization' : 'View Organizations',
          onClick: () => window.location.href = mode === 'join' ? `/control/${organization.id}` : '/control'
        }}
        showProgressBar={false}
      />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === 'join' ? <UserPlus className="h-5 w-5" /> : <UserMinus className="h-5 w-5" />}
              {mode === 'join' ? 'Join Organization' : 'Leave Organization'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'join'
                ? 'Review the organization details and requirements before joining.'
                : 'Are you sure you want to leave this organization?'
              }
            </DialogDescription>
          </DialogHeader>

          <div className={`space-y-6 ${isProcessing || currentSuccess ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{organization.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Creator</p>
                    <p className="font-mono">{formatAddress(organization.creator)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Members</p>
                    <p>{organization.memberCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Access Model</p>
                    <Badge variant="outline">
                      {organization.accessModel === 0 ? 'Open' :
                       organization.accessModel === 1 ? 'Invitation' : 'Application'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={organization.state === 1 ? 'default' : 'secondary'}>
                      {organization.state === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {mode === 'join' && membershipFee > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-medium">Membership Fee</span>
                    </div>
                    <p className="text-2xl font-bold">{membershipFee} GAME</p>
                    <p className="text-sm text-muted-foreground">
                      One-time fee required to join this organization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Membership Status */}
            {isMember && mode === 'join' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">You are already a member of this organization</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isProcessing}>
                Cancel
              </Button>

              {mode === 'join' ? (
                <Button
                  onClick={handleJoin}
                  disabled={isProcessing || isMember}
                  className="flex-1"
                >
                  {isProcessing ? 'Joining...' : isMember ? 'Already Member' : 'Join Organization'}
                </Button>
              ) : (
                <Button
                  onClick={handleLeave}
                  disabled={isProcessing || !isMember}
                  variant="destructive"
                  className="flex-1"
                >
                  {isProcessing ? 'Leaving...' : 'Leave Organization'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

