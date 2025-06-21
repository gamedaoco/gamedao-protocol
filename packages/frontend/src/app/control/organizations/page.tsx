'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'

export default function OrganizationsPage() {
  const { isConnected } = useGameDAO()

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>🔌 Wallet Required</CardTitle>
            <CardDescription>
              Please connect your wallet to view and manage organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect your wallet using the button in the top navigation to access the Control module features.
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
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your gaming DAOs and discover new communities
          </p>
        </div>
        <Button>
          🏢 Create Organization
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Organizations you own</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Member Of</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Organizations you've joined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Across all your DAOs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Treasury Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">Total managed assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Organizations</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              🔄 Refresh
            </Button>
            <Button variant="outline" size="sm">
              🔍 Discover
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium mb-2">No Organizations Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              You haven't created or joined any gaming DAOs yet. Start by creating your first organization or discovering existing communities.
            </p>
            <div className="flex space-x-2">
              <Button>
                ➕ Create Your First DAO
              </Button>
              <Button variant="outline">
                🔍 Discover DAOs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Organizations */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Discover Gaming DAOs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Example Organizations */}
          {[
            {
              name: "Pixel Warriors Guild",
              description: "A community for indie game developers and pixel art enthusiasts",
              members: 156,
              treasury: "$12.5K",
              tags: ["Indie", "Pixel Art", "Development"]
            },
            {
              name: "Esports Champions DAO",
              description: "Professional esports team management and tournament organization",
              members: 89,
              treasury: "$45.2K",
              tags: ["Esports", "Tournaments", "Professional"]
            },
            {
              name: "Retro Gaming Collective",
              description: "Preserving and celebrating classic gaming culture",
              members: 234,
              treasury: "$8.9K",
              tags: ["Retro", "Preservation", "Community"]
            }
          ].map((org, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription className="mt-1">{org.description}</CardDescription>
                  </div>
                  <Badge variant="outline">Public</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>👥 {org.members} members</span>
                  <span>💰 {org.treasury}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {org.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Join Organization
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
