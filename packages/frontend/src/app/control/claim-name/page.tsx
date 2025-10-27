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
import { useOrganizations } from '@/hooks/useOrganizations'
import { useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import {
  Building,
  Shield,
  Coins,
  Clock,
  Star,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react'

export default function ClaimOrganizationNamePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { networkName } = useGameDAO()
  const { gameBalance } = useTokenBalances()
    const { useGetUserNames, getStakingTiers, formatStakeDuration } = useNameClaiming()
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations()

  const [showClaimModal, setShowClaimModal] = useState(false)
  const [organizationNames, setOrganizationNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get user's owned names (filter for organization names)
  const { data: ownedNames, isLoading: isLoadingNames, refetch: refetchNames } = useGetUserNames()

  useEffect(() => {
    if (ownedNames) {
      // Normalize to array and safely map to strings
      const items = Array.isArray(ownedNames) ? ownedNames : []
      const names = items
        .map((item: unknown) => {
          const str = typeof item === 'string' ? item : String(item ?? '')
          return str.replace(/\0/g, '').replace(/^0x/, '')
        })
      // TODO: Add logic to determine if name is for organization
      setOrganizationNames(names)
    }
    setIsLoading(isLoadingNames)
  }, [ownedNames, isLoadingNames])

  const handleClaimSuccess = (name: string) => {
    console.log('✅ Organization name claimed successfully:', name)
    setShowClaimModal(false)

    // Refresh user names
    refetchNames()

    // Show success message or redirect
    setTimeout(() => {
      router.push('/control')
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
                Please connect your wallet to claim organization names in the GameDAO ecosystem.
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
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Claim Organization Name</h1>
            <p className="text-muted-foreground">
              Secure unique identifiers for your gaming organizations and DAOs
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
        {/* Left Column - Your Organizations & Names */}
        <div className="space-y-6">
          {/* Your Organizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Collectives
              </CardTitle>
              <CardDescription>
                Collectives you have created or manage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOrgs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : organizations.length > 0 ? (
                <div className="space-y-3">
                  {organizations.slice(0, 3).map((org, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {org.memberCount} members
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {org.id}
                      </Badge>
                    </div>
                  ))}
                  {organizations.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{organizations.length - 3} more collectives
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No organizations found</p>
                  <Button
                    onClick={() => router.push('/control/create')}
                    variant="outline"
                    size="sm"
                  >
                    Create Organization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claimed Names */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Names
              </CardTitle>
              <CardDescription>
                Names you have claimed for organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : organizationNames.length > 0 ? (
                <div className="space-y-3">
                  {organizationNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {name}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Organization
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
                  <Building className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No organization names claimed yet</p>
                  <Button
                    onClick={() => setShowClaimModal(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Claim Organization Name
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claim New Name Button */}
          {organizationNames.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Need Another Name?</h3>
                  <p className="text-sm text-muted-foreground">
                    Claim additional names for different organizations or purposes
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
                Organization Staking Tiers
              </CardTitle>
              <CardDescription>
                Enhanced benefits for organization names
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stakingTiers.map((tier, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={tier.color}>
                        {tier.name === 'Basic' && <Building className="h-4 w-4" />}
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

          {/* Organization Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Name Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Brand Recognition</p>
                    <p className="text-sm text-muted-foreground">
                      Establish a memorable identity for your organization
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Member Trust</p>
                    <p className="text-sm text-muted-foreground">
                      Verified names increase member confidence
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Enhanced Features</p>
                    <p className="text-sm text-muted-foreground">
                      Access to premium organization tools
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Governance Priority</p>
                    <p className="text-sm text-muted-foreground">
                      Higher weight in ecosystem decisions
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Organization Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Must own or manage an organization</li>
                  <li>• Higher staking requirements than personal names</li>
                  <li>• Names represent the organization publicly</li>
                  <li>• Can be transferred between organization admins</li>
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
                  You need at least 100 GAME tokens to claim an organization name with the Basic tier.
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
        type="organization"
        onSuccess={handleClaimSuccess}
      />
    </div>
  )
}
