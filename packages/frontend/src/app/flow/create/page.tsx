'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { parseUnits, formatEther } from 'viem'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateCampaignPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { flow, control, usdc } = useGameDAO()

  const [organizations, setOrganizations] = useState<any[]>([])
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
    autoFinalize: false
  })

  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (usdc?.address) {
      setFormData(prev => ({ ...prev, paymentToken: usdc.address }))
    }
  }, [usdc])

  useEffect(() => {
    loadOrganizations()
  }, [control, address])

  const loadOrganizations = async () => {
    if (!control || !address) return

    setIsLoading(true)
    try {
      // Get all organizations
      const allOrgs = await control.read.getAllOrganizations()
      const orgData = []

      for (const orgId of allOrgs) {
        try {
          const org = await control.read.getOrganization([orgId])
          const isMember = await control.read.isMemberActive([orgId, address])

          if (isMember) {
            orgData.push({
              id: orgId,
              name: org.name,
              description: org.description
            })
          }
        } catch (error) {
          console.error('Error loading organization:', error)
        }
      }

      setOrganizations(orgData)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !flow || !address) return

    setIsCreating(true)
    try {
      const targetAmount = parseUnits(formData.target, 6) // USDC has 6 decimals
      const minAmount = formData.min ? parseUnits(formData.min, 6) : parseUnits('100', 6)
      const maxAmount = formData.max ? parseUnits(formData.max, 6) : targetAmount * 2n
      const durationSeconds = BigInt(parseInt(formData.duration) * 24 * 60 * 60)

      const campaignParams = {
        title: formData.title,
        description: formData.description,
        metadataURI: formData.metadataURI || `ipfs://campaign-${Date.now()}`,
        flowType: parseInt(formData.flowType),
        paymentToken: formData.paymentToken,
        target: targetAmount,
        min: minAmount,
        max: maxAmount,
        duration: durationSeconds,
        autoFinalize: formData.autoFinalize
      }

      // Create campaign using new simplified function
      await flow.write.createCampaignWithParams([
        address,
        formData.organizationId,
        campaignParams
      ])

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

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to create a new campaign.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Loading...</h2>
              <p className="text-muted-foreground">Loading your organizations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Organizations Found</h2>
              <p className="text-muted-foreground mb-4">
                You need to be a member of an organization to create campaigns.
              </p>
              <Link href="/control">
                <Button>Browse Organizations</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
              Launch a crowdfunding campaign for your project
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Campaign Details
            </CardTitle>
            <CardDescription>
              Configure your campaign settings and funding goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Selection */}
              <div>
                <Label htmlFor="organizationId">Organization *</Label>
                <Select value={formData.organizationId} onValueChange={(value) => handleInputChange('organizationId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
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

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter campaign title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your campaign goals and how funds will be used"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="metadataURI">Metadata URI (Optional)</Label>
                  <Input
                    id="metadataURI"
                    value={formData.metadataURI}
                    onChange={(e) => handleInputChange('metadataURI', e.target.value)}
                    placeholder="ipfs://... or https://..."
                  />
                </div>
              </div>

              {/* Funding Goals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="target">Target Amount (USDC) *</Label>
                  <Input
                    id="target"
                    type="number"
                    step="0.01"
                    value={formData.target}
                    onChange={(e) => handleInputChange('target', e.target.value)}
                    placeholder="10000"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="min">Minimum Amount (USDC)</Label>
                  <Input
                    id="min"
                    type="number"
                    step="0.01"
                    value={formData.min}
                    onChange={(e) => handleInputChange('min', e.target.value)}
                    placeholder="100"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="max">Maximum Amount (USDC)</Label>
                  <Input
                    id="max"
                    type="number"
                    step="0.01"
                    value={formData.max}
                    onChange={(e) => handleInputChange('max', e.target.value)}
                    placeholder="20000"
                    min="0"
                  />
                </div>
              </div>

              {/* Campaign Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flowType">Campaign Type</Label>
                  <Select value={formData.flowType} onValueChange={(value) => handleInputChange('flowType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Grant - Request funding</SelectItem>
                      <SelectItem value="1">Raise - Crowdfunding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (Days) *</Label>
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
                </div>
              </div>

              {/* Auto-finalize option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoFinalize"
                  checked={formData.autoFinalize}
                  onChange={(e) => handleInputChange('autoFinalize', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="autoFinalize">Auto-finalize when target is reached</Label>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isCreating || !formData.title || !formData.description || !formData.organizationId || !formData.target}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>Creating Campaign...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </Button>
                <Link href="/flow">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
