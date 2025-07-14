/**
 * Utilities for handling hierarchical IDs according to GIP-006
 * Format: orgId-P-proposalId (e.g., "ABCD1234-P-EFGH5678")
 */

/**
 * Check if an ID is in hierarchical format
 */
export function isHierarchicalId(id: string): boolean {
  return /^[A-Z0-9]{8}-[PC]-[A-Z0-9]{8}$/.test(id)
}

/**
 * Check if an ID is in legacy format (bytes32 hex)
 */
export function isLegacyId(id: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(id) || /^[a-fA-F0-9]{64}$/.test(id)
}

/**
 * Extract organization ID from hierarchical proposal ID
 */
export function extractOrgId(hierarchicalId: string): string {
  if (!isHierarchicalId(hierarchicalId)) {
    throw new Error('Invalid hierarchical ID format')
  }
  return hierarchicalId.substring(0, 8)
}

/**
 * Extract entity ID from hierarchical ID
 */
export function extractEntityId(hierarchicalId: string): string {
  if (!isHierarchicalId(hierarchicalId)) {
    throw new Error('Invalid hierarchical ID format')
  }
  return hierarchicalId.substring(11) // Skip "ABCD1234-P-"
}

/**
 * Extract entity type from hierarchical ID
 */
export function extractEntityType(hierarchicalId: string): 'P' | 'C' {
  if (!isHierarchicalId(hierarchicalId)) {
    throw new Error('Invalid hierarchical ID format')
  }
  return hierarchicalId.charAt(9) as 'P' | 'C'
}

/**
 * Validate hierarchical ID format
 */
export function validateHierarchicalId(id: string, expectedType?: 'P' | 'C'): boolean {
  if (!isHierarchicalId(id)) {
    return false
  }

  if (expectedType) {
    return extractEntityType(id) === expectedType
  }

  return true
}

/**
 * Generate hierarchical proposal ID format
 */
export function generateProposalId(orgId: string, proposalId: string): string {
  if (orgId.length !== 8) {
    throw new Error('Organization ID must be 8 characters')
  }
  if (proposalId.length !== 8) {
    throw new Error('Proposal ID must be 8 characters')
  }
  return `${orgId}-P-${proposalId}`
}

/**
 * Generate hierarchical campaign ID format
 */
export function generateCampaignId(orgId: string, campaignId: string): string {
  if (orgId.length !== 8) {
    throw new Error('Organization ID must be 8 characters')
  }
  if (campaignId.length !== 8) {
    throw new Error('Campaign ID must be 8 characters')
  }
  return `${orgId}-C-${campaignId}`
}

/**
 * Convert hierarchical ID to display format
 */
export function formatIdForDisplay(id: string): string {
  if (isHierarchicalId(id)) {
    return id // Already user-friendly
  }

  if (isLegacyId(id)) {
    // Truncate legacy IDs for display
    const cleanId = id.startsWith('0x') ? id.slice(2) : id
    return `${cleanId.substring(0, 8)}...${cleanId.substring(cleanId.length - 8)}`
  }

  return id
}

/**
 * Convert hierarchical ID to URL-safe format
 */
export function formatIdForUrl(id: string): string {
  if (isHierarchicalId(id)) {
    return id // Already URL-safe
  }

  if (isLegacyId(id)) {
    return id.startsWith('0x') ? id : `0x${id}`
  }

  return id
}

/**
 * Parse ID from URL parameter
 */
export function parseIdFromUrl(urlParam: string): string {
  // Handle both hierarchical and legacy formats
  if (isHierarchicalId(urlParam)) {
    return urlParam
  }

  if (isLegacyId(urlParam)) {
    return urlParam.startsWith('0x') ? urlParam : `0x${urlParam}`
  }

  return urlParam
}

/**
 * Determine which contract function to use based on ID format
 */
export function getContractFunctionName(baseFunction: string, id: string): string {
  if (isHierarchicalId(id)) {
    return `${baseFunction}V2`
  }
  return baseFunction
}

/**
 * Convert ID to appropriate contract argument format
 */
export function formatIdForContract(id: string): string {
  if (isHierarchicalId(id)) {
    return id // Use string directly for V2 functions
  }

  if (isLegacyId(id)) {
    return id.startsWith('0x') ? id : `0x${id}`
  }

  return id
}

/**
 * Check if we should use V2 functions based on ID format
 */
export function shouldUseV2Functions(id: string): boolean {
  return isHierarchicalId(id)
}

/**
 * Migration helper: convert between ID formats
 */
export function migrateIdFormat(id: string, targetFormat: 'hierarchical' | 'legacy'): string {
  if (targetFormat === 'hierarchical' && isLegacyId(id)) {
    // This would require contract lookup to get the hierarchical equivalent
    throw new Error('Legacy to hierarchical conversion requires contract lookup')
  }

  if (targetFormat === 'legacy' && isHierarchicalId(id)) {
    // This would require contract lookup to get the legacy equivalent
    throw new Error('Hierarchical to legacy conversion requires contract lookup')
  }

  return id
}
