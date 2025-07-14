'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NameClaimingModal } from '@/components/ui/name-claiming-modal'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useNameClaiming } from '@/hooks/useNameClaiming'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import {
  User,
  Shield,
  Coins,
  Clock,
  Star,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function ClaimNamePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { networkName } = useGameDAO()
  const { gameBalance } = useTokenBalances()
    const { useGetUserNames, getStakingTiers, formatStakeDuration } = useNameClaiming()

  const [showClaimModal, setShowClaimModal] = useState(false)
  const [userNames, setUserNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get user's owned names
  const { data: ownedNames, isLoading: isLoadingNames, refetch: refetchNames } = useGetUserNames()

  useEffect(() => {
    if (ownedNames) {
      // Convert bytes8 array to string array
      const names = (ownedNames as string[]).map((nameBytes8: string) => {
        // Convert bytes8 to string (simplified)
        return nameBytes8.replace(/\0/g, '').slice(2) // Remove 0x and null chars
      })
      setUserNames(names)
    }
    setIsLoading(isLoadingNames)
  }, [ownedNames, isLoadingNames])

  const handleClaimSuccess = (name: string) => {
    console.log('✅ Name claimed successfully:', name)
    setShowClaimModal(false)

    // Refresh user names
    refetchNames()

    // Show success message or redirect
    setTimeout(() => {
      router.push('/sense')
    }, 1000)
  }

  const stakingTiers = getStakingTiers()

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-bold">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to claim your personal name in the GameDAO ecosystem.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Claim Your Personal Name</h1>
            <p className="text-muted-foreground">
              Secure your unique 8-character identifier in the GameDAO ecosystem
            </p>
          </div>
        </div>

        {/* Connection info */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Connected Account:</span>
            <Badge variant="secondary">{formatAddress(address!)}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Network:</span>
            <Badge variant="outline">{networkName}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>GAME Balance:</span>
            <Badge variant={parseFloat(gameBalance.balance) >= 100 ? 'default' : 'destructive'}>
              {gameBalance.balance} GAME
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column - Your Names */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Names
              </CardTitle>
              <CardDescription>
                Names you have claimed and their staking details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : userNames.length > 0 ? (
                <div className="space-y-3">
                  {userNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {name}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Personal
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <User className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No names claimed yet</p>
                  <Button
                    onClick={() => setShowClaimModal(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Claim Your First Name
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claim New Name Button */}
          {userNames.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Want Another Name?</h3>
                  <p className="text-sm text-muted-foreground">
                    You can claim multiple names with different staking tiers
                  </p>
                  <Button
                    onClick={() => setShowClaimModal(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Claim Another Name
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Staking Tiers & Benefits */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Staking Tiers
              </CardTitle>
              <CardDescription>
                Choose your staking tier to unlock different benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stakingTiers.map((tier, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={tier.color}>
                        {tier.name === 'Basic' && <User className="h-4 w-4" />}
                        {tier.name === 'Premium' && <Star className="h-4 w-4" />}
                        {tier.name === 'Elite' && <Shield className="h-4 w-4" />}
                      </div>
                      <span className="font-semibold">{tier.name}</span>
                    </div>
                    <Badge variant="outline">
                      {tier.multiplier}x
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span>{tier.gameAmount} GAME tokens</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatStakeDuration(tier.duration)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {tier.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Choose Your Name</p>
                    <p className="text-sm text-muted-foreground">
                      Select an 8-character alphanumeric name
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Stake GAME Tokens</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a staking tier and duration
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Claim & Use</p>
                    <p className="text-sm text-muted-foreground">
                      Your name is reserved and features unlocked
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Names are reserved for the staking duration</li>
                  <li>• Tokens can be recovered after expiration</li>
                  <li>• Higher tiers unlock premium features</li>
                  <li>• Names must be exactly 8 characters (A-Z, 0-9)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Balance Warning */}
      {parseFloat(gameBalance.balance) < 100 && (
        <Card className="mt-8 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Insufficient GAME Balance</p>
                <p className="text-sm text-muted-foreground">
                  You need at least 100 GAME tokens to claim a name with the Basic tier.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Name Claiming Modal */}
      <NameClaimingModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        type="personal"
        onSuccess={handleClaimSuccess}
      />
    </div>
  )
}
