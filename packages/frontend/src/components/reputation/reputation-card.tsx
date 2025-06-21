'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Trophy, Shield, TrendingUp } from 'lucide-react'
import { useReputation } from '@/hooks/useReputation'
import { cn } from '@/lib/utils'

export function ReputationCard() {
  const { reputation, isLoading, error } = useReputation()

  if (isLoading) {
    return (
      <Card className="w-48">
        <CardContent className="p-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !reputation) {
    return (
      <Card className="w-48 border-muted">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span className="text-sm">No reputation data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getReputationLevel = (rep: number) => {
    if (rep >= 5000) return { level: 'Legendary', color: 'bg-gradient-to-r from-yellow-400 to-orange-500' }
    if (rep >= 3000) return { level: 'Expert', color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
    if (rep >= 1500) return { level: 'Advanced', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' }
    if (rep >= 500) return { level: 'Intermediate', color: 'bg-gradient-to-r from-green-500 to-emerald-500' }
    return { level: 'Beginner', color: 'bg-gradient-to-r from-gray-500 to-slate-500' }
  }

  const getTrustLevel = (trust: number) => {
    if (trust >= 80) return { level: 'Highly Trusted', color: 'text-green-600 dark:text-green-400' }
    if (trust >= 60) return { level: 'Trusted', color: 'text-blue-600 dark:text-blue-400' }
    if (trust >= 40) return { level: 'Reliable', color: 'text-yellow-600 dark:text-yellow-400' }
    if (trust >= 20) return { level: 'Building', color: 'text-orange-600 dark:text-orange-400' }
    return { level: 'New', color: 'text-gray-600 dark:text-gray-400' }
  }

  const repLevel = getReputationLevel(reputation.reputation)
  const trustLevel = getTrustLevel(reputation.trust)

  return (
    <Card className="w-56 bg-gradient-to-br from-background/50 to-muted/30 border-border/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn("w-3 h-3 rounded-full", repLevel.color)} />
            <span className="text-sm font-medium">{repLevel.level}</span>
          </div>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Stats */}
        <div className="space-y-2">
          {/* Experience */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">XP</span>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {reputation.experience.toLocaleString()}
            </Badge>
          </div>

          {/* Reputation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">REP</span>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {reputation.reputation.toLocaleString()}
            </Badge>
          </div>

          {/* Trust */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">TRUST</span>
            </div>
            <Badge
              variant="outline"
              className={cn("text-xs font-mono border-0", trustLevel.color)}
            >
              {reputation.trust}%
            </Badge>
          </div>
        </div>

        {/* Trust Level */}
        <div className="pt-1 border-t border-border/50">
          <p className={cn("text-xs text-center font-medium", trustLevel.color)}>
            {trustLevel.level}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
