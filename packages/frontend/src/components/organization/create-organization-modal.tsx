'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import { InsufficientBalanceWarning } from '@/components/wallet/wallet-balance'
import { AlertCircle, Users, Shield, CreditCard, Gamepad2, CheckCircle, Loader2 } from 'lucide-react'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface OrganizationFormData {
  name: string
  description: string
  orgType: number
  accessModel: number
  feeModel: number
  memberLimit: number
  membershipFee: string
  gameStakeRequired: string
}

const ORG_TYPES = [
  { value: 0, label: 'Individual', description: 'Personal gaming profile or solo creator' },
  { value: 1, label: 'Company', description: 'Gaming company or studio' },
  { value: 2, label: 'DAO', description: 'Decentralized autonomous organization' },
  { value: 3, label: 'Hybrid', description: 'Mix of traditional and decentralized governance' }
]

const ACCESS_MODELS = [
  { value: 0, label: 'Open', description: 'Anyone can join instantly', icon: '🌐' },
  { value: 1, label: 'Voting', description: 'Members vote on new applicants', icon: '🗳️' },
  { value: 2, label: 'Invite', description: 'Only admins can invite members', icon: '✉️' }
]

const FEE_MODELS = [
  { value: 0, label: 'No Fees', description: 'Free to join and participate', icon: '🆓' },
  { value: 1, label: 'Reserve', description: 'Fees held in member account', icon: '🏦' },
  { value: 2, label: 'Transfer', description: 'Fees go to organization treasury', icon: '💰' }
]

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const { address, isConnected } = useAccount()
  const { createOrganization, isCreating, createSuccess, createError } = useOrganizations()
  const { ethBalance, gameBalance, usdcBalance, hasBalance } = useTokenBalances()
  const { contracts } = useGameDAO()

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    description: '',
    orgType: 2, // Default to DAO
    accessModel: 0, // Default to Open
    feeModel: 0, // Default to No Fees
    memberLimit: 100,
    membershipFee: '0',
    gameStakeRequired: '0'
  })

  const [step, setStep] = useState<'basic' | 'governance' | 'economics' | 'review'>('basic')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      console.log('🚀 Creating organization with params:', {
        name: formData.name,
        accessModel: formData.accessModel,
        memberLimit: formData.memberLimit,
        contractAddress: contracts.CONTROL,
        userAddress: address
      })

      await createOrganization({
        name: formData.name,
        accessModel: formData.accessModel,
        memberLimit: formData.memberLimit
      })

      console.log('✅ Organization creation transaction submitted')

    } catch (error) {
      console.error('❌ Failed to create organization:', error)

      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          console.log('User cancelled the transaction')
        } else if (error.message.includes('insufficient funds')) {
          console.error('Insufficient funds for transaction')
        } else {
          console.error('Transaction error:', error.message)
        }
      }
    }
  }

  // Handle success state change
  useEffect(() => {
    if (createSuccess) {
      console.log('🎉 Organization created successfully!')

      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setFormData({
        name: '',
        description: '',
        orgType: 2,
        accessModel: 0,
        feeModel: 0,
        memberLimit: 100,
        membershipFee: '0',
        gameStakeRequired: '0'
      })
      setStep('basic')
    }
  }, [createSuccess, onSuccess, onClose])

  // Handle error state change
  useEffect(() => {
    if (createError) {
      console.error('❌ Organization creation failed:', createError)
    }
  }, [createError])

  const isFormValid = () => {
    const basicValid = formData.name.trim().length > 0 &&
                      formData.description.trim().length > 0 &&
                      formData.memberLimit > 0

    if (!isConnected) return basicValid

    // Check ETH balance for gas fees
    const hasEnoughEth = parseFloat(ethBalance.balance) >= 0.01

    // Check GAME balance if required
    const hasEnoughGame = formData.gameStakeRequired === '0' ||
                         parseFloat(gameBalance.balance) >= parseFloat(formData.gameStakeRequired)

    return basicValid && hasEnoughEth && hasEnoughGame
  }

  const nextStep = () => {
    if (step === 'basic') setStep('governance')
    else if (step === 'governance') setStep('economics')
    else if (step === 'economics') setStep('review')
  }

  const prevStep = () => {
    if (step === 'review') setStep('economics')
    else if (step === 'economics') setStep('governance')
    else if (step === 'governance') setStep('basic')
  }

  const renderStepContent = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your organization's mission and goals"
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Organization Type</Label>
                <Select
                  value={formData.orgType.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, orgType: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value.toString()}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'governance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Access Model</Label>
                <div className="grid gap-3 mt-2">
                  {ACCESS_MODELS.map((model) => (
                    <Card
                      key={model.value}
                      className={`cursor-pointer transition-colors ${
                        formData.accessModel === model.value
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, accessModel: model.value }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{model.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{model.label}</div>
                            <div className="text-sm text-muted-foreground">{model.description}</div>
                          </div>
                          {formData.accessModel === model.value && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="memberLimit">Member Limit</Label>
                <Input
                  id="memberLimit"
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.memberLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, memberLimit: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum number of members (set to 0 for unlimited)
                </p>
              </div>
            </div>
          </div>
        )

      case 'economics':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Fee Model</Label>
                <div className="grid gap-3 mt-2">
                  {FEE_MODELS.map((model) => (
                    <Card
                      key={model.value}
                      className={`cursor-pointer transition-colors ${
                        formData.feeModel === model.value
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, feeModel: model.value }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{model.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{model.label}</div>
                            <div className="text-sm text-muted-foreground">{model.description}</div>
                          </div>
                          {formData.feeModel === model.value && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {formData.feeModel !== 0 && (
                <div>
                  <Label htmlFor="membershipFee">Membership Fee (USDC)</Label>
                  <Input
                    id="membershipFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.membershipFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, membershipFee: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Fee required to join the organization
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="gameStakeRequired">GAME Token Stake Required</Label>
                <Input
                  id="gameStakeRequired"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.gameStakeRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameStakeRequired: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  GAME tokens that members must stake (0 for no requirement)
                </p>
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Name:</span> {formData.name}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {ORG_TYPES.find(t => t.value === formData.orgType)?.label}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Governance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Access Model:</span> {ACCESS_MODELS.find(a => a.value === formData.accessModel)?.label}
                  </div>
                  <div>
                    <span className="font-medium">Member Limit:</span> {formData.memberLimit === 0 ? 'Unlimited' : formData.memberLimit}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Economics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Fee Model:</span> {FEE_MODELS.find(f => f.value === formData.feeModel)?.label}
                  </div>
                  {formData.feeModel !== 0 && (
                    <div>
                      <span className="font-medium">Membership Fee:</span> {formData.membershipFee} USDC
                    </div>
                  )}
                  <div>
                    <span className="font-medium">GAME Stake Required:</span> {formData.gameStakeRequired} GAME
                  </div>
                </CardContent>
              </Card>

              {/* Balance Checks */}
              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Balance Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* ETH for gas fees */}
                    {parseFloat(ethBalance.balance) < 0.01 && (
                      <InsufficientBalanceWarning
                        requiredToken="ETH"
                        requiredAmount="0.01"
                        currentAmount={ethBalance.formatted}
                      />
                    )}

                    {/* GAME tokens if required */}
                    {formData.gameStakeRequired !== '0' && parseFloat(gameBalance.balance) < parseFloat(formData.gameStakeRequired) && (
                      <InsufficientBalanceWarning
                        requiredToken="GAME"
                        requiredAmount={formData.gameStakeRequired}
                        currentAmount={gameBalance.formatted}
                      />
                    )}

                    {/* Show success if balances are sufficient */}
                    {parseFloat(ethBalance.balance) >= 0.01 &&
                     (formData.gameStakeRequired === '0' || parseFloat(gameBalance.balance) >= parseFloat(formData.gameStakeRequired)) && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          Sufficient balance to create organization
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isCreating && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-800">
                    Transaction submitted. Please wait for confirmation...
                  </span>
                </div>
              )}

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    Failed to create organization. Please try again.
                  </span>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Not Connected</DialogTitle>
            <DialogDescription>
              Please connect your wallet to create an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Set up your gaming organization or DAO with custom governance and membership rules.
          </DialogDescription>
        </DialogHeader>

        {/* Connection Info */}
        {address && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Connected Account:</span>
              <Badge variant="secondary">{formatAddress(address)}</Badge>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {['basic', 'governance', 'economics', 'review'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName ? 'bg-primary text-primary-foreground' :
                ['basic', 'governance', 'economics', 'review'].indexOf(step) > index ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  ['basic', 'governance', 'economics', 'review'].indexOf(step) > index ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'basic' && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Transaction status indicator */}
              {isCreating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Creating organization...</span>
                </div>
              )}

              {createError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <span>❌ Transaction failed</span>
                </div>
              )}

              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>

              {step === 'review' ? (
                <Button
                  type="submit"
                  disabled={!isFormValid() || isCreating}
                  className="min-w-[120px]"
                >
                  {isCreating ? 'Creating...' : 'Create Organization'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isFormValid()}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
