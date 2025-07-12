import { parseUnits, formatUnits } from 'viem'

/**
 * Token configuration with proper decimal handling
 */
export const TOKEN_DECIMALS = {
  GAME: 18,
  USDC: 6,
  ETH: 18,
} as const

export type TokenSymbol = keyof typeof TOKEN_DECIMALS

/**
 * Safely convert a user input amount to the proper BigInt for a specific token
 * @param value - The user input value (string or number)
 * @param tokenSymbol - The token symbol to determine decimals
 * @param fallback - Fallback value if conversion fails
 * @returns BigInt representation with proper decimals
 */
export function parseTokenAmount(
  value: string | number,
  tokenSymbol: TokenSymbol,
  fallback = '0'
): bigint {
  try {
    if (typeof value === 'number') {
      value = value.toString()
    }

    if (typeof value !== 'string' || value.trim() === '') {
      return parseUnits(fallback, TOKEN_DECIMALS[tokenSymbol])
    }

    // Clean the input - remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')

    if (cleaned === '' || cleaned === '.') {
      return parseUnits(fallback, TOKEN_DECIMALS[tokenSymbol])
    }

    // Use parseUnits which handles decimals properly
    return parseUnits(cleaned, TOKEN_DECIMALS[tokenSymbol])
  } catch (error) {
    console.warn(`Failed to parse token amount for ${tokenSymbol}:`, value, error)
    return parseUnits(fallback, TOKEN_DECIMALS[tokenSymbol])
  }
}

/**
 * Format a BigInt token amount to human-readable string
 * @param value - The BigInt value
 * @param tokenSymbol - The token symbol to determine decimals
 * @param precision - Number of decimal places to show
 * @returns Formatted string
 */
export function formatTokenAmount(
  value: bigint,
  tokenSymbol: TokenSymbol,
  precision = 4
): string {
  try {
    const formatted = formatUnits(value, TOKEN_DECIMALS[tokenSymbol])
    const num = parseFloat(formatted)

    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'

    return num.toFixed(precision).replace(/\.?0+$/, '')
  } catch (error) {
    console.warn(`Failed to format token amount for ${tokenSymbol}:`, value, error)
    return '0'
  }
}

/**
 * Check if two token amounts are equal (accounting for precision)
 * @param a - First amount
 * @param b - Second amount
 * @returns Whether amounts are equal
 */
export function isTokenAmountEqual(
  a: bigint,
  b: bigint
): boolean {
  return a === b
}

/**
 * Convert user input to the exact BigInt needed for contract calls
 * This ensures approval amounts match exactly with contract call amounts
 * @param userInput - User input string
 * @param tokenSymbol - Token symbol
 * @returns BigInt for contract calls
 */
export function toContractAmount(
  userInput: string,
  tokenSymbol: TokenSymbol
): bigint {
  return parseTokenAmount(userInput, tokenSymbol)
}

/**
 * Validate that a user has sufficient balance for a transaction
 * @param userBalance - User's current balance (BigInt)
 * @param requiredAmount - Required amount (BigInt)
 * @returns Whether user has sufficient balance
 */
export function hasSufficientBalance(
  userBalance: bigint,
  requiredAmount: bigint
): boolean {
  return userBalance >= requiredAmount
}
