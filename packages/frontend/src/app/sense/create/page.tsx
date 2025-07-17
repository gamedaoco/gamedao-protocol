'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransactionOverlay } from '@/components/ui/transaction-overlay'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { Plus, ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'

export default function CreateProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { contracts } = useGameDAO()

  const [organizations, setOrganizations] = useState<Array<{id: string, name: string, description: string}>>([])
  const [formData, setFormData] = useState({
    organizationId: '',
    username: '',
    bio: '',
    avatar: '👤',
    interests: '',
    location: '',
    website: '',
    twitter: '',
    github: ''
  })

  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [creationSuccess, setCreationSuccess] = useState(false)

  const avatarOptions = [
    '👤', '👩‍💻', '👨‍💻', '🎮', '🎨', '🎵', '✍️', '⛓️', '🎯', '🔍',
    '📈', '📹', '📋', '⚙️', '🚀', '💎', '🌟', '🔥', '⚡', '🎭'
  ]

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!contracts.CONTROL || !address) return

      setIsLoading(true)
      try {
        // For now, use mock data since we need to implement proper contract calls
        const orgData = [
          {
            id: '1',
            name: 'Test Organization',
            description: 'A test organization for development'
          }
        ]

        setOrganizations(orgData)
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganizations()
  }, [contracts.CONTROL, address])

  // Handle success redirect
  useEffect(() => {
    if (creationSuccess) {
      const timer = setTimeout(() => {
        router.push('/sense')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [creationSuccess, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !contracts.SENSE || !address) return

    setIsCreating(true)
    setCreationError(null)
    setCreationSuccess(false)

    try {
      const metadata = JSON.stringify({
        username: formData.username,
        bio: formData.bio,
        avatar: formData.avatar,
        interests: formData.interests,
        location: formData.location,
        website: formData.website,
        twitter: formData.twitter,
        github: formData.github,
        createdAt: Date.now()
      })

      // For now, just show success message since we need to implement proper contract integration
      console.log('Creating profile with metadata:', metadata)

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      setCreationSuccess(true)
    } catch (error) {
      console.error('Failed to create profile:', error)
      setCreationError(error instanceof Error ? error.message : 'Failed to create profile')
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetCreation = () => {
    setIsCreating(false)
    setCreationError(null)
    setCreationSuccess(false)
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Connect Wallet Required</h2>
              <p className="text-muted-foreground">
                Please connect your wallet to create a profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Transaction Overlay */}
      <TransactionOverlay
        isVisible={isCreating || creationSuccess}
        title="Creating Profile"
        description="Please wait while we create your profile on the blockchain."
        currentStep={creationSuccess ? 'success' : isCreating ? 'creating' : 'idle'}
        error={creationError}
        onRetry={resetCreation}
        successMessage="Profile created successfully! Redirecting to profiles page..."
        successAction={{
          label: 'View Profiles',
          onClick: () => router.push('/sense')
        }}
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/sense">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profiles
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Profile</h1>
            <p className="text-muted-foreground">
              Set up your gaming profile and showcase your achievements
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Details
            </CardTitle>
            <CardDescription>
              Create your gaming profile to connect with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Dim the form during transaction */}
            <form onSubmit={handleSubmit} className={`space-y-6 ${isCreating || creationSuccess ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Organization Selection */}
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => handleInputChange('organizationId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization (optional)" />
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

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  required
                />
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar</Label>
                <Select
                  value={formData.avatar}
                  onValueChange={(value) => handleInputChange('avatar', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an avatar" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatarOptions.map((avatar) => (
                      <SelectItem key={avatar} value={avatar}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{avatar}</span>
                          <span>Avatar {avatar}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => handleInputChange('interests', e.target.value)}
                  placeholder="Gaming, Development, Art, Music..."
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.twitter}
                    onChange={(e) => handleInputChange('twitter', e.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={formData.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    placeholder="username"
                  />
                </div>
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
                  disabled={isCreating || creationSuccess || !formData.username || !formData.bio}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
