import { createLogger } from './logger'
import { uploadJSONToIPFS } from './ipfs'
import type { IPFSUploadResult } from './ipfs'

const logger = createLogger('IPFSMeta', 'ipfs')

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
  logger.info('Starting organization metadata upload', metadata)

  const data = {
    ...metadata,
    type: 'organization',
    version: '1.0',
    created: new Date().toISOString()
  }

  logger.debug('Final metadata to upload:', data)

  const result = await uploadJSONToIPFS(data, {
    name: metadata.name,
    description: `Metadata for ${metadata.name} organization`
  })

  logger.info('Organization metadata upload result', result)
  return result
}

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


