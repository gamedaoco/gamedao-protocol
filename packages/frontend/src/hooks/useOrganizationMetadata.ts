'use client'

import { useState, useEffect } from 'react'
import { getFromIPFS, getIPFSUrl } from '@/lib/ipfs'

export interface OrganizationMetadata {
  name: string
  description: string
  longDescription?: string
  profileImage?: string
  bannerImage?: string
  website?: string
  social?: {
    twitter?: string
    discord?: string
    github?: string
  }
  tags?: string[]
  type?: string
  version?: string
  created?: string
}

export interface UseOrganizationMetadataResult {
  metadata: OrganizationMetadata | null
  isLoading: boolean
  error: string | null
  bannerImageUrl: string | null
  profileImageUrl: string | null
}

export function useOrganizationMetadata(metadataURI?: string): UseOrganizationMetadataResult {
  const [metadata, setMetadata] = useState<OrganizationMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetadata() {
      if (!metadataURI) {
        setMetadata(null)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log('📤 Fetching organization metadata from IPFS:', metadataURI)

        const data = await getFromIPFS(metadataURI)
        console.log('✅ Organization metadata fetched:', data)

        setMetadata(data)
      } catch (err) {
        console.error('❌ Failed to fetch organization metadata:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch metadata')
        setMetadata(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetadata()
  }, [metadataURI])

  // Convert IPFS URLs to HTTP URLs for banner and profile images
  const bannerImageUrl = metadata?.bannerImage ? getIPFSUrl(metadata.bannerImage) : null
  const profileImageUrl = metadata?.profileImage ? getIPFSUrl(metadata.profileImage) : null

  return {
    metadata,
    isLoading,
    error,
    bannerImageUrl,
    profileImageUrl
  }
}

// Hook for fetching multiple organization metadata
export function useOrganizationsMetadata(metadataURIs: string[]): Record<string, UseOrganizationMetadataResult> {
  const [results, setResults] = useState<Record<string, UseOrganizationMetadataResult>>({})

  useEffect(() => {
    async function fetchAllMetadata() {
      const newResults: Record<string, UseOrganizationMetadataResult> = {}

      // Initialize all results with loading state
      metadataURIs.forEach(uri => {
        if (uri) {
          newResults[uri] = {
            metadata: null,
            isLoading: true,
            error: null,
            bannerImageUrl: null,
            profileImageUrl: null
          }
        }
      })

      setResults(newResults)

      // Fetch metadata for each URI
      await Promise.allSettled(
        metadataURIs.map(async (uri) => {
          if (!uri) return

          try {
            console.log('📤 Fetching organization metadata from IPFS:', uri)
            const data = await getFromIPFS(uri)
            console.log('✅ Organization metadata fetched:', data)

            const bannerImageUrl = data?.bannerImage ? getIPFSUrl(data.bannerImage) : null
            const profileImageUrl = data?.profileImage ? getIPFSUrl(data.profileImage) : null

            setResults(prev => ({
              ...prev,
              [uri]: {
                metadata: data,
                isLoading: false,
                error: null,
                bannerImageUrl,
                profileImageUrl
              }
            }))
          } catch (err) {
            console.error('❌ Failed to fetch organization metadata:', err)
            setResults(prev => ({
              ...prev,
              [uri]: {
                metadata: null,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to fetch metadata',
                bannerImageUrl: null,
                profileImageUrl: null
              }
            }))
          }
        })
      )
    }

    if (metadataURIs.length > 0) {
      fetchAllMetadata()
    }
  }, [metadataURIs])

  return results
}
