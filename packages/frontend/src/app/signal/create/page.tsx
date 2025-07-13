'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useProposals } from '@/hooks/useProposals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader } from '@/components/ui/loader'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, Vote, FileText, Clock, Users } from 'lucide-react'
import Link from 'next/link'

export default function CreateProposalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()
  const { organizations, isLoading: orgsLoading } = useOrganizations()
  const { createProposal } = useProposals()

  // Get organization ID from URL params
  const preselectedOrgId = searchParams.get('org')

  const [formData, setFormData] = useState({
    organizationId: preselectedOrgId || '',
    title: '',
    description: '',
    metadataURI: '',
    proposalType: '0', // SIMPLE
    votingType: '0', // SIMPLE
    votingPeriod: '7', // 7 days in days, will convert to seconds
    gameDeposit: '100' // GAME tokens required for proposal creation
  })

  const [isCreating, setIsCreating] = useState(false)

  // Set preselected organization when component mounts
  useEffect(() => {
    if (preselectedOrgId) {
      setFormData(prev => ({ ...prev, organizationId: preselectedOrgId }))
    }
  }, [preselectedOrgId])

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to create a proposal.
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

  // Filter organizations to only show those where user is a member
  const userOrganizations = organizations.filter(org =>
    org.members?.some(member =>
      member.address.toLowerCase() === address?.toLowerCase() &&
      member.state === 'ACTIVE'
    )
  )

  if (userOrganizations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="No Organizations Available"
          description="You need to be a member of an organization to create a proposal."
          icon={<Vote className="h-12 w-12 text-muted-foreground" />}
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
    if (!isConnected || !contracts.SIGNAL || !address) return

    setIsCreating(true)
    try {
      await createProposal({
        organizationId: formData.organizationId,
        title: formData.title,
        description: formData.description,
        metadataURI: formData.metadataURI,
        proposalType: parseInt(formData.proposalType),
        votingType: parseInt(formData.votingType),
        votingPeriod: parseInt(formData.votingPeriod) * 24 * 60 * 60, // Convert days to seconds
        gameDeposit: formData.gameDeposit
      })

      // Redirect to proposals page
      router.push('/signal')
    } catch (error) {
      console.error('Failed to create proposal:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const proposalTypes = [
    { value: '0', label: 'Simple', description: 'Basic proposal with yes/no voting' },
    { value: '1', label: 'Weighted', description: 'Proposal with token-weighted voting' },
    { value: '2', label: 'Quadratic', description: 'Proposal with quadratic voting' },
  ]

  const votingTypes = [
    { value: '0', label: 'Simple', description: 'One vote per member' },
    { value: '1', label: 'Weighted', description: 'Voting power based on tokens' },
    { value: '2', label: 'Conviction', description: 'Time-weighted voting' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/signal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Proposal</h1>
            <p className="text-muted-foreground">
              Submit a proposal for your organization to vote on
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              Proposal Details
            </CardTitle>
            <CardDescription>
              Provide information about your proposal for the community to consider
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
                    {userOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {org.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {preselectedOrgId && (
                  <p className="text-sm text-muted-foreground">
                    Pre-selected from organization page
                  </p>
                )}
              </div>

              {/* Proposal Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Proposal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter a clear, descriptive title"
                  required
                />
              </div>

              {/* Proposal Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your proposal in detail. What are you proposing and why?"
                  rows={6}
                  required
                />
              </div>

              {/* Metadata URI (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="metadataURI">Additional Information (Optional)</Label>
                <Input
                  id="metadataURI"
                  value={formData.metadataURI}
                  onChange={(e) => handleInputChange('metadataURI', e.target.value)}
                  placeholder="IPFS hash or URL for additional documents"
                />
                <p className="text-sm text-muted-foreground">
                  Link to additional documents, research, or supporting materials
                </p>
              </div>

              {/* Proposal Type */}
              <div className="space-y-2">
                <Label htmlFor="proposalType">Proposal Type *</Label>
                <Select
                  value={formData.proposalType}
                  onValueChange={(value) => handleInputChange('proposalType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select proposal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {proposalTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voting Type */}
              <div className="space-y-2">
                <Label htmlFor="votingType">Voting Type *</Label>
                <Select
                  value={formData.votingType}
                  onValueChange={(value) => handleInputChange('votingType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voting type" />
                  </SelectTrigger>
                  <SelectContent>
                    {votingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voting Period */}
              <div className="space-y-2">
                <Label htmlFor="votingPeriod">Voting Period (days) *</Label>
                <Select
                  value={formData.votingPeriod}
                  onValueChange={(value) => handleInputChange('votingPeriod', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voting duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days (recommended)</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  How long members will have to vote on this proposal
                </p>
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
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  GAME tokens required to submit this proposal (helps prevent spam)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !formData.organizationId || !formData.title || !formData.description}
                  className="flex-1"
                >
                  {isCreating ? 'Creating Proposal...' : 'Create Proposal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
