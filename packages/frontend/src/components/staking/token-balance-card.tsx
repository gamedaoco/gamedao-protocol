'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, DollarSign, CheckCircle, Clock } from "lucide-react"
import { useTokenBalances } from "@/hooks/use-token-balances"

export function TokenBalanceCard() {
  const {
    gameBalance,
    usdcBalance,
    gameAllowance,
    usdcAllowance,
    isLoading,
    isApproving,
    approveGame,
    approveUsdc
  } = useTokenBalances()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/4"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-24 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Coins className="h-5 w-5" />
          <span>Token Balances & Approvals</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GAME Token */}
          <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">GAME</p>
                <p className="text-sm text-muted-foreground">GameDAO Token</p>
              </div>
            </div>

            <div className="text-right space-y-2">
              <p className="text-2xl font-bold">
                {gameBalance ? (Number(gameBalance) / 1e18).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                }) : '0'}
              </p>

              <div className="flex items-center justify-end space-x-2">
                {gameAllowance && Number(gameAllowance) > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={approveGame}
                    disabled={isApproving}
                    className="text-xs h-7"
                  >
                    {isApproving ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      'Approve'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* USDC Token */}
          <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">USDC</p>
                <p className="text-sm text-muted-foreground">USD Coin</p>
              </div>
            </div>

            <div className="text-right space-y-2">
              <p className="text-2xl font-bold">
                {usdcBalance ? (Number(usdcBalance) / 1e6).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) : '0.00'}
              </p>

              <div className="flex items-center justify-end space-x-2">
                {usdcAllowance && Number(usdcAllowance) > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={approveUsdc}
                    disabled={isApproving}
                    className="text-xs h-7"
                  >
                    {isApproving ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      'Approve'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Full Width */}
        <div className="pt-6 border-t mt-6">
          <div className="flex space-x-4 justify-center">
            <Button size="sm" variant="outline" className="px-6">
              Get GAME
            </Button>
            <Button size="sm" variant="outline" className="px-6">
              Get USDC
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Need tokens? Visit a DEX to acquire GAME and USDC for staking
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
