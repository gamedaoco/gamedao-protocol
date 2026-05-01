'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Users, Trophy, Star, Plus } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useReputation } from '@/hooks/useReputation'
import { dicebearAvatar } from '@/lib/placeholder'

type SortMode = 'recent' | 'reputation' | 'alpha'

export default function SensePage() {
  const { isConnected } = useGameDAO()
  const { profiles, stats, isLoading, error, userProfile } = useReputation()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? profiles.filter(p =>
          p.username.toLowerCase().includes(q) ||
          p.owner.address.toLowerCase().includes(q) ||
          p.organization?.name?.toLowerCase().includes(q),
        )
      : profiles

    const sorted = [...filtered]
    if (sort === 'reputation') sorted.sort((a, b) => b.reputation - a.reputation)
    else if (sort === 'alpha') sorted.sort((a, b) => a.username.localeCompare(b.username))
    else sorted.sort((a, b) => b.createdAt - a.createdAt)
    return sorted
  }, [profiles, search, sort])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Profiles & Reputation</h1>
          <p className="text-muted-foreground">
            Discover community members and build your gaming reputation
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-1">
              ⚠️ Unable to connect to subgraph: {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg bg-background text-sm"
              placeholder="Search profiles..."
            />
          </div>
          <Button disabled={!isConnected} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Profile</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Profiles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalProfiles}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Average Reputation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : Math.round(stats.averageReputation)}</div>
            <p className="text-xs text-muted-foreground">Cross-platform score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalAchievements}</div>
            <p className="text-xs text-muted-foreground">Total badges earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Reputation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? (userProfile ? userProfile.reputation : '0') : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? (userProfile ? 'Your score' : 'No profile yet') : 'Sign in to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profiles list — every public profile, filterable by the search
          input above and re-sortable via the toggle below. Replaces the
          static top-5 leaderboard so users can actually find each other. */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Profiles</CardTitle>
            <CardDescription>
              {search
                ? `${filteredProfiles.length} matching “${search}”`
                : `${profiles.length} profiles in the network`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground mr-1">Sort:</span>
            {(['recent', 'reputation', 'alpha'] as const).map((mode) => (
              <Button
                key={mode}
                variant={sort === mode ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setSort(mode)}
              >
                {mode === 'recent' ? 'Newest' : mode === 'reputation' ? 'Reputation' : 'A–Z'}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading profiles…</div>
            ) : error ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">Unable to load profiles</h3>
                <p className="text-muted-foreground mb-4">Could not reach the subgraph. Check that it’s deployed and indexing.</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <a
                  key={profile.id}
                  href={`/profiles/${profile.id}`}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={profile.avatar || dicebearAvatar(profile.id)} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{profile.username}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {profile.owner.address.slice(0, 6)}…{profile.owner.address.slice(-4)}
                        {profile.organization?.name && ` · ${profile.organization.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{profile.reputation.toLocaleString()}</span>
                  </div>
                </a>
              ))
            ) : search ? (
              <div className="text-center py-8 text-muted-foreground">No profiles match “{search}”.</div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No profiles found</h3>
                <p className="text-muted-foreground mb-4">No user profiles have been created yet. Be the first to create your profile.</p>
                <Button disabled={!isConnected} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Profile</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Gallery</CardTitle>
          <CardDescription>
            Badges and achievements available in the GameDAO ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'First DAO', description: 'Created your first DAO', icon: 'DAO', rarity: 'Common' },
              { name: 'Fundraiser', description: 'Launched a successful campaign', icon: 'FUND', rarity: 'Uncommon' },
              { name: 'Governance Guru', description: 'Voted on 50+ proposals', icon: 'VOTE', rarity: 'Rare' },
              { name: 'Community Builder', description: 'Invited 25+ members', icon: 'BUILD', rarity: 'Uncommon' },
              { name: 'Whale Supporter', description: 'Contributed $10K+ to campaigns', icon: 'WHALE', rarity: 'Epic' },
              { name: 'DAO Master', description: 'Member of 10+ DAOs', icon: 'MASTER', rarity: 'Legendary' }
            ].map((achievement, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="text-lg font-bold mb-2 text-primary">{achievement.icon}</div>
                  <h4 className="font-medium text-sm mb-1">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                  <Badge
                    variant={achievement.rarity === 'Legendary' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {achievement.rarity}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isConnected && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Build Your Reputation</h3>
            <p className="text-muted-foreground mb-4">
              Sign in to start building your gaming reputation and earning achievements
            </p>
            <div className="flex justify-center">
              <Button>Sign in</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
