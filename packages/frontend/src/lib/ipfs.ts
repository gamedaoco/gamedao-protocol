// IPFS utility functions for storing content
// Using a public IPFS gateway for development - in production, use your own IPFS node

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'
const IPFS_API_ENDPOINT = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
const IPFS_FILE_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS'

// For development, we'll use a mock IPFS service
// In production, integrate with Pinata, Infura, or your own IPFS node

interface IPFSUploadResult {
  hash: string
  url: string
}

interface IPFSMetadata {
  name?: string
  description?: string
  [key: string]: any
}

/**
 * Upload JSON data to IPFS
 */
export async function uploadJSONToIPFS(
  data: any,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  try {
    // For development, simulate IPFS upload with local storage
    const hash = generateMockHash(JSON.stringify(data))
    const url = `ipfs://${hash}`

    // Store in localStorage for development
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ipfs_${hash}`, JSON.stringify({
        data,
        metadata,
        timestamp: Date.now()
      }))
    }

    return { hash, url }
  } catch (error) {
    console.error('Failed to upload JSON to IPFS:', error)
    throw new Error('IPFS upload failed')
  }
}

/**
 * Upload file to IPFS
 */
export async function uploadFileToIPFS(
  file: File,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  try {
    // For development, simulate file upload
    const hash = generateMockHash(file.name + file.size + file.lastModified)
    const url = `ipfs://${hash}`

    // Store file info in localStorage for development
    if (typeof window !== 'undefined') {
      const reader = new FileReader()
      reader.onload = () => {
        localStorage.setItem(`ipfs_file_${hash}`, JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result,
          metadata,
          timestamp: Date.now()
        }))
      }
      reader.readAsDataURL(file)
    }

    return { hash, url }
  } catch (error) {
    console.error('Failed to upload file to IPFS:', error)
    throw new Error('IPFS file upload failed')
  }
}

/**
 * Upload markdown content to IPFS
 */
export async function uploadMarkdownToIPFS(
  markdown: string,
  title?: string
): Promise<IPFSUploadResult> {
  const data = {
    content: markdown,
    title,
    type: 'markdown',
    version: '1.0',
    created: new Date().toISOString()
  }

  return uploadJSONToIPFS(data, {
    name: title || 'Markdown Document',
    description: 'Markdown content stored on IPFS'
  })
}

/**
 * Upload organization metadata to IPFS
 */
export async function uploadOrganizationMetadata(metadata: {
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
}): Promise<IPFSUploadResult> {
  const data = {
    ...metadata,
    type: 'organization',
    version: '1.0',
    created: new Date().toISOString()
  }

  return uploadJSONToIPFS(data, {
    name: metadata.name,
    description: `Metadata for ${metadata.name} organization`
  })
}

/**
 * Upload campaign metadata to IPFS
 */
export async function uploadCampaignMetadata(metadata: {
  title: string
  description: string
  longDescription?: string
  images?: string[]
  video?: string
  roadmap?: string
  team?: Array<{
    name: string
    role: string
    image?: string
    bio?: string
  }>
  rewards?: Array<{
    amount: string
    title: string
    description: string
    image?: string
  }>
}): Promise<IPFSUploadResult> {
  const data = {
    ...metadata,
    type: 'campaign',
    version: '1.0',
    created: new Date().toISOString()
  }

  return uploadJSONToIPFS(data, {
    name: metadata.title,
    description: `Metadata for ${metadata.title} campaign`
  })
}

/**
 * Upload proposal metadata to IPFS
 */
export async function uploadProposalMetadata(metadata: {
  title: string
  description: string
  longDescription?: string
  rationale?: string
  implementation?: string
  risks?: string
  timeline?: string
  budget?: string
}): Promise<IPFSUploadResult> {
  const data = {
    ...metadata,
    type: 'proposal',
    version: '1.0',
    created: new Date().toISOString()
  }

  return uploadJSONToIPFS(data, {
    name: metadata.title,
    description: `Metadata for ${metadata.title} proposal`
  })
}

/**
 * Retrieve content from IPFS
 */
export async function getFromIPFS(hashOrUrl: string): Promise<any> {
  try {
    const hash = hashOrUrl.replace('ipfs://', '')

    // For development, retrieve from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`ipfs_${hash}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.data
      }
    }

    // In production, fetch from IPFS gateway
    const response = await fetch(`${IPFS_GATEWAY}${hash}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to retrieve from IPFS:', error)
    throw new Error('IPFS retrieval failed')
  }
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hashOrUrl: string): string {
  if (hashOrUrl.startsWith('ipfs://')) {
    return hashOrUrl.replace('ipfs://', IPFS_GATEWAY)
  }
  return `${IPFS_GATEWAY}${hashOrUrl}`
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
export function isValidIPFSHash(hash: string): boolean {
  // Basic validation for IPFS hash format
  const cleanHash = hash.replace('ipfs://', '')
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
