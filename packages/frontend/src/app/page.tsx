'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, DollarSign, Vote, Zap, Target, Coins, Shield, Trophy, Gamepad2, TrendingUp, Activity } from 'lucide-react'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useStakingPools } from '@/hooks/use-staking-pools'
import { WalletConnection } from '@/components/wallet/wallet-connection'
import { useRouter } from 'next/navigation'


export default function HomePage() {
  const { isConnected, address } = useGameDAO()
  const { globalStats: stats, isLoading } = useProtocolStats()
  const { stakingPools, globalStats: stakingStats } = useStakingPools()
  const router = useRouter()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-8 pt-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            GameDAO Protocol
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            The decentralized platform for gaming communities, fundraising, and governance.
            Create DAOs, fund game development, and participate in the future of gaming.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <WalletConnection>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
              Connect Wallet
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </WalletConnection>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6">
            Learn More
          </Button>
        </div>
      </div>

      {/* Protocol Growth Section */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Protocol Growth</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time metrics showcasing the growth and adoption of the GameDAO ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                <Coins className="h-5 w-5" />
                <span>Staking Pools</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                {isLoading ? (
                  <div className="h-8 w-12 bg-blue-200 dark:bg-blue-800 rounded animate-pulse"></div>
                ) : (
                  stakingPools.length
                )}
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Active staking opportunities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                <Users className="h-5 w-5" />
                <span>Community Members</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                {isLoading ? (
                  <div className="h-8 w-16 bg-green-200 dark:bg-green-800 rounded animate-pulse"></div>
                ) : (
                  stats.totalMembers.toLocaleString()
                )}
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Across all communities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                <DollarSign className="h-5 w-5" />
                <span>Total Raised</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                {isLoading ? (
                  <div className="h-8 w-20 bg-purple-200 dark:bg-purple-800 rounded animate-pulse"></div>
                ) : (
                  `$${parseFloat(stats.totalRaised).toLocaleString()}`
                )}
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                In successful campaigns
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                <TrendingUp className="h-5 w-5" />
                <span>Total Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800 dark:text-orange-200">
                {isLoading ? (
                  <div className="h-8 w-16 bg-orange-200 dark:bg-orange-800 rounded animate-pulse"></div>
                ) : (
                  stats.totalAchievements.toLocaleString()
                )}
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                Community milestones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Protocol Modules Cards */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Explore the Ecosystem</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the core modules that power the GameDAO protocol
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Communities (Control) */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600"
            onClick={() => handleNavigate('/control')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors">Communities</CardTitle>
                <CardDescription className="text-base mt-2">
                  Create and manage decentralized gaming organizations with transparent governance, treasury management, and member coordination.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total DAOs:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.totalOrganizations}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Members:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.totalMembers}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate('/control')
                }}
              >
                Explore Communities
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Governance (Signal) */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-300 dark:hover:border-purple-600"
            onClick={() => handleNavigate('/signal')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Vote className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">Governance</CardTitle>
                <CardDescription className="text-base mt-2">
                  Participate in decentralized governance with voting, proposals, and community decision-making
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Proposals:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.totalProposals}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Votes Cast:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.totalVotes}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full group-hover:bg-purple-50 dark:group-hover:bg-purple-950"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate('/signal')
                }}
              >
                View Governance
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Campaigns (Flow) */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-600"
            onClick={() => handleNavigate('/flow')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">Campaigns</CardTitle>
                <CardDescription className="text-base mt-2">
                  Fund game development with flexible crowdfunding models and transparent milestone tracking
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Campaigns:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.totalCampaigns}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stats.activeCampaigns}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full group-hover:bg-green-50 dark:group-hover:bg-green-950"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate('/flow')
                }}
              >
                Browse Campaigns
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Staking Pools */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-orange-300 dark:hover:border-orange-600"
            onClick={() => handleNavigate('/staking')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Coins className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-orange-600 transition-colors">Staking Pools</CardTitle>
                <CardDescription className="text-base mt-2">
                  Stake GAME tokens to earn rewards while supporting protocol governance and security
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Pools:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : stakingPools.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Staked:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : `${(Number(stakingStats.totalStaked) / 1e18).toFixed(0)}K`}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full group-hover:bg-orange-50 dark:group-hover:bg-orange-950"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate('/staking')
                }}
              >
                View Staking Pools
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Key Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools and features designed specifically for the gaming community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Gaming Communities (DAOs)",
              description: "Create and manage decentralized gaming organizations with transparent governance, treasury management, and member coordination.",
              icon: <Users className="h-8 w-8" />,
              color: "from-blue-500 to-blue-600"
            },
            {
              title: "Decentralized Governance",
              description: "Participate in community-driven decision making with transparent voting mechanisms and proposal systems.",
              icon: <Vote className="h-8 w-8" />,
              color: "from-purple-500 to-purple-600"
            },
            {
              title: "Reputation System",
              description: "Build trust and credibility through on-chain reputation tracking, achievements, and community recognition.",
              icon: <Shield className="h-8 w-8" />,
              color: "from-green-500 to-green-600"
            },
            {
              title: "Flexible Campaigns",
              description: "Launch crowdfunding campaigns with multiple models from grants to revenue sharing and milestone-based funding.",
              icon: <Target className="h-8 w-8" />,
              color: "from-orange-500 to-orange-600"
            },
            {
              title: "Staking Rewards",
              description: "Stake GAME tokens across multiple pools to earn rewards while supporting protocol governance and security.",
              icon: <Coins className="h-8 w-8" />,
              color: "from-yellow-500 to-yellow-600"
            },
            {
              title: "Battlepass System",
              description: "Gamified progression system with achievements, rewards, and seasonal challenges for active community members.",
              icon: <Trophy className="h-8 w-8" />,
              color: "from-pink-500 to-pink-600"
            }
          ].map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
              <CardHeader className="space-y-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-8 bg-gradient-to-r from-blue-50 via-purple-50 to-cyan-50 dark:from-blue-950 dark:via-purple-950 dark:to-cyan-950 rounded-2xl p-12 border-2 border-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Build the Future of Gaming?</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join the GameDAO ecosystem and start building, funding, and governing the next generation of gaming projects.
            Connect your wallet or sign in with email to get started.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <WalletConnection>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
              <Gamepad2 className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
          </WalletConnection>
          <WalletConnection>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Sign in with Email
            </Button>
          </WalletConnection>
        </div>

        <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            Secure & Decentralized
          </span>
          <span className="flex items-center">
            <Activity className="h-4 w-4 mr-1" />
            Real-time Updates
          </span>
          <span className="flex items-center">
            <Zap className="h-4 w-4 mr-1" />
            Low Gas Fees
          </span>
        </div>
      </div>
    </div>
  )
}
