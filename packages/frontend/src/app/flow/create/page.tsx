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

  useEffect(() => {
    if (contracts.USDC_TOKEN) {
      setFormData(prev => ({ ...prev, paymentToken: contracts.USDC_TOKEN }))
    }
  }, [contracts.USDC_TOKEN])

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
    try {
      // TODO: Implement actual campaign creation
      console.log('Creating campaign with data:', formData)

      // For now, just show success message
      alert('Campaign creation will be implemented with contract integration')

      // Redirect to campaigns page
      router.push('/flow')
    } catch (error) {
      console.error('Failed to create campaign:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Campaign</h1>
          <p className="text-muted-foreground">
            Launch a crowdfunding campaign for your gaming project
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Provide information about your campaign to attract contributors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Campaign Title */}
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

              {/* Campaign Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your campaign and what you're building"
                  rows={4}
                  required
                />
              </div>

              {/* Flow Type */}
              <div className="space-y-2">
                <Label htmlFor="flowType">Campaign Type *</Label>
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

              {/* Funding Target */}
              <div className="space-y-2">
                <Label htmlFor="target">Funding Target (USDC) *</Label>
                <Input
                  id="target"
                  type="number"
                  value={formData.target}
                  onChange={(e) => handleInputChange('target', e.target.value)}
                  placeholder="10000"
                  required
                />
              </div>

              {/* Minimum Contribution */}
              <div className="space-y-2">
                <Label htmlFor="min">Minimum Contribution (USDC)</Label>
                <Input
                  id="min"
                  type="number"
                  value={formData.min}
                  onChange={(e) => handleInputChange('min', e.target.value)}
                  placeholder="10"
                />
              </div>

              {/* Maximum Contribution */}
              <div className="space-y-2">
                <Label htmlFor="max">Maximum Contribution (USDC)</Label>
                <Input
                  id="max"
                  type="number"
                  value={formData.max}
                  onChange={(e) => handleInputChange('max', e.target.value)}
                  placeholder="1000"
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Campaign Duration (days) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="30"
                  required
                />
              </div>

              {/* Auto Finalize */}
              <div className="flex items-center space-x-2">
                <input
                  id="autoFinalize"
                  type="checkbox"
                  checked={formData.autoFinalize}
                  onChange={(e) => handleInputChange('autoFinalize', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="autoFinalize">
                  Auto-finalize campaign when target is reached
                </Label>
              </div>

              {/* GAME Deposit */}
              <div className="space-y-2">
                <Label htmlFor="gameDeposit">GAME Deposit (Required) *</Label>
                <Input
                  id="gameDeposit"
                  type="number"
                  value={formData.gameDeposit}
                  onChange={(e) => handleInputChange('gameDeposit', e.target.value)}
                  placeholder="100"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isCreating || !formData.organizationId || !formData.title || !formData.target}
                className="w-full"
              >
                {isCreating ? 'Creating Campaign...' : 'Create Campaign'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
