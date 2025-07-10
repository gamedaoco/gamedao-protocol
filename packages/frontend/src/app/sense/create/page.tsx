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
import { Plus, ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'

export default function CreateProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { sense, control } = useGameDAO()

  const [organizations, setOrganizations] = useState<any[]>([])
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

  const avatarOptions = [
    '👤', '👩‍💻', '👨‍💻', '🎮', '🎨', '🎵', '✍️', '⛓️', '🎯', '🔍',
    '📈', '📹', '📋', '⚙️', '🚀', '💎', '🌟', '🔥', '⚡', '🎭'
  ]

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
            // Check if user already has a profile in this org
            try {
              const existingProfile = await sense?.read.getProfileByOwner([orgId, address])
              if (existingProfile && existingProfile.owner !== '0x0000000000000000000000000000000000000000') {
                continue // Skip if profile already exists
              }
            } catch {
              // No existing profile, add to list
            }

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
    if (!isConnected || !sense || !address) return

    setIsCreating(true)
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

      // Create profile using simplified function
      await sense.write.createProfile([
        formData.organizationId,
        metadata
      ])

      // Redirect to profile page
      router.push('/sense')
    } catch (error) {
      console.error('Failed to create profile:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
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
                Please connect your wallet to create a profile.
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
              <h2 className="text-2xl font-bold mb-4">No Available Organizations</h2>
              <p className="text-muted-foreground mb-4">
                You need to be a member of an organization to create a profile, or you may already have profiles in all your organizations.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/control">
                  <Button>Browse Organizations</Button>
                </Link>
                <Link href="/sense">
                  <Button variant="outline">View Existing Profiles</Button>
                </Link>
              </div>
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
          <Link href="/sense">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profiles
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Profile</h1>
            <p className="text-muted-foreground">
              Set up your identity and showcase your achievements
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Create your profile to participate in the GameDAO ecosystem
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
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the organization where you want to create your profile
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="avatar">Avatar</Label>
                  <Select value={formData.avatar} onValueChange={(value) => handleInputChange('avatar', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {avatarOptions.map((avatar) => (
                        <SelectItem key={avatar} value={avatar}>
                          <span className="text-lg">{avatar}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself and your interests"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="interests">Interests</Label>
                <Input
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => handleInputChange('interests', e.target.value)}
                  placeholder="gaming, blockchain, defi, nfts (comma-separated)"
                />
              </div>

              {/* Optional Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Optional Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={formData.twitter}
                      onChange={(e) => handleInputChange('twitter', e.target.value)}
                      placeholder="@username"
                    />
                  </div>

                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={formData.github}
                      onChange={(e) => handleInputChange('github', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isCreating || !formData.username || !formData.organizationId}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>Creating Profile...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </>
                  )}
                </Button>
                <Link href="/sense">
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
