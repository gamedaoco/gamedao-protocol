'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { Plus, ArrowLeft, Upload, Image, FileText } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { uploadOrganizationMetadata, uploadFileToIPFS } from '@/lib/ipfs'

// Dynamically import markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

export default function CreateOrganizationPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { contracts } = useGameDAO()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    longDescription: '',
    website: '',
    twitter: '',
    discord: '',
    github: '',
    tags: '',
    orgType: '0',
    accessModel: '2',
    feeModel: '0',
    memberLimit: '20',
    membershipFee: '0',
    stakeAmount: '1000'
  })

  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [bannerImage, setBannerImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('')

  const [isCreating, setIsCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const handleImageUpload = (file: File, type: 'profile' | 'banner') => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        if (type === 'profile') {
          setProfileImage(file)
          setProfileImagePreview(preview)
        } else {
          setBannerImage(file)
          setBannerImagePreview(preview)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !contracts) return

    setIsCreating(true)
    setUploadProgress('Preparing metadata...')

    try {
      // Upload images to IPFS first
      let profileImageUrl = ''
      let bannerImageUrl = ''

      if (profileImage) {
        setUploadProgress('Uploading profile image to IPFS...')
        const result = await uploadFileToIPFS(profileImage, {
          name: `${formData.name} Profile Image`,
          description: `Profile image for ${formData.name} organization`
        })
        profileImageUrl = result.url
      }

      if (bannerImage) {
        setUploadProgress('Uploading banner image to IPFS...')
        const result = await uploadFileToIPFS(bannerImage, {
          name: `${formData.name} Banner Image`,
          description: `Banner image for ${formData.name} organization`
        })
        bannerImageUrl = result.url
      }

      // Create metadata object
      const metadata = {
        name: formData.name,
        description: formData.description,
        longDescription: formData.longDescription,
        profileImage: profileImageUrl,
        bannerImage: bannerImageUrl,
        website: formData.website,
        social: {
          twitter: formData.twitter,
          discord: formData.discord,
          github: formData.github
        },
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }

      // Upload metadata to IPFS
      setUploadProgress('Uploading metadata to IPFS...')
      const metadataResult = await uploadOrganizationMetadata(metadata)

      setUploadProgress('Creating organization on blockchain...')

      // Note: This would need to be implemented with proper contract calls
      // For now, simulating the creation
      console.log('Organization metadata uploaded to:', metadataResult.url)
      console.log('Creating organization with metadata URI:', metadataResult.url)

      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Redirect to organizations page
      router.push('/control')
    } catch (error) {
      console.error('Failed to create organization:', error)
      setUploadProgress('')
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
                Please connect your wallet to create a new organization.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/control">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Organization</h1>
            <p className="text-muted-foreground">
              Set up a new DAO to coordinate activities and manage resources
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Essential details about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of your organization (max 200 characters)"
                  rows={3}
                  maxLength={200}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.description.length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="longDescription">Detailed Description</Label>
                <div className="mt-2">
                  <MDEditor
                    value={formData.longDescription}
                    onChange={(value) => handleInputChange('longDescription', value || '')}
                    preview="edit"
                    hideToolbar={false}
                    data-color-mode="light"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Use markdown to format your detailed description
                </p>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="gaming, defi, nft, dao (comma-separated)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Images
              </CardTitle>
              <CardDescription>
                Upload profile and banner images for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Image */}
                <div>
                  <Label>Profile Image</Label>
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {profileImagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={profileImagePreview}
                            alt="Profile preview"
                            className="w-24 h-24 object-cover rounded-lg mx-auto"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfileImage(null)
                              setProfileImagePreview('')
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('profile-image')?.click()}
                            >
                              Choose Image
                            </Button>
                            <input
                              id="profile-image"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImageUpload(file, 'profile')
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recommended: 400x400px, max 2MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner Image */}
                <div>
                  <Label>Banner Image</Label>
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {bannerImagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={bannerImagePreview}
                            alt="Banner preview"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBannerImage(null)
                              setBannerImagePreview('')
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('banner-image')?.click()}
                            >
                              Choose Image
                            </Button>
                            <input
                              id="banner-image"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImageUpload(file, 'banner')
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recommended: 1200x300px, max 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>
                Connect your organization's social media presence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="discord">Discord</Label>
                  <Input
                    id="discord"
                    value={formData.discord}
                    onChange={(e) => handleInputChange('discord', e.target.value)}
                    placeholder="Discord server invite"
                  />
                </div>

                <div>
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={formData.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    placeholder="organization/repo"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Governance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Governance Settings</CardTitle>
              <CardDescription>
                Configure how your organization operates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessModel">Access Model</Label>
                  <Select value={formData.accessModel} onValueChange={(value) => handleInputChange('accessModel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Open - Anyone can join</SelectItem>
                      <SelectItem value="1">Invite - Invitation required</SelectItem>
                      <SelectItem value="2">Voting - Members vote on new members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="memberLimit">Member Limit</Label>
                  <Input
                    id="memberLimit"
                    type="number"
                    value={formData.memberLimit}
                    onChange={(e) => handleInputChange('memberLimit', e.target.value)}
                    placeholder="20"
                    min="1"
                    max="1000"
                  />
                </div>

                <div>
                  <Label htmlFor="feeModel">Fee Model</Label>
                  <Select value={formData.feeModel} onValueChange={(value) => handleInputChange('feeModel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Fees</SelectItem>
                      <SelectItem value="1">Fixed Fee</SelectItem>
                      <SelectItem value="2">Percentage Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="membershipFee">Membership Fee (ETH)</Label>
                  <Input
                    id="membershipFee"
                    type="number"
                    step="0.001"
                    value={formData.membershipFee}
                    onChange={(e) => handleInputChange('membershipFee', e.target.value)}
                    placeholder="0.0"
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="stakeAmount">GAME Token Stake *</Label>
                <Input
                  id="stakeAmount"
                  type="number"
                  value={formData.stakeAmount}
                  onChange={(e) => handleInputChange('stakeAmount', e.target.value)}
                  placeholder="1000"
                  min="100"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum 100 GAME tokens required to create an organization
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isCreating || !formData.name || !formData.description}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  {uploadProgress || 'Creating Organization...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </>
              )}
            </Button>
            <Link href="/control">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
