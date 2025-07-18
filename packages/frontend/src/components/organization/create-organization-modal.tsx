'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useOrganizationCreation } from '@/hooks/useOrganizationCreation'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useAccount } from 'wagmi'
import { formatAddress } from '@/lib/utils'
import { InsufficientBalanceWarning } from '@/components/wallet/wallet-balance'
import { uploadOrganizationMetadata } from '@/lib/ipfs'
import { useIPFSUpload } from '@/hooks/useIPFS'
import { AlertCircle, Shield, CreditCard, Gamepad2, CheckCircle, Loader2, Upload, Image, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLogger } from '@/hooks/useLogger'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface OrganizationFormData {
  name: string
  description: string
  orgType: number
  accessModel: number
  feeModel: number
  memberLimit: number
  membershipFee: string
  gameStakeRequired: string
  website: string
  twitter: string
  discord: string
  github: string
  tags: string
}

const ORG_TYPES = [
  { value: 0, label: 'Individual', description: 'Personal gaming profile or solo creator' },
  { value: 1, label: 'Company', description: 'Gaming company or studio' },
  { value: 2, label: 'DAO', description: 'Decentralized autonomous organization' },
  { value: 3, label: 'Hybrid', description: 'Mix of traditional and decentralized governance' }
]

const ACCESS_MODELS = [
  { value: 0, label: 'Open', description: 'Anyone can join instantly', icon: '🌐' },
  { value: 1, label: 'Voting', description: 'Members vote on new applicants', icon: '🗳️' },
  { value: 2, label: 'Invite', description: 'Only admins can invite members', icon: '✉️' }
]

const FEE_MODELS = [
  { value: 0, label: 'No Fees', description: 'Free to join and participate', icon: '🆓' },
  { value: 1, label: 'Reserve', description: 'Fees held in member account', icon: '🏦' },
  { value: 2, label: 'Transfer', description: 'Fees go to organization treasury', icon: '💰' }
]

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const { address, isConnected } = useAccount()
  const { refetch } = useOrganizations()
  const { ethBalance, gameBalance } = useTokenBalances()
  const { contracts } = useGameDAO()
  const { logger } = useLogger('CreateOrganizationModal', { category: 'ui' })

  // Use the comprehensive creation hook that handles approval
  const {
    isCreating,
    error: createError,
    currentStep,
    createOrganizationWithApproval
  } = useOrganizationCreation()

  // IPFS upload hook for better file handling
  const { uploadFile, isUploading, progress: ipfsUploadProgress, error: uploadError, reset: resetUpload } = useIPFSUpload()

  // Derive createSuccess from currentStep
  const createSuccess = currentStep === 'success'

  // Track if success handler has been called to prevent infinite loops
  const successHandledRef = useRef(false)

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    description: '',
    orgType: 2, // Default to DAO
    accessModel: 0, // Default to Open
    feeModel: 0, // Default to No Fees
    memberLimit: 0, // Default to no limit (unlimited)
    membershipFee: '0',
    gameStakeRequired: '10000',
    website: '',
    twitter: '',
    discord: '',
    github: '',
    tags: ''
  })



  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [bannerImage, setBannerImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>('')
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState('')

  const [step, setStep] = useState<'basic' | 'images' | 'governance' | 'economics' | 'review'>('basic')

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

    try {
      // Reset success handler flag at start of new creation
      successHandledRef.current = false

      logger.info('Creating organization with params', {
        name: formData.name,
        accessModel: formData.accessModel,
        memberLimit: formData.memberLimit,
        contractAddress: contracts.CONTROL,
        userAddress: address
      })

      setUploadProgress('Preparing metadata...')

      // Upload images to IPFS first
      let profileImageUrl = ''
      let bannerImageUrl = ''

      if (profileImage) {
        setUploadProgress('Uploading profile image to IPFS...')
        logger.info('Uploading profile image', { fileName: profileImage.name, fileSize: profileImage.size })
        const hash = await uploadFile(profileImage)
        profileImageUrl = `ipfs://${hash}`
        logger.info('Profile image uploaded', { hash, url: profileImageUrl })
      }

      if (bannerImage) {
        setUploadProgress('Uploading banner image to IPFS...')
        logger.info('Uploading banner image', { fileName: bannerImage.name, fileSize: bannerImage.size })
        const hash = await uploadFile(bannerImage)
        bannerImageUrl = `ipfs://${hash}`
        logger.info('Banner image uploaded', { hash, url: bannerImageUrl })
      }

      // Create metadata object
      const metadata = {
        name: formData.name,
        description: formData.description,
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

      console.log('📋 Created metadata object:', metadata)

      // Upload metadata to IPFS
      setUploadProgress('Uploading metadata to IPFS...')
      console.log('📤 Uploading metadata to IPFS...')
      const metadataResult = await uploadOrganizationMetadata(metadata)
      console.log('✅ Metadata uploaded:', metadataResult)

      setUploadProgress('Creating organization on blockchain...')

      const contractParams = {
        name: formData.name,
        metadataURI: metadataResult.url,
        orgType: formData.orgType,
        accessModel: formData.accessModel,
        feeModel: formData.feeModel,
        memberLimit: formData.memberLimit,
        membershipFee: formData.membershipFee,
        gameStakeRequired: formData.gameStakeRequired,
      }

      console.log('📋 Final contract parameters:', contractParams)

      await createOrganizationWithApproval({
        name: formData.name,
        description: formData.description,
        longDescription: formData.description,
        website: formData.website,
        twitter: formData.twitter,
        discord: formData.discord,
        github: formData.github,
        tags: formData.tags,
        orgType: formData.orgType,
        accessModel: formData.accessModel,
        feeModel: formData.feeModel,
        memberLimit: formData.memberLimit,
        membershipFee: formData.membershipFee,
        stakeAmount: formData.gameStakeRequired,
        profileImage: profileImage || undefined,
        bannerImage: bannerImage || undefined
      })

      console.log('✅ Organization creation transaction submitted')
      setUploadProgress('')

    } catch (error) {
      console.error('❌ Failed to create organization:', error)
      setUploadProgress('')

      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          console.log('User cancelled the transaction')
        } else if (error.message.includes('insufficient funds')) {
          console.error('Insufficient funds for transaction')
        } else {
          console.error('Transaction error:', error.message)
        }
      }
    }
  }

  // Handle success state change
  useEffect(() => {
    if (createSuccess && !successHandledRef.current) {
      successHandledRef.current = true
      console.log('🎉 Organization created successfully!')

      // Refetch organizations data
      refetch()

      if (onSuccess) onSuccess()
      onClose()

      // Reset form
      setFormData({
        name: '',
        description: '',
        orgType: 2,
        accessModel: 0,
        feeModel: 0,
        memberLimit: 0, // Default to no limit (unlimited)
        membershipFee: '0',
        gameStakeRequired: '10000',
        website: '',
        twitter: '',
        discord: '',
        github: '',
        tags: ''
      })
      setStep('basic')
    }
  }, [createSuccess, onSuccess, onClose])

  // Handle error state change - only during actual transaction attempts
  useEffect(() => {
    console.log('🔍 Error state check:', {
      createError: !!createError,
      isCreating,
      step,
      errorMessage: createError
    })

    // Only show toast errors during actual transaction attempts
    if (createError && isCreating) {
      console.error('❌ Organization creation failed:', createError)
      // Show user-friendly error message
      if (typeof createError === 'string') {
        if (createError.includes('user rejected')) {
          toast.error('Transaction was cancelled by user')
        } else if (createError.includes('insufficient funds')) {
          toast.error('Insufficient funds for gas fees')
        } else {
          toast.error('Failed to create organization. Please try again.')
        }
      } else {
        toast.error('Failed to create organization. Please try again.')
      }
    } else if (createError && !isCreating) {
      // Log but don't show toast for stale errors
      console.log('🔍 Stale error detected (not during creation):', createError)
    }
  }, [createError, isCreating, step])

  // Debug form data when entering review step
  useEffect(() => {
    if (step === 'review') {
      console.log('🔍 Review step - Form data:', formData)
      console.log('🔍 Review step - Validation:', {
        hasName: formData.name.trim().length > 0,
        hasDescription: formData.description.trim().length > 0,
        memberLimit: formData.memberLimit,
        isConnected,
        ethBalance: ethBalance.balance,
        gameBalance: gameBalance.balance,
      })
    }
  }, [step, formData, isConnected, ethBalance, gameBalance])

  // Reset any previous errors when opening the modal
  useEffect(() => {
    if (isOpen) {
      // Reset success handler flag
      successHandledRef.current = false

      // Reset form and clear any previous errors
      setFormData({
        name: '',
        description: '',
        orgType: 2,
        accessModel: 0,
        feeModel: 0,
        memberLimit: 0, // Default to no limit (unlimited)
        membershipFee: '0',
        gameStakeRequired: '10000',
        website: '',
        twitter: '',
        discord: '',
        github: '',
        tags: ''
      })
      setStep('basic')
    }
  }, [isOpen])

    const isFormValid = () => {
    // Step-specific validation
    switch (step) {
      case 'basic':
        return formData.name.trim().length > 0 && formData.description.trim().length > 0

      case 'images':
        return true // Images are optional

      case 'governance':
        return formData.memberLimit >= 0 // Allow 0 for unlimited members

      case 'economics':
        return true // Economics step is always valid (all fields have defaults)

      case 'review':
        if (!isConnected) return false

        // Check ETH balance for gas fees
        const hasEnoughEth = parseFloat(ethBalance.balance) >= 0.01

        // Check GAME balance if required
        const hasEnoughGame = parseFloat(gameBalance.balance) >= parseFloat(formData.gameStakeRequired)

        return hasEnoughEth && hasEnoughGame

      default:
        return false
    }
  }

  const nextStep = () => {
    if (step === 'basic') setStep('images')
    else if (step === 'images') setStep('governance')
    else if (step === 'governance') setStep('economics')
    else if (step === 'economics') setStep('review')
  }

  const prevStep = () => {
    if (step === 'review') setStep('economics')
    else if (step === 'economics') setStep('governance')
    else if (step === 'governance') setStep('images')
    else if (step === 'images') setStep('basic')
  }

  const renderStepContent = () => {
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your organization's mission and goals"
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Organization Type</Label>
                <Select
                  value={formData.orgType.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, orgType: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value.toString()}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'images':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Organization Images
                  </CardTitle>
                  <CardDescription>
                    Upload profile and banner images for your organization (optional)
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
                                <X className="h-4 w-4 mr-2" />
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
                                <X className="h-4 w-4 mr-2" />
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
                    Connect your organization's social media profiles (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://your-website.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        value={formData.twitter}
                        onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                        placeholder="@username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="discord">Discord</Label>
                      <Input
                        id="discord"
                        value={formData.discord}
                        onChange={(e) => setFormData(prev => ({ ...prev, discord: e.target.value }))}
                        placeholder="Discord server invite"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="github">GitHub</Label>
                      <Input
                        id="github"
                        value={formData.github}
                        onChange={(e) => setFormData(prev => ({ ...prev, github: e.target.value }))}
                        placeholder="username or organization"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="gaming, defi, nft, esports (comma-separated)"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

            case 'governance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Access Model</Label>
                <div className="grid gap-3 mt-2">
                  {ACCESS_MODELS.map((model) => (
                    <Card
                      key={model.value}
                      className={`cursor-pointer transition-colors ${
                        Number(formData.accessModel) === Number(model.value)
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, accessModel: Number(model.value) }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{model.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{model.label}</div>
                            <div className="text-sm text-muted-foreground">{model.description}</div>
                          </div>
                          {Number(formData.accessModel) === Number(model.value) && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="memberLimit">Member Limit</Label>
                <Input
                  id="memberLimit"
                  type="number"
                  min="0"
                  max="10000"
                  value={formData.memberLimit.toString()}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow empty string, convert to 0 when parsing
                    if (value === '' || value === '0') {
                      setFormData(prev => ({ ...prev, memberLimit: 0 }))
                    } else {
                      const parsed = parseInt(value)
                      if (!isNaN(parsed) && parsed >= 0) {
                        setFormData(prev => ({ ...prev, memberLimit: parsed }))
                      }
                    }
                  }}
                  placeholder="0 for unlimited"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum number of members (0 for unlimited)
                </p>
              </div>
            </div>
          </div>
        )

      case 'economics':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Fee Model</Label>
                <div className="grid gap-3 mt-2">
                  {FEE_MODELS.map((model) => (
                    <Card
                      key={model.value}
                      className={`cursor-pointer transition-colors ${
                        formData.feeModel === model.value
                          ? 'ring-2 ring-primary border-primary'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        feeModel: model.value,
                        membershipFee: model.value === 0 ? '0' : prev.membershipFee // Reset fee when no fees selected
                      }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{model.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium">{model.label}</div>
                            <div className="text-sm text-muted-foreground">{model.description}</div>
                          </div>
                          {formData.feeModel === model.value && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="membershipFee">Membership Fee (GAME)</Label>
                <Input
                  id="membershipFee"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.membershipFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, membershipFee: e.target.value }))}
                  className="mt-1"
                  disabled={formData.feeModel === 0}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.feeModel === 0
                    ? 'No membership fee required (free to join)'
                    : 'GAME tokens required to join the organization'
                  }
                </p>
              </div>

              <div>
                <Label htmlFor="gameStakeRequired">GAME Token Stake Required</Label>
                <Input
                  id="gameStakeRequired"
                  type="number"
                  min="10000"
                  step="1"
                  value={formData.gameStakeRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameStakeRequired: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  GAME tokens required to create organization (minimum 10000 GAME)
                </p>
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Name:</span> {formData.name}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {ORG_TYPES.find(t => t.value === formData.orgType)?.label}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Governance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Access Model:</span> {ACCESS_MODELS.find(a => a.value === formData.accessModel)?.label}
                  </div>
                  <div>
                    <span className="font-medium">Member Limit:</span> {formData.memberLimit === 0 ? 'Unlimited' : formData.memberLimit}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Economics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Fee Model:</span> {FEE_MODELS.find(f => f.value === formData.feeModel)?.label}
                  </div>
                  {formData.feeModel !== 0 && formData.membershipFee !== '0' && (
                    <div>
                      <span className="font-medium">Membership Fee:</span> {formData.membershipFee} GAME
                    </div>
                  )}
                  <div>
                    <span className="font-medium">GAME Stake Required:</span> {formData.gameStakeRequired} GAME
                  </div>
                </CardContent>
              </Card>

              {/* Balance Checks */}
              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Balance Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* ETH for gas fees */}
                    {parseFloat(ethBalance.balance) < 0.01 && (
                      <InsufficientBalanceWarning
                        requiredToken="ETH"
                        requiredAmount="0.01"
                        currentAmount={ethBalance.formatted}
                      />
                    )}

                    {/* GAME tokens if required */}
                    {parseFloat(gameBalance.balance) < parseFloat(formData.gameStakeRequired) && (
                      <InsufficientBalanceWarning
                        requiredToken="GAME"
                        requiredAmount={formData.gameStakeRequired}
                        currentAmount={gameBalance.formatted}
                      />
                    )}

                    {/* Show success if balances are sufficient */}
                    {parseFloat(ethBalance.balance) >= 0.01 &&
                     parseFloat(gameBalance.balance) >= parseFloat(formData.gameStakeRequired) && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          Sufficient balance to create organization
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isCreating && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-800">
                    {currentStep === 'uploading' && 'Uploading metadata to IPFS...'}
                    {currentStep === 'approving' && 'Requesting GAME token approval...'}
                    {currentStep === 'creating' && 'Creating organization on blockchain...'}
                    {currentStep === 'confirming' && 'Waiting for transaction confirmation...'}
                    {!['uploading', 'approving', 'creating', 'confirming'].includes(currentStep) && 'Processing...'}
                  </span>
                </div>
              )}

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    Failed to create organization. Please try again.
                  </span>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Not Connected</DialogTitle>
            <DialogDescription>
              Please connect your wallet to create an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Set up your gaming organization or DAO with custom governance and membership rules.
          </DialogDescription>
        </DialogHeader>

        {/* Connection Info */}
        {address && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Connected Account:</span>
              <Badge variant="secondary">{formatAddress(address)}</Badge>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {['basic', 'images', 'governance', 'economics', 'review'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName ? 'bg-primary text-primary-foreground' :
                ['basic', 'images', 'governance', 'economics', 'review'].indexOf(step) > index ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < 4 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  ['basic', 'images', 'governance', 'economics', 'review'].indexOf(step) > index ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {renderStepContent()}

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'basic' && (
                <Button type="button" variant="outline" onClick={prevStep} disabled={isCreating}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Transaction status indicator */}
              {isCreating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Creating organization...</span>
                </div>
              )}

              {createError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <span>❌ Transaction failed</span>
                </div>
              )}

              <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
                Cancel
              </Button>

              {step === 'review' ? (
                <Button
                  type="submit"
                  disabled={!isFormValid() || isCreating || createSuccess}
                  className="min-w-[120px]"
                >
                  {isCreating ? 'Creating...' : createSuccess ? 'Created!' : 'Create Organization'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isFormValid() || isCreating}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
