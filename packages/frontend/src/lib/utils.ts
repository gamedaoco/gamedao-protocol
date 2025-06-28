import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string | undefined | null, chars = 4): string {
  if (!address) return 'Not connected'
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatTokenAmount(amount: string | number, decimals = 18, precision = 4): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num === 0) return '0'

  const divisor = Math.pow(10, decimals)
  const value = num / divisor

  if (value < 0.0001) return '<0.0001'
  if (value < 1) return value.toFixed(precision)
  if (value < 1000) return value.toFixed(2)
  if (value < 1000000) return `${(value / 1000).toFixed(1)}K`

  return `${(value / 1000000).toFixed(1)}M`
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp * 1000 // Convert to milliseconds

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

export function formatPercentage(value: number, precision = 1): string {
  return `${(value * 100).toFixed(precision)}%`
}
