'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { formatAddress } from '@/lib/utils'
import {
  User,
  Building,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Coins,
  Star,
  Zap
} from 'lucide-react'

interface NameClaimingModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'personal' | 'organization'
  onSuccess?: (name: string) => void
}

interface NameValidation {
  isValid: boolean
  isAvailable: boolean
  error?: string
  suggestion?: string
}

interface StakingTier {
  name: string
  gameAmount: string
  duration: string
  benefits: string[]
  multiplier: number
  color: string
  icon: React.ReactNode
}

const STAKING_TIERS: StakingTier[] = [
  {
    name: 'Basic',
    gameAmount: '100',
    duration: '30 days',
    benefits: ['Name reservation', 'Basic profile features'],
    multiplier: 1,
    color: 'text-gray-600',
    icon: <User className="h-4 w-4" />
  },
  {
    name: 'Premium',
    gameAmount: '500',
    duration: '90 days',
    benefits: ['Name reservation', 'Premium profile features', 'Priority support'],
    multiplier: 1.5,
    color: 'text-blue-600',
    icon: <Star className="h-4 w-4" />
  },
  {
    name: 'Elite',
    gameAmount: '1000',
    duration: '180 days',
    benefits: ['Name reservation', 'Elite profile features', 'Priority support', 'Exclusive badges'],
    multiplier: 2,
    color: 'text-purple-600',
    icon: <Zap className="h-4 w-4" />
  }
]

export function NameClaimingModal({
  isOpen,
  onClose,
  type,
  onSuccess
}: NameClaimingModalProps) {
  const { address } = useGameDAO()
  const { gameBalance } = useTokenBalances()

  const [name, setName] = useState('')
  const [selectedTier, setSelectedTier] = useState<StakingTier>(STAKING_TIERS[0])
  const [validation, setValidation] = useState<NameValidation>({ isValid: false, isAvailable: false })
  const [isValidating, setIsValidating] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [step, setStep] = useState<'input' | 'staking' | 'confirm' | 'processing'>('input')
  const [claimProgress, setClaimProgress] = useState(0)

  // Validate name format (8 characters, alphanumeric)
  const validateNameFormat = (inputName: string): boolean => {
    const nameRegex = /^[A-Z0-9]{8}$/
    return nameRegex.test(inputName.toUpperCase())
  }

  // Check name availability (mock implementation)
  const checkNameAvailability = async (inputName: string): Promise<boolean> => {
    // TODO: Implement actual contract call to check availability
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock some taken names for demo
    const takenNames = ['GAMEDAO1', 'TESTNAME', 'RESERVED1', 'ADMIN001']
    return !takenNames.includes(inputName.toUpperCase())
  }

  // Validate name on input change
  useEffect(() => {
    const validateName = async () => {
      if (!name) {
        setValidation({ isValid: false, isAvailable: false })
        return
      }

      setIsValidating(true)

      // Format validation
      if (!validateNameFormat(name)) {
        setValidation({
          isValid: false,
          isAvailable: false,
          error: 'Name must be exactly 8 characters (A-Z, 0-9 only)',
          suggestion: name.length < 8 ? 'Add more characters' : 'Remove extra characters'
        })
        setIsValidating(false)
        return
      }

      // Availability check
      const isAvailable = await checkNameAvailability(name)

      if (!isAvailable) {
        setValidation({
          isValid: false,
          isAvailable: false,
          error: 'This name is already taken',
          suggestion: `Try ${name.slice(0, 7)}1 or ${name.slice(0, 6)}01`
        })
      } else {
        setValidation({
          isValid: true,
          isAvailable: true
        })
      }

      setIsValidating(false)
    }

    const debounceTimer = setTimeout(validateName, 300)
    return () => clearTimeout(debounceTimer)
  }, [name])

  const handleNameSubmit = () => {
    if (validation.isValid && validation.isAvailable) {
      setStep('staking')
    }
  }

  const handleStakingConfirm = () => {
    setStep('confirm')
  }

  const handleClaimName = async () => {
    if (!validation.isValid || !validation.isAvailable) return

    setIsClaiming(true)
    setStep('processing')
    setClaimProgress(0)

    try {
      // Step 1: Approve GAME tokens
      setClaimProgress(25)
      // TODO: Implement GAME token approval
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 2: Call name claiming contract
      setClaimProgress(50)
      // TODO: Implement contract call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 3: Wait for confirmation
      setClaimProgress(75)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 4: Complete
      setClaimProgress(100)

      // Success callback
      onSuccess?.(name)

      // Close modal after brief success display
      setTimeout(() => {
        onClose()
        resetModal()
      }, 1500)

    } catch (error) {
      console.error('Name claiming failed:', error)
      setIsClaiming(false)
      setStep('confirm')
    }
  }

  const resetModal = () => {
    setName('')
    setSelectedTier(STAKING_TIERS[0])
    setValidation({ isValid: false, isAvailable: false })
    setStep('input')
    setClaimProgress(0)
    setIsClaiming(false)
  }

  const renderStepContent = () => {
    switch (step) {
      case 'input':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                {type === 'personal' ? (
                  <User className="h-12 w-12 text-primary" />
                ) : (
                  <Building className="h-12 w-12 text-primary" />
                )}
              </div>
              <h3 className="text-lg font-semibold">
                Claim Your {type === 'personal' ? 'Personal' : 'Organization'} Name
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose an 8-character alphanumeric name that represents your identity
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name (8 characters) *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="GAMEDAO1"
                    maxLength={8}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  {isValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Validation feedback */}
                {name && !isValidating && (
                  <div className="mt-2 space-y-1">
                    {validation.error && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {validation.error}
                      </div>
                    )}
                    {validation.suggestion && (
                      <div className="text-sm text-muted-foreground">
                        Suggestion: {validation.suggestion}
                      </div>
                    )}
                    {validation.isValid && validation.isAvailable && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Name is available!
                      </div>
                    )}
                  </div>
                )}

                {/* Character count */}
                <div className="mt-1 text-xs text-muted-foreground text-right">
                  {name.length}/8 characters
                </div>
              </div>

              {/* Name format guide */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Name Requirements:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Exactly 8 characters</li>
                      <li>• Letters (A-Z) and numbers (0-9) only</li>
                      <li>• No spaces or special characters</li>
                      <li>• Case insensitive (stored as uppercase)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 'staking':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Coins className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Choose Staking Tier</h3>
              <p className="text-sm text-muted-foreground">
                Stake GAME tokens to claim "{name}" and unlock premium features
              </p>
            </div>

            <div className="space-y-4">
              {STAKING_TIERS.map((tier) => (
                <Card
                  key={tier.name}
                  className={`cursor-pointer transition-all ${
                    selectedTier.name === tier.name
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTier(tier)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={tier.color}>
                          {tier.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{tier.name}</CardTitle>
                          <CardDescription>
                            {tier.gameAmount} GAME • {tier.duration}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={selectedTier.name === tier.name ? 'default' : 'secondary'}>
                        {tier.multiplier}x
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {tier.benefits.map((benefit, index) => (
                        <li key={index}>• {benefit}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Balance check */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your GAME Balance:</span>
                  <Badge variant={
                    parseFloat(gameBalance.balance) >= parseFloat(selectedTier.gameAmount)
                      ? 'default'
                      : 'destructive'
                  }>
                    {gameBalance.balance} GAME
                  </Badge>
                </div>
                {parseFloat(gameBalance.balance) < parseFloat(selectedTier.gameAmount) && (
                  <div className="mt-2 text-sm text-destructive">
                    Insufficient balance. You need {selectedTier.gameAmount} GAME tokens.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Confirm Name Claim</h3>
              <p className="text-sm text-muted-foreground">
                Review your name claim details before proceeding
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claim Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Name:</span>
                  <Badge variant="outline" className="font-mono">
                    {name}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm capitalize">{type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Staking Tier:</span>
                  <span className="text-sm">{selectedTier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">GAME Stake:</span>
                  <span className="text-sm">{selectedTier.gameAmount} GAME</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Duration:</span>
                  <span className="text-sm">{selectedTier.duration}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">What happens next:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• GAME tokens will be staked for {selectedTier.duration}</li>
                    <li>• Your name will be reserved immediately</li>
                    <li>• Premium features will be unlocked</li>
                    <li>• Tokens can be unstaked after the duration</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'processing':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  {claimProgress === 100 ? (
                    <CheckCircle className="h-8 w-8 text-primary" />
                  ) : (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {claimProgress === 100 ? 'Name Claimed Successfully!' : 'Claiming Name...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {claimProgress === 100
                    ? `"${name}" is now yours!`
                    : 'Please wait while we process your name claim'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{claimProgress}%</span>
              </div>
              <Progress value={claimProgress} className="h-2" />
            </div>

            {claimProgress < 100 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {claimProgress < 25 && 'Preparing transaction...'}
                  {claimProgress >= 25 && claimProgress < 50 && 'Approving GAME tokens...'}
                  {claimProgress >= 50 && claimProgress < 75 && 'Claiming name on blockchain...'}
                  {claimProgress >= 75 && claimProgress < 100 && 'Waiting for confirmation...'}
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const renderActions = () => {
    switch (step) {
      case 'input':
        return (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleNameSubmit}
              disabled={!validation.isValid || !validation.isAvailable || isValidating}
              className="flex-1"
            >
              {isValidating ? 'Checking...' : 'Continue'}
            </Button>
          </div>
        )

      case 'staking':
        return (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('input')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleStakingConfirm}
              disabled={parseFloat(gameBalance.balance) < parseFloat(selectedTier.gameAmount)}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        )

      case 'confirm':
        return (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('staking')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleClaimName}
              disabled={isClaiming}
              className="flex-1"
            >
              {isClaiming ? 'Claiming...' : 'Claim Name'}
            </Button>
          </div>
        )

      case 'processing':
        return claimProgress === 100 ? (
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        ) : null

      default:
        return null
    }
  }

  // Reset modal when closed
  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Name</DialogTitle>
          <DialogDescription>
            Secure your unique 8-character identifier in the GameDAO ecosystem
          </DialogDescription>
        </DialogHeader>

        {/* Connection info */}
        {address && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Connected Account:</span>
              <Badge variant="secondary">{formatAddress(address)}</Badge>
            </div>
          </div>
        )}

        {/* Step content */}
        {renderStepContent()}

        {/* Actions */}
        {renderActions()}
      </DialogContent>
    </Dialog>
  )
}
