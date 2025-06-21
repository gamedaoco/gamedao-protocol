'use client'

import { StakingPoolsOverview } from "@/components/staking/staking-pools-overview"
import { TokenBalanceCard } from "@/components/staking/token-balance-card"

export default function StakingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Staking Dashboard</h1>
        <p className="text-muted-foreground">
          Stake your GAME tokens to earn rewards and participate in protocol governance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Token Balances - Sidebar */}
        <div className="lg:col-span-1">
          <TokenBalanceCard />
        </div>

        {/* Staking Pools - Main Content */}
        <div className="lg:col-span-3">
          <StakingPoolsOverview />
        </div>
      </div>
    </div>
  )
}
