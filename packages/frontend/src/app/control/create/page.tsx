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
import { useOrganizationCreation } from '@/hooks/useOrganizationCreation'
import { useAccount } from 'wagmi'

import { Plus, ArrowLeft, Upload, Image as ImageIcon, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'


// Dynamically import markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

export default function CreateOrganizationPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { contracts, contractsValid, chainId } = useGameDAO()
  const {
    createOrganizationWithApproval,
    isCreating,
    isApproving,
    progress,
    currentStep,
    error: creationError,
    createdOrgId,
    resetState
  } = useOrganizationCreation()

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
    stakeAmount: '10000'
  })

  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [bannerImage, setBannerImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('')

  // These states are now managed by the useOrganizationCreation hook
  const uploadProgress = progress
  const isApprovalConfirming = isApproving
  const createSuccess = currentStep === 'success'

  console.log('🔍 Create page state:', {
    isConnected,
    contracts,
    contractsValid,
    chainId,
    isCreating,
    currentStep,
    creationError: creationError,
    createdOrgId,
    isApproving,
    progress,
    profileImagePreview: !!profileImagePreview,
    bannerImagePreview: !!bannerImagePreview,
    profileImageLength: profileImagePreview?.length || 0,
    bannerImageLength: bannerImagePreview?.length || 0,
    renderTime: new Date().toISOString()
  })

  // Handle success state - redirect after transaction is confirmed
  useEffect(() => {
    if (currentStep === 'success') {
      console.log('🎉 Organization created successfully! Redirecting to:', createdOrgId)

      const timeoutId = setTimeout(() => {
        resetState()
        if (createdOrgId && createdOrgId.length >= 8) {
          router.push(`/control/${createdOrgId}`)
        } else {
          router.push('/control')
        }
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [currentStep, createdOrgId, router])

  const handleImageUpload = (file: File, type: 'profile' | 'banner') => {
    console.log('🖼️ Image upload triggered:', { fileName: file.name, fileSize: file.size, type })

    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        console.log('🖼️ Image preview generated:', { type, previewLength: preview.length })

        if (type === 'profile') {
          setProfileImage(file)
          setProfileImagePreview(preview)
          console.log('🖼️ Profile image set:', { hasFile: !!file, hasPreview: !!preview })
        } else {
          setBannerImage(file)
          setBannerImagePreview(preview)
          console.log('🖼️ Banner image set:', { hasFile: !!file, hasPreview: !!preview })
        }
      }
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 Form submitted!')
    console.log('📋 Form data:', formData)

    if (!isConnected || !contracts) {
      console.error('❌ Prerequisites not met:', { isConnected, contracts })
      return
    }

    try {
      await createOrganizationWithApproval({
        name: formData.name,
        description: formData.description,
        longDescription: formData.longDescription,
        website: formData.website,
        twitter: formData.twitter,
        discord: formData.discord,
        github: formData.github,
        tags: formData.tags,
        orgType: parseInt(formData.orgType),
        accessModel: parseInt(formData.accessModel),
        feeModel: parseInt(formData.feeModel),
        memberLimit: parseInt(formData.memberLimit),
        membershipFee: formData.membershipFee,
        stakeAmount: formData.stakeAmount,
        profileImage: profileImage || undefined,
        bannerImage: bannerImage || undefined,
      })
    } catch (error) {
      console.error('❌ Failed to create organization:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to create organization: ${errorMessage}`)
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
    <div className="container mx-auto px-4 py-8 relative">
      {/* Fullscreen dimmed overlay during creation process */}
      {(isCreating || isApproving || isApprovalConfirming || currentStep === 'success') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mb-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {currentStep === 'success' ? 'Organization Created!' : 'Creating Organization'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {currentStep === 'success'
                  ? 'Redirecting to your new organization...'
                  : uploadProgress || 'Please wait while we process your request...'}
              </p>
              {currentStep === 'success' && (
                <div className="text-green-600 dark:text-green-400 font-medium">
                  ✅ Success! Redirecting in 2 seconds...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

        {/* Loading Overlay */}
        {(isCreating || isApproving || isApprovalConfirming) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Creating Organization</h3>
                  <p className="text-muted-foreground text-sm">
                    {uploadProgress || 'Please wait while we create your organization...'}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: uploadProgress.includes('Redirecting') ? '100%' :
                             uploadProgress.includes('confirmation') ? '95%' :
                             uploadProgress.includes('blockchain') ? '85%' :
                             uploadProgress.includes('Approving') ? '80%' :
                             uploadProgress.includes('metadata') ? '75%' :
                             uploadProgress.includes('banner') ? '50%' :
                             uploadProgress.includes('profile') ? '25%' : '10%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {createSuccess && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 text-green-800">Organization Created!</h3>
                  <p className="text-muted-foreground text-sm">
                    {createdOrgId ? 'Redirecting to your new collective...' : 'Redirecting to collectives page...'}
                  </p>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full w-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Dimmed overlay for form during transaction */}
          <div className={`${(isCreating || isApproving || isApprovalConfirming) ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300`}>
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
                  <ImageIcon className="h-5 w-5" />
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
                            <Image
                              src={profileImagePreview}
                              alt="Profile preview"
                              width={96}
                              height={96}
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
                                  console.log('📁 Profile image input changed:', e.target.files)
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    console.log('📁 Profile image file selected:', { name: file.name, size: file.size, type: file.type })
                                    handleImageUpload(file, 'profile')
                                  } else {
                                    console.log('📁 No profile image file selected')
                                  }
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
                            <Image
                              src={bannerImagePreview}
                              alt="Banner preview"
                              width={400}
                              height={96}
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
                                  console.log('📁 Banner image input changed:', e.target.files)
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    console.log('📁 Banner image file selected:', { name: file.name, size: file.size, type: file.type })
                                    handleImageUpload(file, 'banner')
                                  } else {
                                    console.log('📁 No banner image file selected')
                                  }
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
                  Connect your organization&apos;s social media presence
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
                    <Label htmlFor="membershipFee">Membership Fee (GAME)</Label>
                    <Input
                      id="membershipFee"
                      type="number"
                      step="1"
                      value={formData.membershipFee}
                      onChange={(e) => handleInputChange('membershipFee', e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      GAME tokens required to join the organization
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="stakeAmount">GAME Token Stake *</Label>
                  <Input
                    id="stakeAmount"
                    type="number"
                    value={formData.stakeAmount}
                    onChange={(e) => handleInputChange('stakeAmount', e.target.value)}
                    placeholder="10000"
                    min="10000"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum 10000 GAME tokens required to create an organization
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isCreating || isApproving || isApprovalConfirming || !formData.name || !formData.description}
              className="flex-1"
            >
              {(isCreating || isApproving || isApprovalConfirming) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
              <Button
                type="button"
                variant="outline"
                disabled={isCreating || isApproving || isApprovalConfirming}
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
