'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useOrganizations, Organization } from '@/hooks/useOrganizations'
import { useAccount, useWriteContract } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import { ABIS } from '@/lib/abis'
import { useGameDAO } from '@/hooks/useGameDAO'
import { AlertCircle, Users, Shield, CreditCard, CheckCircle, Clock, UserPlus } from 'lucide-react'

interface JoinOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: Organization
  onSuccess?: () => void
}

export function JoinOrganizationModal({ isOpen, onClose, organization, onSuccess }: JoinOrganizationModalProps) {
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { getAccessModelString, refetch } = useOrganizations()

  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)

  const {
    writeContract: joinOrganization,
    isPending: isWritePending,
    isSuccess: writeSuccess,
    error: writeError
  } = useWriteContract()

  const handleJoin = async () => {
    if (!address || !organization) return

    setIsJoining(true)
    setJoinError(null)

    try {
      console.log('🚀 Joining organization:', {
        organizationId: organization.id,
        organizationName: organization.name,
        userAddress: address,
        contractAddress: contracts.CONTROL
      })

      joinOrganization({
        address: contracts.CONTROL,
        abi: ABIS.CONTROL,
        functionName: 'addMember',
        args: [organization.id, address],
      })

      console.log('✅ Join transaction submitted, waiting for confirmation...')

    } catch (error: any) {
      console.error('❌ Failed to join organization:', error)
      setJoinError(error.message || 'Failed to join organization')
      setIsJoining(false)
    }
  }

  // Handle transaction success
  useEffect(() => {
    if (writeSuccess) {
      console.log('🎉 Successfully joined organization!')
      setJoinSuccess(true)
      setIsJoining(false)

      // Wait a moment then refetch data and close
      setTimeout(() => {
        refetch()
        if (onSuccess) onSuccess()
        onClose()

        // Reset state
        setJoinSuccess(false)
      }, 2000)
    }
  }, [writeSuccess, refetch, onSuccess, onClose])

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      console.error('❌ Transaction failed:', writeError)
      setJoinError(writeError.message || 'Transaction failed')
      setIsJoining(false)
    }
  }, [writeError])

  const getAccessModelDescription = (accessModel: number) => {
    switch (accessModel) {
      case 0:
        return {
          title: 'Open Access',
          description: 'You can join this organization instantly.',
          icon: '🌐',
          color: 'text-green-600'
        }
      case 1:
        return {
          title: 'Voting Required',
          description: 'Your application will be reviewed by existing members.',
          icon: '🗳️',
          color: 'text-blue-600'
        }
      case 2:
        return {
          title: 'Invite Only',
          description: 'You need an invitation from an administrator.',
          icon: '✉️',
          color: 'text-orange-600'
        }
      default:
        return {
          title: 'Unknown',
          description: 'Access model not recognized.',
          icon: '❓',
          color: 'text-gray-600'
        }
    }
  }

  const accessInfo = getAccessModelDescription(organization.accessModel)
  const canJoin = organization.accessModel === 0 && isConnected // Only open organizations can be joined directly and wallet must be connected
  const isActive = organization.state === 1

  if (joinSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Successfully Joined!</h3>
            <p className="text-muted-foreground mb-4">
              Welcome to {organization.name}. You are now a member of this organization.
            </p>
            <Button onClick={onClose} className="w-full">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join Organization
          </DialogTitle>
          <DialogDescription>
            Review the organization details and membership requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{organization.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Members:</span>
                  <span className="ml-2">{organization.memberCount}</span>
                </div>
                <div>
                  <span className="font-medium">Creator:</span>
                  <span className="ml-2 font-mono text-xs">
                    {formatAddress(organization.creator)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Member Limit:</span>
                  <span className="ml-2">
                    {organization.memberLimit === 0 ? 'Unlimited' : organization.memberLimit}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Access Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{accessInfo.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${accessInfo.color}`}>
                    {accessInfo.title}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {accessInfo.description}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Membership Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Membership Fee:</span>
                <Badge variant="outline">Free</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">GAME Stake Required:</span>
                <Badge variant="outline">None</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Approval Process:</span>
                <Badge variant="outline">
                  {organization.accessModel === 0 ? 'Instant' :
                   organization.accessModel === 1 ? 'Member Vote' : 'Admin Approval'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Connection Info */}
          {isConnected && address ? (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Your Account:</span>
                <Badge variant="secondary">{formatAddress(address)}</Badge>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  Please connect your wallet to join this organization.
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {joinError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{joinError}</span>
            </div>
          )}

          {/* Join Status Messages */}
          {!isActive && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                This organization is currently inactive and cannot accept new members.
              </span>
            </div>
          )}

          {organization.accessModel === 1 && isActive && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Your membership application will be reviewed by existing members.
              </span>
            </div>
          )}

          {organization.accessModel === 2 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                This is an invite-only organization. Contact an administrator for an invitation.
              </span>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>

            <Button
              onClick={handleJoin}
              disabled={!canJoin || !isActive || isJoining || isWritePending || !isConnected}
              className="flex-1"
            >
              {isJoining || isWritePending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : organization.accessModel === 0 ? (
                'Join Now'
              ) : organization.accessModel === 1 ? (
                'Apply to Join'
              ) : (
                'Request Invitation'
              )}
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground text-center">
            By joining this organization, you agree to follow its governance rules and community guidelines.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
