'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Trophy, Shield, TrendingUp } from 'lucide-react'
import { useReputation } from '@/hooks/useReputation'
import { cn } from '@/lib/utils'
import { CardHeader, CardTitle } from '@/components/ui/card'

export function ReputationCard() {
  const { userProfile, isLoading, error } = useReputation()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reputation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load reputation</p>
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

  const repLevel = getReputationLevel(userProfile.reputation)
  const trustLevel = getTrustLevel(userProfile.trustScore)

  return (
    <Card className="bg-gradient-to-br from-background/50 to-muted/30 border-border/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Reputation</CardTitle>
      </CardHeader>
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
              <div className="text-2xl font-bold">
                {userProfile.experience.toLocaleString()}
              </div>
            </Badge>
          </div>

          {/* Reputation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">REP</span>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              <div className="text-2xl font-bold">
                {userProfile.reputation.toLocaleString()}
              </div>
            </Badge>
          </div>

          {/* Trust */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">TRUST</span>
            </div>
            <Badge
              variant="secondary"
              className={cn("text-xs font-mono border-0", trustLevel.color)}
            >
              <div className="text-2xl font-bold">
                {userProfile.trustScore.toLocaleString()}
              </div>
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
