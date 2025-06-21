'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, TrendingUp, DollarSign } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'

export default function ControlPage() {
  const { isConnected } = useGameDAO()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage and discover gaming DAOs in the GameDAO ecosystem
          </p>
        </div>
        <Button disabled={!isConnected} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create DAO</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total DAOs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Active Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">+18% growth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Total Value Locked</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">Across all treasuries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your DAOs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isConnected ? '3' : '0'}</div>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Member of 3 DAOs' : 'Connect wallet to see'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DAO List */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            Browse and join gaming DAOs that match your interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample DAO Items */}
            {[
              {
                name: 'GameDev Collective',
                description: 'Supporting indie game developers worldwide',
                members: 156,
                treasury: '$45,000',
                category: 'Development',
                status: 'active'
              },
              {
                name: 'Esports Alliance',
                description: 'Professional esports team management and tournaments',
                members: 89,
                treasury: '$120,000',
                category: 'Esports',
                status: 'active'
              },
              {
                name: 'NFT Gaming Hub',
                description: 'Building the future of blockchain gaming',
                members: 234,
                treasury: '$78,000',
                category: 'NFT',
                status: 'active'
              }
            ].map((dao, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {dao.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium">{dao.name}</h3>
                    <p className="text-sm text-muted-foreground">{dao.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-muted-foreground">{dao.members} members</span>
                      <span className="text-xs text-muted-foreground">{dao.treasury} treasury</span>
                      <Badge variant="secondary" className="text-xs">{dao.category}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {dao.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!isConnected && (
            <div className="text-center py-8 border-t mt-6">
              <p className="text-muted-foreground mb-4">
                Connect your wallet to see more organizations and join DAOs
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
