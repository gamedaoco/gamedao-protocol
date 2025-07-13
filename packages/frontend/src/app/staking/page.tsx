'use client'

import { StakingPoolsOverview } from "@/components/staking/staking-pools-overview"
import { TokenBalanceCard } from "@/components/staking/token-balance-card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Info, User } from "lucide-react"

export default function StakingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Staking Dashboard</h1>
        <p className="text-muted-foreground">
          Stake your GAME tokens to earn rewards and participate in protocol governance
        </p>
      </div>

      {/* Token Balance Section - Full Width Two Columns */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Your Wallet & Approvals</h2>
          <Badge variant="outline" className="text-xs">
            User Actions
          </Badge>
        </div>

        <div className="w-full">
          <TokenBalanceCard />
        </div>
      </div>

      <Separator />

      {/* General Protocol Information */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Protocol Overview</h2>
          <Badge variant="outline" className="text-xs">
            General Information
          </Badge>
        </div>

        <StakingPoolsOverview />
      </div>
    </div>
  )
}
