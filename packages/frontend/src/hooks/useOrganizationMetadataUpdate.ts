'use client'

import { useState, useCallback } from 'react'
import { useIPFSUpload } from './useIPFS'
import { useLogger } from './useLogger'
import { uploadJSONToIPFS } from '@/lib/ipfs'

interface OrganizationMetadataUpdate {
  profileImage?: string
  bannerImage?: string
  name?: string
  description?: string
  website?: string
  social?: {
    twitter?: string
    discord?: string
    github?: string
  }
  tags?: string[]
}

interface UseOrganizationMetadataUpdateResult {
  updateProfileImage: (file: File) => Promise<string>
  updateBannerImage: (file: File) => Promise<string>
  updateMetadata: (updates: OrganizationMetadataUpdate) => Promise<string>
  updatedProfileImage: string | null
  updatedBannerImage: string | null
  updatedMetadata: any | null
  isUpdating: boolean
  error: string | null
  reset: () => void
}

export function useOrganizationMetadataUpdate(
  organizationId: string,
  currentMetadata?: any
): UseOrganizationMetadataUpdateResult {
  const [updatedProfileImage, setUpdatedProfileImage] = useState<string | null>(null)
  const [updatedBannerImage, setUpdatedBannerImage] = useState<string | null>(null)
  const [updatedMetadata, setUpdatedMetadata] = useState<any | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { uploadFile } = useIPFSUpload()
  const { logUserAction } = useLogger('useOrganizationMetadataUpdate', { category: 'app' })

  const updateProfileImage = useCallback(async (file: File): Promise<string> => {
    setIsUpdating(true)
    setError(null)

    try {
      logUserAction('profile_image_update_started', {
        organizationId,
        fileSize: file.size,
        fileType: file.type
      })

      const hash = await uploadFile(file)
      setUpdatedProfileImage(hash)

      logUserAction('profile_image_update_completed', {
        organizationId,
        ipfsHash: hash
      })

      // TODO: When contract update function is available, call it here
      // await updateOrganizationMetadataOnChain(organizationId, { profileImage: hash })

      return hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile image'
      setError(errorMessage)

      logUserAction('profile_image_update_failed', {
        organizationId,
        error: errorMessage
      })

      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [organizationId, uploadFile, logUserAction])

  const updateBannerImage = useCallback(async (file: File): Promise<string> => {
    setIsUpdating(true)
    setError(null)

    try {
      logUserAction('banner_image_update_started', {
        organizationId,
        fileSize: file.size,
        fileType: file.type
      })

      const hash = await uploadFile(file)
      setUpdatedBannerImage(hash)

      logUserAction('banner_image_update_completed', {
        organizationId,
        ipfsHash: hash
      })

      // TODO: When contract update function is available, call it here
      // await updateOrganizationMetadataOnChain(organizationId, { bannerImage: hash })

      return hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update banner image'
      setError(errorMessage)

      logUserAction('banner_image_update_failed', {
        organizationId,
        error: errorMessage
      })

      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [organizationId, uploadFile, logUserAction])

  const updateMetadata = useCallback(async (updates: OrganizationMetadataUpdate): Promise<string> => {
    setIsUpdating(true)
    setError(null)

    try {
      logUserAction('metadata_update_started', {
        organizationId,
        updates: Object.keys(updates)
      })

      // Merge with current metadata
      const updatedMetadata = {
        ...currentMetadata,
        ...updates,
        // Preserve social media object structure
        social: {
          ...currentMetadata?.social,
          ...updates.social
        }
      }

      // Upload updated metadata to IPFS
      const result = await uploadJSONToIPFS(updatedMetadata)
      setUpdatedMetadata(updatedMetadata)

      logUserAction('metadata_update_completed', {
        organizationId,
        ipfsHash: result.hash
      })

      // TODO: When contract update function is available, call it here
      // await updateOrganizationMetadataURIOnChain(organizationId, result.url)

      return result.hash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update metadata'
      setError(errorMessage)

      logUserAction('metadata_update_failed', {
        organizationId,
        error: errorMessage
      })

      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [organizationId, currentMetadata, logUserAction])

  const reset = useCallback(() => {
    setUpdatedProfileImage(null)
    setUpdatedBannerImage(null)
    setUpdatedMetadata(null)
    setError(null)
    setIsUpdating(false)
  }, [])

  return {
    updateProfileImage,
    updateBannerImage,
    updateMetadata,
    updatedProfileImage,
    updatedBannerImage,
    updatedMetadata,
    isUpdating,
    error,
    reset
  }
}

// TODO: Implement this function when contract support is available
// async function updateOrganizationMetadataOnChain(
//   organizationId: string,
//   updates: { profileImage?: string; bannerImage?: string }
// ) {
//   // This will call the smart contract function to update organization metadata
//   // For now, this is a placeholder
//   console.log('Contract update not yet implemented:', { organizationId, updates })
// }

// TODO: Implement this function when contract support is available
// async function updateOrganizationMetadataURIOnChain(
//   organizationId: string,
//   metadataURI: string
// ) {
//   // This will call the smart contract function to update the organization's metadataURI
//   // For now, this is a placeholder
//   console.log('Contract metadata URI update not yet implemented:', { organizationId, metadataURI })
// }
