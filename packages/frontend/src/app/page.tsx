'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, DollarSign, Vote, Zap, Target, Coins, Shield, Trophy, Gamepad2, TrendingUp, Activity, Rocket, Globe, Building, Sparkles, ChevronRight, Star, Circle } from 'lucide-react'
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
    <div className="space-y-20">
      {/* Hero Section */}
      <div className="text-center space-y-12 pt-8">
        <div className="space-y-8">
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              The Future of Game Creation & Distribution
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              GameDAO
            </span>
            <span className="block text-4xl md:text-6xl text-foreground mt-2">
              The Game Creation OS
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
            The first end-to-end operating system for game publishing, creation, and distribution.
            Empowering creators and communities to build better games together through decentralized governance,
            transparent fundraising, and collaborative development—bridging web2 and web3 ecosystems.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <WalletConnection>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
              <Rocket className="h-5 w-5 mr-2" />
              Start Building
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </WalletConnection>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6">
            <Globe className="h-5 w-5 mr-2" />
            Explore the Platform
          </Button>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Leading the Game Creation Revolution</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            GameDAO is the comprehensive platform where game creators, publishers, and communities converge to create,
            fund, and distribute exceptional games. We're building the infrastructure that powers the next generation of gaming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Publishing Leadership</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Advanced publishing infrastructure with integrated marketing, distribution, and monetization tools
                that help games reach global audiences.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Creation Excellence</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Collaborative development environment with funding, governance, and community engagement tools
                designed specifically for game creators.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Distribution Power</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Cross-ecosystem distribution network spanning web2 and web3 platforms, maximizing reach
                and enabling new monetization models.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Ecosystem */}
      <div className="space-y-12">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">The Complete Game Creation Ecosystem</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Four integrated modules that work together to support every aspect of game development,
            from initial concept to global distribution and ongoing community management.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Communities & Organizations */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 p-6"
            onClick={() => handleNavigate('/control')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors">Communities & Organizations</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Build gaming organizations that scale.</strong> Create DAOs, studios, and collectives with transparent governance,
                  treasury management, and member coordination. From indie teams to AAA studios, organize your creative community.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Organizations:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalOrganizations}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Community Members:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalMembers}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Fundraising & Publishing */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-600 p-6"
            onClick={() => handleNavigate('/flow')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">Fundraising & Publishing</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Fund and publish games transparently.</strong> Launch crowdfunding campaigns, manage development milestones,
                  and distribute rewards to backers. Bridge traditional publishing with community-driven funding models.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Campaigns:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalCampaigns}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Funds Raised:</span>
                <span className="font-bold text-lg">
                  ${isLoading ? '...' : parseFloat(globalStats.totalRaised).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Governance & Decisions */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-300 dark:hover:border-purple-600 p-6"
            onClick={() => handleNavigate('/signal')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Vote className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">Governance & Decisions</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Make decisions together.</strong> Propose features, vote on development priorities, and govern project direction.
                  Democratic decision-making that keeps communities and creators aligned on vision and execution.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Proposals:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalProposals}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Votes Cast:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalVotes}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Staking & Rewards */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-yellow-300 dark:hover:border-yellow-600 p-6"
            onClick={() => handleNavigate('/staking')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Coins className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-yellow-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-yellow-600 transition-colors">Staking & Rewards</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Invest in the ecosystem's growth.</strong> Stake GAME tokens to earn rewards, participate in governance,
                  and access premium features. Support the platform while earning from its success.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Pools:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : stakingPools.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Staked:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : `${(Number(stakingStats.totalStaked) / 1e18).toFixed(0)}K`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">How GameDAO Powers Better Games</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From concept to community, GameDAO provides the tools and infrastructure needed to create,
            fund, and distribute successful games while building lasting communities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold">Form & Organize</h3>
            <p className="text-muted-foreground">
              Create your gaming organization, assemble your team, and establish transparent governance structures.
              Set up treasuries, define roles, and coordinate development efforts.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold">Fund & Develop</h3>
            <p className="text-muted-foreground">
              Launch funding campaigns, engage with backers, and develop your game with community input.
              Use governance tools to make decisions and maintain transparency throughout development.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold">Distribute & Engage</h3>
            <p className="text-muted-foreground">
              Launch across web2 and web3 platforms, reward your community, and build lasting relationships
              with players. Continue evolving your game based on community feedback and engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Powering the Gaming Revolution</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time metrics showcasing the growth and impact of the GameDAO ecosystem
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {isLoading ? '...' : globalStats.totalOrganizations}
              </div>
              <p className="text-sm text-muted-foreground">Gaming Organizations</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-green-600">
                ${isLoading ? '...' : parseFloat(globalStats.totalRaised).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Raised for Games</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">
                {isLoading ? '...' : globalStats.totalMembers}
              </div>
              <p className="text-sm text-muted-foreground">Active Creators</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-yellow-600">
                {isLoading ? '...' : globalStats.totalCampaigns}
              </div>
              <p className="text-sm text-muted-foreground">Funded Projects</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Why Choose GameDAO */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Why Game Creators Choose GameDAO</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            The only platform that combines the best of web2 and web3 to create a comprehensive
            operating system for game development, publishing, and community building.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Transparent & Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built on blockchain technology with complete transparency in funding, governance, and operations.
                Your community knows exactly how decisions are made and funds are used.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">End-to-End Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                From initial concept to global distribution, GameDAO handles every aspect of game development.
                No need to piece together multiple tools and platforms.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Community-Driven</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Engage your community throughout development with governance tools, funding mechanisms,
                and reward systems that align everyone toward creating exceptional games.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Cross-Ecosystem</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bridge web2 and web3 ecosystems seamlessly. Reach traditional gaming audiences while
                leveraging blockchain benefits like ownership, governance, and new monetization models.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Creator-Focused</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Designed specifically for game creators, with tools and workflows that understand the unique
                challenges of game development, from pre-production to live operations.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Proven Success</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Join successful game creators who are already using GameDAO to build, fund, and distribute
                their games. Be part of the next generation of gaming success stories.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Ready to Build Better Games?</h2>
            <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
              Join the gaming revolution. Create your organization, fund your projects, and build the games
              that define the future of interactive entertainment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <WalletConnection>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                <Rocket className="h-5 w-5 mr-2" />
                Start Your Journey
              </Button>
            </WalletConnection>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6">
              <Activity className="h-5 w-5 mr-2" />
              Explore the Platform
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
