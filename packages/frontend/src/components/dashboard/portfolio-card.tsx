'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PieChart, TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { formatEther } from 'viem'

interface PortfolioCardProps {
  className?: string
}

export function PortfolioCard({ className }: PortfolioCardProps) {
  const { portfolio, isLoading, error } = usePortfolio()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Personal Portfolio</span>
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

  if (error || !portfolio) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Personal Portfolio</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground space-y-2">
            <Wallet className="h-8 w-8" />
            {error ? (
              <p className="text-sm text-center">{error}</p>
            ) : (
              <p className="text-sm">Connect wallet to view portfolio</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show empty state when portfolio exists but has no tokens
  const hasTokens = portfolio.tokens && portfolio.tokens.length > 0
  const hasParticipation = portfolio.participation && (
    portfolio.participation.organizations > 0 ||
    portfolio.participation.campaigns > 0 ||
    portfolio.participation.proposals > 0 ||
    portfolio.participation.votes > 0
  )

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center space-x-2">
          <PieChart className="h-5 w-5" />
          <span>Personal Portfolio</span>
        </CardTitle>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <Badge variant="secondary" className="text-xs">
              {portfolio.tokenCount} assets
            </Badge>
          </div>
          <div className="text-2xl font-bold">
            ${portfolio.totalValueUSD.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
          {portfolio.totalValueUSD > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              {portfolio.change24h >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={portfolio.change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                {portfolio.change24h >= 0 ? '+' : ''}{portfolio.change24h.toFixed(2)}%
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
              {portfolio.tokens.map((token) => (
                <div key={token.address} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                      {token.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{token.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {token.allocation.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {token.decimals === 18
                        ? parseFloat(formatEther(BigInt(token.balance))).toFixed(4)
                        : (parseInt(token.balance) / Math.pow(10, token.decimals)).toFixed(4)
                      }
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
              <p className="text-sm">No tokens detected</p>
              <p className="text-xs">Token balances would appear here</p>
            </div>
          )}
        </div>

        {/* GameDAO Participation */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">GameDAO Activity</h4>
          {hasParticipation ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-primary">{portfolio.participation.organizations}</div>
                  <div className="text-xs text-muted-foreground">Organizations</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{portfolio.participation.campaigns}</div>
                  <div className="text-xs text-muted-foreground">Campaigns</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-primary">{portfolio.participation.proposals}</div>
                  <div className="text-xs text-muted-foreground">Proposals</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{portfolio.participation.votes}</div>
                  <div className="text-xs text-muted-foreground">Votes Cast</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No GameDAO activity yet</p>
              <p className="text-xs">Start participating to see stats here</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
