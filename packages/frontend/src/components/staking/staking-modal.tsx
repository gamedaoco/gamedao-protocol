'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Coins, Clock, Zap, Shield } from "lucide-react"
import { useStakingPools } from "@/hooks/use-staking-pools"
import { useTokenBalances } from "@/hooks/use-token-balances"

interface StakingModalProps {
  isOpen: boolean
  onClose: () => void
  poolPurpose: 'GOVERNANCE' | 'DAO_CREATION' | 'TREASURY_BOND' | 'LIQUIDITY_MINING'
  poolTitle: string
  poolApy: number
  mode: 'stake' | 'unstake'
}

const STRATEGY_INFO = {
  [UnstakeStrategy.RAGE_QUIT]: {
    name: "Rage Quit",
    description: "Instant withdrawal with 20% penalty",
    icon: Zap,
    color: "bg-red-500",
    delay: "Instant",
    penalty: "20%"
  },
  [UnstakeStrategy.STANDARD]: {
    name: "Standard",
    description: "7-day delay with normal rewards",
    icon: Clock,
    color: "bg-blue-500",
    delay: "7 days",
    penalty: "None"
  },
  [UnstakeStrategy.PATIENT]: {
    name: "Patient",
    description: "30-day delay with 5% bonus rewards",
    icon: Shield,
    color: "bg-green-500",
    delay: "30 days",
    penalty: "5% Bonus"
  }
}

export function StakingModal({ isOpen, onClose, poolPurpose, poolTitle, poolApy, mode }: StakingModalProps) {
  const [amount, setAmount] = useState('')
  const [strategy, setStrategy] = useState<UnstakeStrategy>(UnstakeStrategy.STANDARD)
  const { stake, unstake, isStaking, isUnstaking } = useStakingPools()
  const { gameBalance } = useTokenBalances()

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return

    try {
      if (mode === 'stake') {
        await stake(poolPurpose, amount)
      } else {
        await unstake(poolPurpose, amount)
      }
      onClose()
      setAmount('')
    } catch (error) {
      console.error(`Error ${mode}ing:`, error)
    }
  }

  const maxAmount = gameBalance ? (Number(gameBalance) / 1e18).toString() : '0'
  const isLoading = mode === 'stake' ? isStaking : isUnstaking

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5" />
            <span>{mode === 'stake' ? 'Stake' : 'Unstake'} GAME</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pool Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{poolTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'stake' ? 'Staking to' : 'Unstaking from'} this pool
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {poolApy}% APY
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GAME)</Label>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <Button
                variant="outline"
                onClick={() => setAmount(maxAmount)}
                className="whitespace-nowrap"
              >
                Max
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: {Number(maxAmount).toLocaleString()} GAME
            </p>
          </div>

          {/* Strategy Selection (only for staking) */}
          {mode === 'stake' && (
            <div className="space-y-3">
              <Label>Unstaking Strategy</Label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(STRATEGY_INFO).map(([strategyValue, info]) => {
                  const Icon = info.icon
                  const isSelected = strategy === Number(strategyValue)

                  return (
                    <Card
                      key={strategyValue}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setStrategy(Number(strategyValue) as UnstakeStrategy)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full ${info.color} flex items-center justify-center`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{info.name}</p>
                              <div className="flex space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {info.delay}
                                </Badge>
                                <Badge
                                  variant={info.penalty === "5% Bonus" ? "default" : info.penalty === "None" ? "secondary" : "destructive"}
                                  className="text-xs"
                                >
                                  {info.penalty}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {amount && Number(amount) > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{Number(amount).toLocaleString()} GAME</span>
                  </div>
                  {mode === 'stake' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Strategy</span>
                        <span className="font-medium">{STRATEGY_INFO[strategy].name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Annual Rewards</span>
                        <span className="font-medium text-green-600">
                          {(Number(amount) * poolApy / 100).toFixed(2)} GAME
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || Number(amount) <= 0 || isLoading}
              className="flex-1"
            >
              {isLoading
                ? `${mode === 'stake' ? 'Staking' : 'Unstaking'}...`
                : `${mode === 'stake' ? 'Stake' : 'Unstake'} ${amount || '0'} GAME`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
