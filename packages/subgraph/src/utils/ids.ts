import { Bytes } from "@graphprotocol/graph-ts"

/**
 * Convert bytes8 organization ID to alphanumeric string for use as entity ID
 * @param orgIdBytes8 - The bytes8 organization ID from the contract
 * @returns 8-character alphanumeric string
 */
export function getOrganizationIdString(orgIdBytes8: Bytes): string {
  // Convert bytes directly to ASCII characters
  let result = ''
  for (let i = 0; i < 8; i++) {
    const byteValue = orgIdBytes8[i]
    result += String.fromCharCode(byteValue)
  }
  return result
}

/**
 * Convert alphanumeric string back to bytes8 (if needed)
 * @param alphanumericId - 8-character alphanumeric string
 * @returns Bytes8 representation
 */
export function alphanumericStringToBytes8(alphanumericId: string): Bytes {
  if (alphanumericId.length !== 8) {
    // Invalid length, return empty bytes
    return Bytes.fromHexString("0x0000000000000000")
  }

  // Convert each character to hex
  let hex = ''
  for (let i = 0; i < 8; i++) {
    const charCode = alphanumericId.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }

  return Bytes.fromHexString('0x' + hex)
}
