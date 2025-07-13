'use client'

import { useState, useEffect, useMemo } from 'react'
import { useIPFS, useIPFSBatch } from './useIPFS'
import { getIPFSUrl } from '@/lib/ipfs'

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
  retry: () => void
}

/**
 * Hook to fetch organization metadata from IPFS with enhanced loading and error handling
 */
export function useOrganizationMetadata(metadataURI?: string): UseOrganizationMetadataResult {
  const {
    data: metadata,
    isLoading,
    error,
    retry
  } = useIPFS(metadataURI, {
    retryAttempts: 3,
    retryDelay: 1000,
    autoRetry: true,
    enabled: !!metadataURI
  })

  // Convert IPFS URLs to HTTP URLs for images
  const bannerImageUrl = useMemo(() =>
    metadata?.bannerImage ? getIPFSUrl(metadata.bannerImage) : null,
    [metadata?.bannerImage]
  )

  const profileImageUrl = useMemo(() =>
    metadata?.profileImage ? getIPFSUrl(metadata.profileImage) : null,
    [metadata?.profileImage]
  )

  return {
    metadata,
    isLoading,
    error,
    bannerImageUrl,
    profileImageUrl,
    retry
  }
}

/**
 * Hook to fetch multiple organization metadata from IPFS efficiently
 */
export function useOrganizationsMetadata(metadataURIs: string[]): Record<string, UseOrganizationMetadataResult> {
  const { results, retry } = useIPFSBatch(metadataURIs, {
    retryAttempts: 2,
    retryDelay: 1000,
    autoRetry: true
  })

  return useMemo(() => {
    const transformedResults: Record<string, UseOrganizationMetadataResult> = {}

    metadataURIs.forEach(uri => {
      const result = results[uri]
      if (result) {
        const metadata = result.data
        transformedResults[uri] = {
          metadata,
          isLoading: result.isLoading,
          error: result.error,
          bannerImageUrl: metadata?.bannerImage ? getIPFSUrl(metadata.bannerImage) : null,
          profileImageUrl: metadata?.profileImage ? getIPFSUrl(metadata.profileImage) : null,
          retry
        }
      } else {
        // Default state for URIs not yet processed
        transformedResults[uri] = {
          metadata: null,
          isLoading: true,
          error: null,
          bannerImageUrl: null,
          profileImageUrl: null,
          retry
        }
      }
    })

    return transformedResults
  }, [results, metadataURIs, retry])
}
