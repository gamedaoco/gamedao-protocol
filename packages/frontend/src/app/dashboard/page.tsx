'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Plus,
  TrendingUp,
  Users,
  Vote,
  DollarSign,
  Bell,
  Settings,
  ExternalLink
} from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { PortfolioCard } from '@/components/dashboard/portfolio-card'
import { ReputationCard } from '@/components/reputation/reputation-card'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { isConnected, address } = useGameDAO()

  // Redirect to home if not connected
  useEffect(() => {
    if (!isConnected) {
      redirect('/')
    }
  }, [isConnected])

  if (!isConnected) {
    return null // Will redirect
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xl">
              {address?.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Your DAOs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Member of 3 organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Contributions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,340</div>
            <p className="text-xs text-muted-foreground">Across 7 campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Vote className="h-4 w-4" />
              <span>Votes Cast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Reputation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,450</div>
            <p className="text-xs text-muted-foreground">Rank #234</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Portfolio */}
          <PortfolioCard />

          {/* Active Participations */}
          <Card>
            <CardHeader>
              <CardTitle>Active Participations</CardTitle>
              <CardDescription>
                Your ongoing activities across the ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* DAO Memberships */}
                <div>
                  <h4 className="font-medium mb-3">DAO Memberships</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'GameDev Collective', role: 'Member', status: 'Active' },
                      { name: 'Esports Alliance', role: 'Contributor', status: 'Active' },
                      { name: 'NFT Gaming Hub', role: 'Moderator', status: 'Active' }
                    ].map((dao, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {dao.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{dao.name}</p>
                            <p className="text-sm text-muted-foreground">{dao.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">{dao.status}</Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campaign Contributions */}
                <div>
                  <h4 className="font-medium mb-3">Campaign Contributions</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Indie RPG: Chronicles of Etheria', amount: '$500', status: 'Active' },
                      { name: 'NFT Trading Card Game', amount: '$250', status: 'Funded' }
                    ].map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">Contributed {campaign.amount}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                            {campaign.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reputation Card */}
          <ReputationCard />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create DAO
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Launch Campaign
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'Voted on proposal', dao: 'GameDev Collective', time: '2 hours ago' },
                  { action: 'Contributed to campaign', dao: 'Indie RPG Project', time: '1 day ago' },
                  { action: 'Joined DAO', dao: 'NFT Gaming Hub', time: '3 days ago' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.dao}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
