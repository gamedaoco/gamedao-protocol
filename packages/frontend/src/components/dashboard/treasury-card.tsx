'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Settings } from 'lucide-react'
import { useTreasury } from '@/hooks/useTreasury'
import { formatEther } from 'viem'

interface TreasuryCardProps {
  organizationId?: string
  className?: string
}

export function TreasuryCard({ organizationId, className }: TreasuryCardProps) {
  const { treasury, isLoading, error } = useTreasury(organizationId)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Treasury</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !treasury) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Treasury</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground space-y-2">
            <Wallet className="h-8 w-8" />
            {error ? (
              <p className="text-sm text-center">{error}</p>
            ) : (
              <p className="text-sm">Treasury data unavailable</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasTokens = treasury.tokens && treasury.tokens.length > 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Treasury</span>
        </CardTitle>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Balance</span>
            <Badge variant="secondary" className="text-xs">
              {treasury.tokenCount} tokens
            </Badge>
          </div>
          <div className="text-2xl font-bold">
            ${treasury.totalValueUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
          {treasury.totalValueUSD > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              {treasury.change24h >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={treasury.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                {treasury.change24h >= 0 ? '+' : ''}{treasury.change24h.toFixed(2)}%
              </span>
              <span className="text-muted-foreground">24h</span>
            </div>
          )}
        </div>

        {/* Token Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Holdings</h4>
          {hasTokens ? (
            <div className="space-y-2">
              {treasury.tokens.map((token) => (
                <div key={token.address} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {token.symbol.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{token.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {parseFloat(formatEther(BigInt(token.balance))).toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${token.valueUSD.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No treasury tokens</p>
              <p className="text-xs">Select an organization to view treasury</p>
            </div>
          )}
        </div>

        {/* Daily Spending Limit */}
        {treasury.dailyLimit > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Spending</span>
              <span className="text-muted-foreground">
                ${treasury.todaySpent.toFixed(2)} / ${treasury.dailyLimit.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min((treasury.todaySpent / treasury.dailyLimit) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <DollarSign className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
