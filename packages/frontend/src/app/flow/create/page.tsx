'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useCampaigns } from '@/hooks/useCampaigns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader } from '@/components/ui/loader'
import { EmptyState } from '@/components/ui/empty-state'
import { TransactionOverlay } from '@/components/ui/transaction-overlay'
import { ArrowLeft, Target } from 'lucide-react'
import Link from 'next/link'

export default function CreateCampaignPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { organizations, isLoading: orgsLoading } = useOrganizations()
  const { createCampaign } = useCampaigns()

  const [formData, setFormData] = useState({
    organizationId: '',
    title: '',
    description: '',
    metadataURI: '',
    flowType: '1', // Raise
    paymentToken: '', // Will be set to USDC address
    target: '',
    min: '',
    max: '',
    duration: '30', // days
    autoFinalize: false,
    gameDeposit: '100' // GAME tokens required for campaign creation
  })

  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [creationSuccess, setCreationSuccess] = useState(false)

  useEffect(() => {
    if (contracts.USDC_TOKEN) {
      setFormData(prev => ({ ...prev, paymentToken: contracts.USDC_TOKEN }))
    }
  }, [contracts.USDC_TOKEN])

  // Handle success redirect
  useEffect(() => {
    if (creationSuccess) {
      const timer = setTimeout(() => {
        router.push('/flow')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [creationSuccess, router])

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to create a campaign.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (orgsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader />
        </div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="No Organizations Available"
          description="You need to be a member of an organization to create a campaign."
          primaryAction={{
            label: 'Browse Organizations',
            onClick: () => router.push('/control')
          }}
          secondaryAction={{
            label: 'Create Organization',
            onClick: () => router.push('/control/create')
          }}
        />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !contracts.FLOW || !address) return

    setIsCreating(true)
    setCreationError(null)
    setCreationSuccess(false)

    try {
      // TODO: Implement actual campaign creation with proper transaction handling
      console.log('Creating campaign with data:', formData)

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 3000))

      // For now, just show success message
      console.log('Campaign creation will be implemented with contract integration')
      setCreationSuccess(true)

    } catch (error) {
      console.error('Failed to create campaign:', error)
      setCreationError(error instanceof Error ? error.message : 'Failed to create campaign')
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetCreation = () => {
    setIsCreating(false)
    setCreationError(null)
    setCreationSuccess(false)
  }

  const flowTypes = [
    { value: '0', label: 'Grant' },
    { value: '1', label: 'Raise' },
    { value: '2', label: 'Lend' },
    { value: '3', label: 'Loan' },
    { value: '4', label: 'Share' },
    { value: '5', label: 'Pool' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Transaction Overlay */}
      <TransactionOverlay
        isVisible={isCreating || creationSuccess}
        title="Creating Campaign"
        description="Please wait while we create your campaign on the blockchain."
        currentStep={creationSuccess ? 'success' : isCreating ? 'creating' : 'idle'}
        error={creationError}
        onRetry={resetCreation}
        successMessage="Campaign created successfully! Redirecting to campaigns page..."
        successAction={{
          label: 'View Campaigns',
          onClick: () => router.push('/flow')
        }}
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/flow">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Campaign</h1>
            <p className="text-muted-foreground">
              Launch a crowdfunding campaign for your gaming project
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Campaign Details
            </CardTitle>
            <CardDescription>
              Provide information about your campaign to attract contributors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Dim the form during transaction */}
            <form onSubmit={handleSubmit} className={`space-y-6 ${isCreating || creationSuccess ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Organization Selection */}
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization *</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => handleInputChange('organizationId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter campaign title"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your campaign in detail..."
                  rows={6}
                  required
                />
              </div>

              {/* Flow Type */}
              <div className="space-y-2">
                <Label htmlFor="flowType">Campaign Type</Label>
                <Select
                  value={formData.flowType}
                  onValueChange={(value) => handleInputChange('flowType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    {flowTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Amount */}
              <div className="space-y-2">
                <Label htmlFor="target">Target Amount (USDC) *</Label>
                <Input
                  id="target"
                  type="number"
                  value={formData.target}
                  onChange={(e) => handleInputChange('target', e.target.value)}
                  placeholder="10000"
                  min="1"
                  required
                />
              </div>

              {/* Min/Max Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min">Minimum Amount (USDC)</Label>
                  <Input
                    id="min"
                    type="number"
                    value={formData.min}
                    onChange={(e) => handleInputChange('min', e.target.value)}
                    placeholder="100"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Maximum Amount (USDC)</Label>
                  <Input
                    id="max"
                    type="number"
                    value={formData.max}
                    onChange={(e) => handleInputChange('max', e.target.value)}
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="30"
                  min="1"
                  max="365"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  How long should the campaign run? (1-365 days)
                </p>
              </div>

              {/* GAME Deposit */}
              <div className="space-y-2">
                <Label htmlFor="gameDeposit">GAME Token Deposit</Label>
                <Input
                  id="gameDeposit"
                  type="number"
                  value={formData.gameDeposit}
                  onChange={(e) => handleInputChange('gameDeposit', e.target.value)}
                  placeholder="100"
                  min="0"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  GAME tokens required as deposit for campaign creation
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={isCreating || creationSuccess}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || creationSuccess || !formData.organizationId || !formData.title || !formData.description || !formData.target}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
