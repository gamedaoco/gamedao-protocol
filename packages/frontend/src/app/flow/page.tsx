'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Target, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'

export default function FlowPage() {
  const { isConnected } = useGameDAO()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Discover and support crowdfunding campaigns in the gaming ecosystem
          </p>
        </div>
        <Button disabled={!isConnected} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Launch Campaign</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Active Campaigns</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+5 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Raised</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$847K</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Success Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">Campaigns funded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isConnected ? '$2,340' : '$0'}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Across 7 campaigns' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Categories */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Game Development', 'Esports', 'NFT Projects', 'Community Events', 'Hardware'].map((category) => (
          <Badge key={category} variant={category === 'All' ? 'default' : 'outline'} className="cursor-pointer">
            {category}
          </Badge>
        ))}
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Campaigns</CardTitle>
          <CardDescription>
            Support innovative gaming projects and earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Campaign Items */}
            {[
              {
                title: 'Indie RPG: Chronicles of Etheria',
                description: 'An open-world fantasy RPG built by the community',
                raised: 45000,
                target: 75000,
                backers: 234,
                daysLeft: 12,
                category: 'Game Development',
                image: '🎮'
              },
              {
                title: 'Esports Arena Construction',
                description: 'Building a state-of-the-art gaming facility',
                raised: 120000,
                target: 200000,
                backers: 89,
                daysLeft: 25,
                category: 'Esports',
                image: '🏟️'
              },
              {
                title: 'NFT Trading Card Game',
                description: 'Collectible card game with play-to-earn mechanics',
                raised: 67000,
                target: 100000,
                backers: 156,
                daysLeft: 8,
                category: 'NFT Projects',
                image: '🃏'
              }
            ].map((campaign, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-4xl">
                    {campaign.image}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium">{campaign.title}</h3>
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        ${campaign.raised.toLocaleString()} / ${campaign.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${(campaign.raised / campaign.target) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{campaign.backers} backers</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{campaign.daysLeft} days left</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {campaign.category}
                    </Badge>
                    <Button size="sm">
                      Back Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isConnected && (
            <div className="text-center py-8 border-t mt-6">
              <p className="text-muted-foreground mb-4">
                Connect your wallet to back campaigns and track your contributions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
