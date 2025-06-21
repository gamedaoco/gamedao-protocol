'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGameDAO } from '@/hooks/useGameDAO'

export default function CampaignsPage() {
  const { isConnected } = useGameDAO()

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🔌 Wallet Required</CardTitle>
            <CardDescription>
              Please connect your wallet to view and manage campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect your wallet using the button in the top navigation to access the Flow module features.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Discover and support gaming projects through crowdfunding
          </p>
        </div>
        <Button>
          🚀 Create Campaign
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Currently fundraising</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">Total contributed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Reached their goals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$125K</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button variant="default" size="sm">All Campaigns</Button>
        <Button variant="outline" size="sm">🎯 Active</Button>
        <Button variant="outline" size="sm">✅ Successful</Button>
        <Button variant="outline" size="sm">💝 My Contributions</Button>
        <Button variant="outline" size="sm">🏆 Trending</Button>
      </div>

      {/* Featured Campaigns */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Featured Campaigns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Example Campaigns */}
          {[
            {
              title: "Pixel Dungeon Remastered",
              description: "A complete remake of the classic roguelike with modern graphics and gameplay",
              organization: "Pixel Warriors Guild",
              type: "Grant",
              target: 50000,
              raised: 32500,
              contributors: 234,
              daysLeft: 15,
              image: "🏰",
              tags: ["Indie", "Roguelike", "Pixel Art"]
            },
            {
              title: "Esports Tournament Platform",
              description: "Decentralized tournament management system for competitive gaming",
              organization: "Esports Champions DAO",
              type: "Raise",
              target: 100000,
              raised: 78000,
              contributors: 156,
              daysLeft: 8,
              image: "🏆",
              tags: ["Esports", "Platform", "Tournaments"]
            },
            {
              title: "Retro Gaming Archive",
              description: "Preserving classic games and making them accessible to future generations",
              organization: "Retro Gaming Collective",
              type: "Grant",
              target: 25000,
              raised: 18750,
              contributors: 89,
              daysLeft: 22,
              image: "🕹️",
              tags: ["Preservation", "Archive", "History"]
            }
          ].map((campaign, index) => {
            const progress = (campaign.raised / campaign.target) * 100
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{campaign.image}</div>
                      <div>
                        <CardTitle className="text-lg">{campaign.title}</CardTitle>
                        <CardDescription className="text-sm">
                          by {campaign.organization}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={campaign.type === 'Grant' ? 'secondary' : 'default'}>
                      {campaign.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {campaign.description}
                  </p>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        ${campaign.raised.toLocaleString()} raised
                      </span>
                      <span className="text-muted-foreground">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Goal: ${campaign.target.toLocaleString()}</span>
                      <span>{campaign.daysLeft} days left</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>👥 {campaign.contributors} contributors</span>
                    <span>⏰ {campaign.daysLeft} days left</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {campaign.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button className="flex-1">
                      💝 Contribute
                    </Button>
                    <Button variant="outline" size="sm">
                      👁️ View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Campaign Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Campaign Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              type: "Grant",
              icon: "🎁",
              description: "Community funding for public goods and open source projects",
              count: 8
            },
            {
              type: "Raise",
              icon: "📈",
              description: "Investment rounds for gaming startups and commercial projects",
              count: 5
            },
            {
              type: "Share",
              icon: "🤝",
              description: "Revenue sharing opportunities for community members",
              count: 3
            }
          ].map((type) => (
            <Card key={type.type} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{type.type}</CardTitle>
                    <CardDescription>
                      {type.count} active campaigns
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
