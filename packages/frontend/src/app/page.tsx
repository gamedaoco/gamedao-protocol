'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useUserRegistration } from '@/hooks/useUserRegistration'
import { formatAddress } from '@/lib/utils'

export default function HomePage() {
  const { isConnected, contracts } = useGameDAO()
  const { userProfile } = useUserRegistration()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to GameDAO Protocol
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {isConnected ? (
            userProfile?.isRegistered ?
              `Welcome back, ${userProfile.profile?.name}! Ready to manage your gaming DAOs?` :
              'Your wallet is connected. Create your profile to get started.'
          ) : (
            'Connect your wallet to start creating and managing gaming DAOs.'
          )}
        </p>
      </div>

      {/* Quick Stats */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">My Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">DAOs you're part of</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Campaigns you've backed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Governance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Proposals to vote on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.profile?.reputation || 0}</div>
              <p className="text-xs text-muted-foreground">Your reputation score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Protocol Modules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏛️</span>
              <div>
                <CardTitle>Control Module</CardTitle>
                <CardDescription>DAO Management & Treasury</CardDescription>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Create and manage gaming DAOs with advanced member management and multi-token treasury support.
            </p>
            <div className="text-xs text-muted-foreground">
              Contract: {formatAddress(contracts.CONTROL)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💸</span>
              <div>
                <CardTitle>Flow Module</CardTitle>
                <CardDescription>Crowdfunding & Campaigns</CardDescription>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Launch crowdfunding campaigns with multiple types, automated rewards, and transparent fee collection.
            </p>
            <div className="text-xs text-muted-foreground">
              Contract: {formatAddress(contracts.FLOW)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🗳️</span>
              <div>
                <CardTitle>Signal Module</CardTitle>
                <CardDescription>Governance & Voting</CardDescription>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Advanced governance with multiple voting mechanisms, delegation, and conviction voting.
            </p>
            <div className="text-xs text-muted-foreground">
              Contract: {formatAddress(contracts.SIGNAL)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👤</span>
              <div>
                <CardTitle>Sense Module</CardTitle>
                <CardDescription>Identity & Reputation</CardDescription>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Build your gaming reputation with achievements, social proof, and cross-DAO portability.
            </p>
            <div className="text-xs text-muted-foreground">
              Contract: {formatAddress(contracts.SENSE)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>🚀 Getting Started</CardTitle>
            <CardDescription>
              Ready to dive into the GameDAO ecosystem? Here's what you can do:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">🏢 Create or Join a DAO</h4>
                <p className="text-sm text-muted-foreground">
                  Start by creating your own gaming DAO or joining existing ones in your community.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🎯 Launch a Campaign</h4>
                <p className="text-sm text-muted-foreground">
                  Fund your gaming projects through crowdfunding campaigns with automated rewards.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">🗳️ Participate in Governance</h4>
                <p className="text-sm text-muted-foreground">
                  Vote on proposals and help shape the future of your gaming communities.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">⭐ Build Your Reputation</h4>
                <p className="text-sm text-muted-foreground">
                  Earn achievements and build reputation that follows you across all GameDAO organizations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
