'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { formatAddress } from '@/lib/utils'
import { OrganizationMember } from '@/hooks/useOrganizationDetails'
import { Eye, EyeOff, Users, Crown, Shield, User, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MemberListProps {
  members: OrganizationMember[]
  memberCount: number
  currentUserAddress?: string
  showTitle?: boolean
}

export function MemberList({ members, memberCount, currentUserAddress, showTitle = true }: MemberListProps) {
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  const activeMembers = members.filter(member => member.state === 'ACTIVE')
  const displayMembers = showAllMembers ? activeMembers : activeMembers.slice(0, 5)

  const toggleMemberExpansion = (memberId: string) => {
    const newExpanded = new Set(expandedMembers)
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId)
    } else {
      newExpanded.add(memberId)
    }
    setExpandedMembers(newExpanded)
  }

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'prime':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'prime':
        return 'default' as const
      case 'admin':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return 'text-green-600 dark:text-green-400'
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'INACTIVE':
        return 'text-gray-600 dark:text-gray-400'
      case 'KICKED':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (showTitle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({memberCount})
            </div>
            {activeMembers.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllMembers(!showAllMembers)}
              >
                {showAllMembers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAllMembers ? 'Show Less' : 'Show All'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberListContent
            displayMembers={displayMembers}
            activeMembers={activeMembers}
            expandedMembers={expandedMembers}
            currentUserAddress={currentUserAddress}
            showAllMembers={showAllMembers}
            toggleMemberExpansion={toggleMemberExpansion}
            getRoleIcon={getRoleIcon}
            getRoleBadgeVariant={getRoleBadgeVariant}
            getStateColor={getStateColor}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <MemberListContent
      displayMembers={displayMembers}
      activeMembers={activeMembers}
      expandedMembers={expandedMembers}
      currentUserAddress={currentUserAddress}
      showAllMembers={showAllMembers}
      toggleMemberExpansion={toggleMemberExpansion}
      getRoleIcon={getRoleIcon}
      getRoleBadgeVariant={getRoleBadgeVariant}
      getStateColor={getStateColor}
    />
  )
}

interface MemberListContentProps {
  displayMembers: OrganizationMember[]
  activeMembers: OrganizationMember[]
  expandedMembers: Set<string>
  currentUserAddress?: string
  showAllMembers: boolean
  toggleMemberExpansion: (memberId: string) => void
  getRoleIcon: (role: string) => JSX.Element
  getRoleBadgeVariant: (role: string) => 'default' | 'secondary' | 'outline'
  getStateColor: (state: string) => string
}

function MemberListContent({
  displayMembers,
  activeMembers,
  expandedMembers,
  currentUserAddress,
  showAllMembers,
  toggleMemberExpansion,
  getRoleIcon,
  getRoleBadgeVariant,
  getStateColor
}: MemberListContentProps) {
  if (activeMembers.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        description="This organization doesn't have any members yet."
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
      />
    )
  }

  return (
    <div className="space-y-3">
      {displayMembers.map((member) => {
        const isCurrentUser = currentUserAddress?.toLowerCase() === member.address.toLowerCase()
        const isExpanded = expandedMembers.has(member.id)

        return (
          <div
            key={member.id}
            className={`border rounded-lg p-4 transition-all duration-200 ${
              isCurrentUser
                ? 'bg-primary/5 border-primary/20'
                : 'bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {member.address.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {formatAddress(member.address)}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                        {member.role}
                      </Badge>
                    </div>

                    <div className={`text-xs ${getStateColor(member.state)}`}>
                      {member.state}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMemberExpansion(member.id)}
                className="ml-2"
              >
                {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Address</p>
                    <p className="font-mono text-xs break-all">{member.address}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <p className="text-xs">
                        {formatDistanceToNow(new Date(member.joinedAt * 1000), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Member ID</p>
                    <p className="font-mono text-xs break-all">{member.id}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className={`text-xs font-medium ${getStateColor(member.state)}`}>
                      {member.state}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!showAllMembers && activeMembers.length > 5 && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Showing 5 of {activeMembers.length} members
          </p>
        </div>
      )}
    </div>
  )
}
