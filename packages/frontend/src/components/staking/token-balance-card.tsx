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
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Coins className="h-5 w-5" />
          <span>Token Balances</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GAME Token */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">GAME</p>
              <p className="text-sm text-muted-foreground">GameDAO Token</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-lg font-bold">
              {gameBalance ? (Number(gameBalance) / 1e18).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              }) : '0'}
            </p>

            <div className="flex items-center space-x-2">
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
                  className="text-xs h-6"
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
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">USDC</p>
              <p className="text-sm text-muted-foreground">USD Coin</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-lg font-bold">
              {usdcBalance ? (Number(usdcBalance) / 1e6).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : '0.00'}
            </p>

            <div className="flex items-center space-x-2">
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
                  className="text-xs h-6"
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

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="flex-1">
              Get GAME
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Get USDC
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Need tokens? Visit a DEX to acquire GAME and USDC
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
