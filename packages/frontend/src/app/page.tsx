'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, DollarSign, Vote, Zap, Target, Coins, Shield, Trophy, Gamepad2, TrendingUp, Activity } from 'lucide-react'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useStakingPools } from '@/hooks/use-staking-pools'
import { WalletConnection } from '@/components/wallet/wallet-connection'
import { useRouter } from 'next/navigation'


export default function HomePage() {
  const { globalStats, isLoading } = useProtocolStats()
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
                  (globalStats.totalMembers).toLocaleString()
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
                  `$${parseFloat(globalStats.totalRaised).toLocaleString()}`
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
                  (globalStats.totalAchievements).toLocaleString()
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
                    {isLoading ? '...' : globalStats.totalOrganizations}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Members:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : globalStats.totalMembers}
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
                  Participate in decentralized decision-making through proposals, voting, and community governance mechanisms.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Proposals:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : globalStats.totalProposals}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Votes Cast:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : globalStats.totalVotes}
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
                View Proposals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Fundraising (Flow) */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-600"
            onClick={() => handleNavigate('/flow')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">Fundraising</CardTitle>
                <CardDescription className="text-base mt-2">
                  Launch and support game development campaigns with transparent funding, milestone tracking, and community backing.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Campaigns:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : globalStats.totalCampaigns}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-semibold">
                    {isLoading ? '...' : globalStats.activeCampaigns}
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

          {/* Staking */}
          <Card
            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-yellow-300 dark:hover:border-yellow-600"
            onClick={() => handleNavigate('/staking')}
          >
            <CardHeader className="space-y-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Coins className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-yellow-600 transition-colors">Staking</CardTitle>
                <CardDescription className="text-base mt-2">
                  Stake GAME tokens to earn rewards, participate in governance, and support the protocol ecosystem.
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
                className="w-full group-hover:bg-yellow-50 dark:group-hover:bg-yellow-950"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate('/staking')
                }}
              >
                Start Staking
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Why Choose GameDAO?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for gamers, by gamers. Experience the next generation of gaming infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Secure & Transparent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built on blockchain technology with full transparency and security for all transactions and governance decisions.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Gaming-First Design</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Purpose-built for gaming communities with features tailored to game development, esports, and gaming DAOs.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-8">
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Community Driven</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Governed entirely by the community through decentralized voting and proposal systems.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-8 py-16">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of gamers building the future of decentralized gaming. Connect your wallet and explore the ecosystem today.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <WalletConnection>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
              <Zap className="h-5 w-5 mr-2" />
              Get Started Now
            </Button>
          </WalletConnection>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => handleNavigate('/dashboard')}>
            <Activity className="h-5 w-5 mr-2" />
            View Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
