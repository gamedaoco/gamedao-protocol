// SPDX-License-Identifier: AGPL-3.0-or-later
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useStakingPools } from '@/hooks/useStakingPools'
import { Clock, TrendingUp, TrendingDown, Coins, Calendar } from 'lucide-react'

interface StakingHistoryEvent {
  id: string
  type: 'STAKE' | 'UNSTAKE' | 'CLAIM' | 'SLASH'
  amount: string
  pool: string
  timestamp: number
  txHash: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
}

export default function StakingHistoryPage() {
  const { pools, userStakes, isLoading } = useStakingPools()

  // Mock history data - in real app this would come from subgraph or events
  const mockHistory: StakingHistoryEvent[] = [
    {
      id: '1',
      type: 'STAKE',
      amount: '1000',
      pool: 'GOVERNANCE',
      timestamp: Date.now() - 86400000, // 1 day ago
      txHash: '0x123...',
      status: 'SUCCESS'
    },
    {
      id: '2',
      type: 'CLAIM',
      amount: '50',
      pool: 'GOVERNANCE',
      timestamp: Date.now() - 172800000, // 2 days ago
      txHash: '0x456...',
      status: 'SUCCESS'
    }
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const getEventIcon = (type: StakingHistoryEvent['type']) => {
    switch (type) {
      case 'STAKE':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'UNSTAKE':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'CLAIM':
        return <Coins className="h-4 w-4 text-blue-500" />
      case 'SLASH':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventColor = (type: StakingHistoryEvent['type']) => {
    switch (type) {
      case 'STAKE':
        return 'bg-green-100 text-green-800'
      case 'UNSTAKE':
        return 'bg-red-100 text-red-800'
      case 'CLAIM':
        return 'bg-blue-100 text-blue-800'
      case 'SLASH':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Staking History</h1>
        <p className="text-muted-foreground">
          View your complete staking transaction history
        </p>
      </div>

      {mockHistory.length === 0 ? (
        <EmptyState
          title="No staking history"
          description="You haven't made any staking transactions yet. Start staking to see your history here."
          primaryAction={{
            label: 'Start Staking',
            onClick: () => window.location.href = '/staking'
          }}
        />
      ) : (
        <div className="space-y-4">
          {mockHistory.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getEventIcon(event.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{event.type}</span>
                          <Badge className={getEventColor(event.type)}>
                            {event.pool}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(event.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {event.type === 'UNSTAKE' || event.type === 'SLASH' ? '-' : '+'}
                      {event.amount} GAME
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => window.open(`https://etherscan.io/tx/${event.txHash}`, '_blank')}
                      >
                        View Transaction
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
