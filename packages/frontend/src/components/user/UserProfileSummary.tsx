'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfile } from '@/hooks/useUserProfile'
import { formatAddress } from '@/lib/utils'
import {
  User,
  Star,
  TrendingUp,
  Shield,
  Users,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface UserProfileSummaryProps {
  address: string
  variant?: 'default' | 'compact' | 'detailed'
  showMemberships?: boolean
  className?: string
}

export function UserProfileSummary({
  address,
  variant = 'default',
  showMemberships = false,
  className
}: UserProfileSummaryProps) {
  const { userProfile, isLoading, activeMemberships } = useUserProfile(address)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        {variant !== 'compact' && (
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  if (!userProfile) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <XCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Profile not found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const reputation = userProfile.reputation
  const hasReputation = reputation?.hasProfile

  const getReputationLevel = (rep: number) => {
    if (rep >= 5000) return { level: 'Legendary', color: 'text-yellow-600' }
    if (rep >= 3000) return { level: 'Expert', color: 'text-purple-600' }
    if (rep >= 1500) return { level: 'Advanced', color: 'text-blue-600' }
    if (rep >= 500) return { level: 'Intermediate', color: 'text-green-600' }
    return { level: 'Beginner', color: 'text-gray-600' }
  }

  const repLevel = hasReputation ? getReputationLevel(reputation.reputation) : null

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {address.slice(2, 4).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{formatAddress(address)}</p>
                     {hasReputation && (
             <div className="flex items-center gap-2 text-xs">
               <div className="flex items-center gap-1">
                 <TrendingUp className="h-3 w-3 text-blue-500" />
                 <span>{reputation.experience.toLocaleString()}</span>
               </div>
               <div className="flex items-center gap-1">
                 <Star className="h-3 w-3 text-yellow-500" />
                 <span>{reputation.reputation.toLocaleString()}</span>
               </div>
               <div className="flex items-center gap-1">
                 <Shield className="h-3 w-3 text-green-500" />
                 <span>{reputation.trustScore.toLocaleString()}</span>
               </div>
             </div>
           )}
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {address.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">
                {formatAddress(address)}
              </CardTitle>
              {hasReputation && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            {repLevel && (
              <p className={`text-sm font-medium ${repLevel.color}`}>
                {repLevel.level}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
                 {/* Reputation Stats */}
         {hasReputation && (
           <div className="grid grid-cols-3 gap-4 text-center">
             <div>
               <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                 <TrendingUp className="h-4 w-4 text-blue-500" />
                 <span className="text-xs">XP</span>
               </div>
               <div className="font-semibold">{reputation.experience.toLocaleString()}</div>
             </div>

             <div>
               <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                 <Star className="h-4 w-4 text-yellow-500" />
                 <span className="text-xs">REP</span>
               </div>
               <div className="font-semibold">{reputation.reputation.toLocaleString()}</div>
             </div>

             <div>
               <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                 <Shield className="h-4 w-4 text-green-500" />
                 <span className="text-xs">TRUST</span>
               </div>
               <div className="font-semibold">{reputation.trustScore.toLocaleString()}</div>
             </div>
           </div>
         )}

        {/* Activity Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              <span>Organizations</span>
            </div>
            <div className="font-medium">{userProfile.totalOrganizations}</div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span>Active Since</span>
            </div>
            <div className="font-medium text-xs">
              {formatDistanceToNow(new Date(userProfile.firstSeenAt * 1000), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Memberships */}
        {showMemberships && activeMemberships.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Active Memberships</h4>
            <div className="space-y-1">
              {activeMemberships.slice(0, 3).map((membership) => (
                <div key={membership.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{membership.organization.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {membership.role}
                  </Badge>
                </div>
              ))}
              {activeMemberships.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{activeMemberships.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* No Reputation State */}
        {!hasReputation && (
          <div className="text-center py-2 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No reputation profile created</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
