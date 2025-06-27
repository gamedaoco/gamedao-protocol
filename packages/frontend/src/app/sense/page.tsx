'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Users, Trophy, Star } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useReputation } from '@/hooks/useReputation'

export default function SensePage() {
  const { isConnected } = useGameDAO()
  const { profiles, stats, isLoading, error, userProfile, getTopProfiles } = useReputation()

  const topProfiles = getTopProfiles(5)

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
              className="pl-10 pr-4 py-2 border rounded-lg bg-background text-sm"
              placeholder="Search profiles..."
            />
          </div>
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
              {isConnected ? (userProfile ? 'Your score' : 'No profile yet') : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reputation Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Reputation Leaderboard</CardTitle>
          <CardDescription>
            Top contributors in the GameDAO ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading profiles...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">Unable to load profiles</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error connecting to the subgraph. Please check that:
                </p>
                <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                  <li>• The subgraph is deployed and running</li>
                  <li>• The local blockchain has profile data</li>
                  <li>• The GraphQL endpoint is accessible</li>
                </ul>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : topProfiles.length > 0 ? (
              topProfiles.map((profile, index) => (
                <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </div>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profile.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {profile.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div>
                      <h3 className="font-medium">{profile.username}</h3>
                      <p className="text-sm text-muted-foreground">{profile.owner.address.slice(0, 6)}...{profile.owner.address.slice(-4)}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <Badge variant="secondary" className="text-xs">Level {profile.verificationLevel}</Badge>
                        <span className="text-xs text-muted-foreground">{profile.achievementCount} achievements</span>
                        <span className="text-xs text-muted-foreground">{profile.organization.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold">{profile.reputation.toLocaleString()}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2">
                      View Profile
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No profiles found</h3>
                <p className="text-muted-foreground mb-4">
                  No user profiles have been created yet. Be the first to create your profile!
                </p>
                <Button>
                  Create Profile
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
              Connect your wallet to start building your gaming reputation and earning achievements
            </p>
            <div className="flex justify-center">
              <Button>Connect Wallet</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
