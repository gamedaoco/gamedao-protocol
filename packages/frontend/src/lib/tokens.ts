// Token registry + amount formatter.
//
// On-chain values come back as BigInt strings in token-native decimals
// (USDC=6, GAME=18, EURAU=18, etc.). The frontend used to assume 18 dp
// everywhere, which displayed USDC amounts as 1e-12 of their real value
// and made every campaign target look like dust. This module looks up
// the token by its `paymentToken` address from the active chain config
// and returns `{ symbol, decimals }` so callers can format correctly.
//
// Unknown tokens fall back to 'TOKEN' / 18 dp — better than a crash and
// the symbol makes the gap obvious in the UI.

import { formatUnits, type Address } from 'viem'
import type { ContractAddresses } from './contracts'

type Contracts = ContractAddresses

export interface TokenInfo {
  symbol: string
  decimals: number
  address: Address
}

const ZERO = '0x0000000000000000000000000000000000000000'.toLowerCase()

/**
 * Resolve `{ symbol, decimals }` for a token address against the active
 * chain's contracts config. Address comparison is case-insensitive — the
 * subgraph returns lowercased bytes, runtime contracts may be checksummed.
 */
export function tokenInfo(address: string | undefined, contracts: Contracts): TokenInfo {
  const a = (address || ZERO).toLowerCase()

  if (a === contracts.GAME_TOKEN.toLowerCase()) {
    return { symbol: 'GAME', decimals: 18, address: contracts.GAME_TOKEN }
  }
  if (a === contracts.USDC_TOKEN.toLowerCase()) {
    return { symbol: 'USDC', decimals: 6, address: contracts.USDC_TOKEN }
  }
  // Native ETH/MATIC sentinel.
  if (a === ZERO) {
    return { symbol: 'ETH', decimals: 18, address: ZERO as Address }
  }
  return { symbol: 'TOKEN', decimals: 18, address: a as Address }
}

/**
 * Format a raw on-chain bigint-string amount into a human-readable string
 * with thousands separators and the token symbol suffix (e.g. "1,250.50 USDC").
 * Trims trailing zeros so "1.50 USDC" becomes "1.5 USDC".
 */
export function formatTokenAmount(
  amount: string | bigint | undefined,
  paymentToken: string | undefined,
  contracts: Contracts,
  opts: { decimals?: number } = {},
): string {
  const info = tokenInfo(paymentToken, contracts)
  if (amount === undefined || amount === null || amount === '') {
    return `0 ${info.symbol}`
  }
  let raw: bigint
  try {
    raw = typeof amount === 'bigint' ? amount : BigInt(amount)
  } catch {
    return `0 ${info.symbol}`
  }
  const formatted = formatUnits(raw, info.decimals)
  const num = Number(formatted)
  if (!Number.isFinite(num)) return `${formatted} ${info.symbol}`
  const display = num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: opts.decimals ?? 2,
  })
  return `${display} ${info.symbol}`
}
