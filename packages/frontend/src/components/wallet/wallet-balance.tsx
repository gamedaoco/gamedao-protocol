'use client'

import { useTokenBalances } from '@/hooks/useTokenBalances'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Coins, DollarSign, Gamepad2 } from 'lucide-react'

interface WalletBalanceProps {
  variant?: 'compact' | 'detailed'
  showIcons?: boolean
}

export function WalletBalance({ variant = 'compact', showIcons = true }: WalletBalanceProps) {
  const { balances, isLoading, isConnected, ethBalance, gameBalance, usdcBalance } = useTokenBalances()

  if (!isConnected) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {showIcons && <Coins className="h-3 w-3" />}
          <span className="text-xs">{ethBalance.formatted} ETH</span>
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          {showIcons && <Gamepad2 className="h-3 w-3" />}
          <span className="text-xs">{gameBalance.formatted} GAME</span>
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          {showIcons && <DollarSign className="h-3 w-3" />}
          <span className="text-xs">{usdcBalance.formatted} USDC</span>
        </Badge>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Wallet Balance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold">{ethBalance.formatted}</div>
              <div className="text-xs text-muted-foreground">ETH</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold">{gameBalance.formatted}</div>
              <div className="text-xs text-muted-foreground">GAME</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold">{usdcBalance.formatted}</div>
              <div className="text-xs text-muted-foreground">USDC</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper component for insufficient balance warnings
interface InsufficientBalanceWarningProps {
  requiredToken: 'ETH' | 'GAME' | 'USDC'
  requiredAmount: string
  currentAmount?: string
}

export function InsufficientBalanceWarning({
  requiredToken,
  requiredAmount,
  currentAmount
}: InsufficientBalanceWarningProps) {
  const { getBalance } = useTokenBalances()
  const balance = getBalance(requiredToken)
  const current = currentAmount || balance?.formatted || '0'

  const getTokenIcon = (token: string) => {
    switch (token) {
      case 'ETH': return <Coins className="h-4 w-4" />
      case 'GAME': return <Gamepad2 className="h-4 w-4" />
      case 'USDC': return <DollarSign className="h-4 w-4" />
      default: return <Coins className="h-4 w-4" />
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="text-destructive">
        {getTokenIcon(requiredToken)}
      </div>
      <div className="flex-1 text-sm">
        <div className="font-medium text-destructive">Insufficient {requiredToken} Balance</div>
        <div className="text-destructive/80">
          Required: {requiredAmount} {requiredToken} • Available: {current} {requiredToken}
        </div>
      </div>
    </div>
  )
}
