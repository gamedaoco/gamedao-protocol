/**
 * Utility functions for handling organization IDs
 * Converts between bytes8 hex format and 8-character alphanumeric strings
 */

/**
 * Convert bytes8 hex string to 8-character alphanumeric string
 * @param bytes8Hex - Hex string like "0x5a5139473845415a"
 * @returns 8-character alphanumeric string like "Z5139GEZ"
 */
export function bytes8ToAlphanumericString(bytes8Hex: string): string {
  // Remove 0x prefix if present
  let hex = bytes8Hex.startsWith('0x') ? bytes8Hex.slice(2) : bytes8Hex

  // Ensure it's exactly 16 characters (8 bytes)
  if (hex.length !== 16) {
    console.warn('Invalid bytes8 hex length:', hex.length, 'for', bytes8Hex)
    return bytes8Hex // Return as-is if invalid
  }

  // Convert each pair of hex characters to ASCII character
  let result = ''
  for (let i = 0; i < 16; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result += String.fromCharCode(byte)
  }

  return result
}

/**
 * Convert 8-character alphanumeric string to bytes8 hex string
 * @param alphanumericId - 8-character string like "Z5139GEZ"
 * @returns Hex string like "0x5a5139473845415a"
 */
export function alphanumericStringToBytes8(alphanumericId: string): `0x${string}` {
  if (alphanumericId.length !== 8) {
    console.warn('Invalid alphanumeric ID length:', alphanumericId.length, 'for', alphanumericId)
    return alphanumericId // Return as-is if invalid
  }

  // Convert each character to hex
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const charCode = alphanumericId.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }

  return ('0x' + hex) as `0x${string}`
}

/**
 * Check if a string is a valid 8-character alphanumeric organization ID
 * @param id - String to check
 * @returns True if valid alphanumeric ID
 */
export function isValidAlphanumericId(id: string): boolean {
  if (id.length !== 8) return false
  return /^[0-9A-Z]{8}$/.test(id)
}

/**
 * Check if a string is a valid bytes8 hex organization ID
 * @param id - String to check
 * @returns True if valid bytes8 hex ID
 */
export function isValidBytes8Id(id: string): boolean {
  if (!id.startsWith('0x')) return false
  if (id.length !== 18) return false // 0x + 16 hex chars
  return /^0x[0-9a-fA-F]{16}$/.test(id)
}

/**
 * Convert organization ID to the format expected by the smart contract (bytes8 hex)
 * @param id - Organization ID in any format
 * @returns Bytes8 hex string for smart contract calls
 */
export function toContractId(id: string): `0x${string}` {
  if (isValidBytes8Id(id)) {
    return id as `0x${string}`
  }

  if (isValidAlphanumericId(id)) {
    return alphanumericStringToBytes8(id)
  }

  console.warn('Invalid organization ID format:', id)
  return alphanumericStringToBytes8(id)
}

/**
 * Convert organization ID to the format for display (8-character alphanumeric)
 * @param id - Organization ID in any format
 * @returns 8-character alphanumeric string for display
 */
export function toDisplayId(id: string): string {
  if (isValidAlphanumericId(id)) {
    return id
  }

  if (isValidBytes8Id(id)) {
    return bytes8ToAlphanumericString(id)
  }

  console.warn('Invalid organization ID format:', id)
  return id
}

/**
 * Extract organization ID from transaction logs
 * @param logs - Transaction logs
 * @param contractAddress - Factory contract address (the contract that emits OrganizationCreated events)
 * @returns Organization ID as alphanumeric string or null
 */
export function extractOrganizationIdFromLogs(logs: any[], contractAddress: string): string | null {
  try {
    // Find the OrganizationCreated event in the logs
    const organizationCreatedEvent = logs.find((log: any) => {
      const isFromFactoryContract = log.address.toLowerCase() === contractAddress.toLowerCase()
      const hasCorrectTopics = log.topics && log.topics.length === 4
      return isFromFactoryContract && hasCorrectTopics
    })

    if (organizationCreatedEvent) {
      // The second topic contains the organization ID (bytes8 but padded to 32 bytes)
      const orgIdBytes32 = organizationCreatedEvent.topics[1]
      if (orgIdBytes32) {
        // Extract only the first 8 bytes (16 hex chars) from the 32-byte value
        const orgIdBytes8 = orgIdBytes32.slice(0, 18) // 0x + 16 hex chars = 18 total
        console.log('🔍 Extracted organization ID:', {
          original: orgIdBytes32,
          extracted: orgIdBytes8,
          alphanumeric: bytes8ToAlphanumericString(orgIdBytes8)
        })
        return bytes8ToAlphanumericString(orgIdBytes8)
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting organization ID from logs:', error)
    return null
  }
}

// Viem-based decoder for greater reliability
export function extractOrganizationIdFromLogsViem(logs: any[], factoryAbi: any): string | null {
  try {
    // Lazy import to avoid SSR issues
    const { decodeEventLog } = require('viem') as typeof import('viem')

    for (const log of logs) {
      try {
        const decoded = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics })
        if (decoded?.eventName === 'OrganizationCreated' && decoded?.args?.id) {
          const idHex = (decoded.args.id as string)
          const bytes8 = idHex.startsWith('0x') ? idHex.slice(0, 18) : '0x' + idHex.slice(0, 16)
          return bytes8ToAlphanumericString(bytes8)
        }
      } catch (_) {
        // Continue; log may not match this ABI/event
      }
    }
    return null
  } catch (err) {
    console.error('Viem decode failed:', err)
    return null
  }
}
