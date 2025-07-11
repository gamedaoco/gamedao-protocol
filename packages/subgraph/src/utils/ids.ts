import { Bytes } from "@graphprotocol/graph-ts"

/**
 * Convert bytes8 organization ID to 8-character alphanumeric string
 * The bytes8 value contains the Base36 encoded characters
 */
export function bytes8ToAlphanumericString(bytes8: Bytes): string {
  // Convert bytes to string by interpreting each byte as a character
  let result = ""
  for (let i = 0; i < 8; i++) {
    let byte = bytes8[i]
    // Convert byte to character (ASCII)
    result += String.fromCharCode(byte)
  }
  return result
}

/**
 * Convert hex string to bytes8 format for organization ID processing
 */
export function hexToBytes8(hex: string): Bytes {
  // Remove 0x prefix if present
  if (hex.startsWith("0x")) {
    hex = hex.slice(2)
  }

  // Ensure it's exactly 16 characters (8 bytes)
  if (hex.length !== 16) {
    throw new Error("Invalid hex string length for bytes8")
  }

  return Bytes.fromHexString("0x" + hex)
}

/**
 * Get organization ID as string from bytes8 parameter
 */
export function getOrganizationIdString(orgIdBytes: Bytes): string {
  return bytes8ToAlphanumericString(orgIdBytes)
}
