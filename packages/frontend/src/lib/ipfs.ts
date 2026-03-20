// IPFS utility functions for storing content
// Using Pinata for IPFS storage
import { createLogger } from './logger'

// Create logger for IPFS operations
const logger = createLogger('IPFS', 'ipfs')

// Local Kubo (kubo) and Pinata are the only supported backends
const DEV = process.env.NODE_ENV !== 'production'
const IPFS_MODE = process.env.NEXT_PUBLIC_IPFS_MODE || (DEV ? 'local' : 'pinata')
const USE_LOCAL = IPFS_MODE === 'local'

// Gateway and API configuration (single gateway; no public fallback list)
const IPFS_PUBLIC_GATEWAY = process.env.NEXT_PUBLIC_IPFS_PUBLIC_GATEWAY
  || process.env.NEXT_PUBLIC_IPFS_GATEWAY
  || 'https://gateway.pinata.cloud/ipfs/'
const IPFS_PRIVATE_GATEWAY = process.env.NEXT_PUBLIC_IPFS_PRIVATE_GATEWAY
  || process.env.NEXT_PUBLIC_IPFS_LOCAL_GATEWAY
  || 'http://localhost:8080/ipfs/'
const GATEWAY = ( USE_LOCAL ? IPFS_PRIVATE_GATEWAY : IPFS_PUBLIC_GATEWAY ).replace(/\/?$/, '/')

// Derive local endpoints for kubo based on docker-compose (ports 8080/5001)
const LOCAL_IPFS_API = (process.env.NEXT_PUBLIC_IPFS_API || 'http://localhost:5001/api/v0').replace(/\/$/, '')

// Single gateway strategy (no public fallback list)
export const IPFS_GATEWAYS: string[] = [GATEWAY]

const IPFS_API_ENDPOINT = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
const IPFS_FILE_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS'

// Default gateway for new uploads and primary access
const DEFAULT_GATEWAY = GATEWAY

// Get Pinata API credentials from environment
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY

// Check if Pinata is configured
const isPinataConfigured = Boolean(PINATA_API_KEY && PINATA_SECRET_KEY)

async function kuboAdd(name: string, content: Blob | File): Promise<{ hash: string, url: string }> {
  const formData = new FormData()
  formData.append('file', content, name)

  const endpoint = `${LOCAL_IPFS_API}/add?pin=true&wrap-with-directory=false`
  logger.debug('Uploading to local Kubo', { endpoint, name })

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    logger.error('Local Kubo add error', { status: response.status, statusText: response.statusText, errorText })
    throw new Error(`Local IPFS add failed: ${response.status} ${response.statusText}`)
  }

  // Kubo can return NDJSON; parse last JSON line to get Hash
  const text = await response.text()
  let lastJson: any = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      lastJson = JSON.parse(trimmed)
    } catch (_) {
      // ignore non-JSON lines
    }
  }

  const hash: string | undefined = lastJson?.Hash || lastJson?.hash || lastJson?.Cid || lastJson?.cid
  if (!hash) {
    logger.error('Unable to parse Kubo add response', { text })
    throw new Error('Local IPFS add returned unexpected response')
  }

  return { hash, url: `ipfs://${hash}` }
}

export interface IPFSUploadResult {
  hash: string
  url: string
}

interface IPFSMetadata {
  name?: string
  description?: string
  [key: string]: any
}

async function fetchFromGateway(hash: string): Promise<Response> {
  const url = `${DEFAULT_GATEWAY}${hash}`
  logger.debug('Fetching from IPFS gateway', { url, hash })
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      headers: { 'Accept': 'application/json, image/*, */*' }
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Upload JSON data to IPFS
 */
export async function uploadJSONToIPFS(
  data: any,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  logger.info('Starting JSON upload to IPFS', {
    dataKeys: Object.keys(data),
    metadata,
    isPinataConfigured
  })

  try {
    if (!USE_LOCAL && isPinataConfigured) {
      logger.debug('Using Pinata API for JSON upload...')

      // Use real Pinata API
      const response = await fetch(IPFS_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY!,
          'pinata_secret_api_key': PINATA_SECRET_KEY!,
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: {
            name: metadata?.name || 'GameDAO Content',
            keyvalues: metadata || {}
          }
        })
      })

      logger.debug('Pinata JSON response status:', { status: response.status, statusText: response.statusText })

      if (!response.ok) {
        const errorText = await response.text()
                 logger.error('Pinata JSON API error:', { errorText, headers: Object.fromEntries(response.headers.entries()) })
        throw new Error(`Pinata API error: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      logger.info('Pinata JSON upload successful:', result)

      return {
        hash: result.IpfsHash,
        url: `ipfs://${result.IpfsHash}`
      }
    } else {
      logger.debug('Using local Kubo for JSON upload...')
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      const { hash, url } = await kuboAdd(metadata?.name || 'data.json', blob)
      if (DEV) {
        logger.info('Dev: JSON uploaded to local IPFS', { hash, url })
        // eslint-disable-next-line no-console
        console.info('[IPFS] JSON uploaded (local)', { hash, url })
      }
      return { hash, url }
    }
  } catch (error) {
    logger.error('Failed to upload JSON to IPFS:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      data,
      metadata
    })
    throw new Error(`IPFS JSON upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload file to IPFS
 */
export async function uploadFileToIPFS(
  file: File,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  logger.info('Starting file upload to IPFS', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    metadata,
    isPinataConfigured
  })

  try {
    if (!USE_LOCAL && isPinataConfigured) {
      logger.debug('Using Pinata API for file upload...')

      // Use real Pinata API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pinataMetadata', JSON.stringify({
        name: metadata?.name || file.name,
        keyvalues: metadata || {}
      }))

      logger.debug('Sending request to Pinata...')
      logger.debug('Request details:', {
        endpoint: IPFS_FILE_ENDPOINT,
        headers: {
          'pinata_api_key': PINATA_API_KEY ? `${PINATA_API_KEY.substring(0, 8)}...` : 'NOT SET',
          'pinata_secret_api_key': PINATA_SECRET_KEY ? `${PINATA_SECRET_KEY.substring(0, 8)}...` : 'NOT SET'
        },
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      })

      const response = await fetch(IPFS_FILE_ENDPOINT, {
        method: 'POST',
        headers: {
          'pinata_api_key': PINATA_API_KEY!,
          'pinata_secret_api_key': PINATA_SECRET_KEY!,
        },
        body: formData
      })

      logger.debug('Pinata response status:', { status: response.status, statusText: response.statusText })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Pinata API error:', errorText)
        logger.error('Response headers:', Object.fromEntries(response.headers.entries()))
        throw new Error(`Pinata API error: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      logger.info('Pinata upload successful:', result)

      return {
        hash: result.IpfsHash,
        url: `ipfs://${result.IpfsHash}`
      }
    } else {
      logger.debug('Using local Kubo for file upload...')
      const { hash, url } = await kuboAdd(file.name, file)
      if (DEV) {
        logger.info('Dev: File uploaded to local IPFS', { hash, url, fileName: file.name, fileSize: file.size })
        // eslint-disable-next-line no-console
        console.info('[IPFS] File uploaded (local)', { hash, url, name: file.name, size: file.size })
      }
      return { hash, url }
    }
  } catch (error) {
    logger.error('Failed to upload file to IPFS:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      fileName: file.name,
      fileSize: file.size,
      metadata
    })
    throw new Error(`IPFS file upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Domain-specific metadata helpers moved to lib/ipfsMetadata.ts to keep concerns separated

/**
 * Retrieve content from IPFS
 */
export async function getFromIPFS(hashOrUrl: string): Promise<any> {
  try {
    const hash = extractIPFSHash(hashOrUrl)

    // For development, retrieve from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`ipfs_${hash}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.data
      }
    }

    // Fetch from configured IPFS gateway
    const response = await fetchFromGateway(hash)
    return await response.json()
  } catch (error) {
    logger.error('Failed to retrieve from IPFS:', error)
    throw new Error('IPFS retrieval failed')
  }
}

/**
 * Extract IPFS hash from URL or return the hash if already clean
 */
export function extractIPFSHash(hashOrUrl: string): string {
  if (!hashOrUrl) return ''

  // Remove ipfs:// protocol if present
  if (hashOrUrl.startsWith('ipfs://')) {
    return hashOrUrl.replace('ipfs://', '')
  }

  // Remove configured gateway URL prefix if present
  if (hashOrUrl.startsWith(DEFAULT_GATEWAY)) {
    return hashOrUrl.replace(DEFAULT_GATEWAY, '')
  }

  // Return as-is if it's already a hash
  return hashOrUrl
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hashOrUrl: string): string {
  const hash = extractIPFSHash(hashOrUrl)
  return `${DEFAULT_GATEWAY}${hash}`
}

/**
 * Get a list of candidate IPFS gateway URLs for a given hash/URL
 */
export function getIPFSGatewayCandidates(hashOrUrl: string): string[] {
  const hash = extractIPFSHash(hashOrUrl)
  return [`${DEFAULT_GATEWAY}${hash}`]
}

/**
 * Generate a mock hash for development
 */
function generateMockHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Convert to base36 and pad to create a realistic looking hash
  const baseHash = Math.abs(hash).toString(36)
  return `Qm${baseHash}${'x'.repeat(Math.max(0, 44 - baseHash.length))}`
}

/**
 * Validate IPFS hash format
 */
export function isValidIPFSHash(hashOrUrl: string): boolean {
  // Basic validation for IPFS hash format
  const cleanHash = extractIPFSHash(hashOrUrl)
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanHash)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
