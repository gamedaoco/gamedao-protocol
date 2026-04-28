'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Users, Vote, Target, Shield, Trophy, Gamepad2, Activity, Rocket, Globe, Building, Sparkles, ChevronRight, Star } from 'lucide-react'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { WalletConnection } from '@/components/wallet/wallet-connection'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { globalStats, isLoading } = useProtocolStats()
  const router = useRouter()

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className="space-y-20">
      {/* Hero */}
      <div className="text-center space-y-12 pt-8">
        <div className="space-y-8">
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium bg-accent/30 border-accent/40">
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              For people who build things together
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="block text-primary">
              GameDAO
            </span>
            <span className="block text-4xl md:text-6xl text-foreground mt-2">
              Make the next thing your community wants to see
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
            A home for collectives, studios, bands, mod teams, and small labels to rally a community,
            fund the work, and ship together. Think Kickstarter for the long haul, paired with
            a place to put everything you&apos;ve ever made.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <WalletConnection>
            <Button size="lg" className="bg-primary text-primary-foreground hover:opacity-90 text-lg px-8 py-6">
              <Rocket className="h-5 w-5 mr-2" />
              Start a project
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </WalletConnection>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6">
            <Globe className="h-5 w-5 mr-2" />
            Browse what&apos;s live
          </Button>
        </div>
      </div>

      {/* Three pillars */}
      <div className="bg-accent/20 dark:bg-secondary/40 rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Build it. Fund it. Ship it.</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            For game studios, indie devs, musicians, illustrators, modders, FOSS maintainers, zine
            publishers — anyone with a project and the people to make it real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Form your collective</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Spin up a band, studio, mod team, or label. Invite the people you actually make
                things with. Keep the door open or shut it depending on the project.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Fund the work</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Run a campaign for the album, the demo, the next chapter. Set the goal, decide the
                rewards, let the people who actually want it built chip in.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-chart-2 text-white flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Keep shipping</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Build a body of work everyone can point to. Your collective stays put, your community
                grows, and the next thing gets easier than the last.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-12">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Everything in one place</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From &ldquo;we should make a thing&rdquo; to a finished release with a credits page everyone shows up on.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Collectives */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 p-6"
            onClick={() => handleNavigate('/collectives')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors">Collectives</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Find your people.</strong> Studios, bands, mod squads, art collectives, FOSS maintainer
                  groups. Open membership or invite-only — your call.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active collectives:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalOrganizations}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalMembers}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-600 p-6"
            onClick={() => handleNavigate('/campaigns')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-chart-2 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-green-600 transition-colors">Campaigns</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Fund the work.</strong> Set a goal, list the milestones, share what backers
                  get for showing up early. Funding goes straight to the collective, not us.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total campaigns:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalCampaigns}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Funds raised:</span>
                <span className="font-bold text-lg">
                  ${isLoading ? '...' : parseFloat(globalStats.totalRaised).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Profiles */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-300 dark:hover:border-purple-600 p-6"
            onClick={() => handleNavigate('/profiles')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-purple-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">Profiles</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Build a track record.</strong> A profile that follows you across collectives —
                  the things you&apos;ve shipped, the people you&apos;ve shipped them with.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profiles:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalMembers}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Decisions (governance, demoted in language) */}
          <Card
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-yellow-300 dark:hover:border-yellow-600 p-6"
            onClick={() => handleNavigate('/governance')}
          >
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-chart-4 text-black flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Vote className="h-8 w-8 text-white" />
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-yellow-600 transition-colors" />
              </div>
              <div>
                <CardTitle className="text-2xl group-hover:text-yellow-600 transition-colors">Decisions</CardTitle>
                <CardDescription className="text-base mt-2 leading-relaxed">
                  <strong>Decide together when it matters.</strong> Vote on the next track, the
                  release date, the cover art. Lightweight when you want it, formal when you need it.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Open questions:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalProposals}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Votes cast:</span>
                <span className="font-bold text-lg">
                  {isLoading ? '...' : globalStats.totalVotes}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How it goes */}
      <div className="bg-card rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">How it usually goes</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Three steps from &ldquo;we should do this&rdquo; to a thing in someone&apos;s hands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold">Form a collective</h3>
            <p className="text-muted-foreground">
              Round up the people you actually want to ship with. Settle on how decisions get
              made and who&apos;s on the credits — once, so it&apos;s not on you every time.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold">Run a campaign</h3>
            <p className="text-muted-foreground">
              Decide what you&apos;re making, what it&apos;ll cost, and what backers get for showing up early.
              Share it. Let the people who care fund the work directly.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-chart-2 text-white flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold">Ship it</h3>
            <p className="text-muted-foreground">
              Drop the release. Send rewards. Update everyone on what&apos;s next. Repeat — with a
              track record that compounds across the whole collective.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">What&apos;s been built so far</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live numbers from collectives shipping right now.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {isLoading ? '...' : globalStats.totalOrganizations}
              </div>
              <p className="text-sm text-muted-foreground">Collectives</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-green-600">
                ${isLoading ? '...' : parseFloat(globalStats.totalRaised).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Raised by communities</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">
                {isLoading ? '...' : globalStats.totalMembers}
              </div>
              <p className="text-sm text-muted-foreground">People involved</p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold text-yellow-600">
                {isLoading ? '...' : globalStats.totalCampaigns}
              </div>
              <p className="text-sm text-muted-foreground">Campaigns shipped</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Six benefits */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Built for the way you actually make things</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Tools that fit how a band books a tour, how a studio finishes a build, how a mod team
            ships an update.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Receipts, not promises</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Every contribution, every payout, every decision is on the record. Your community
                sees where the money went and who agreed to what.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">One place, end to end</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Form the team, run the campaign, deliver the rewards, plan the next thing — all in
                one place that doesn&apos;t vanish between projects.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-chart-2 text-white flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Made for collectives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bands, studios, mod squads, FOSS maintainers — projects with more than one person on
                the credits. The defaults are built around that.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-chart-4 text-black flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Your audience, not the platform&apos;s</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Backers come straight to your collective. We don&apos;t sit between you and the people
                who care about your work.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Track record that compounds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Every release adds to your collective&apos;s profile. The next campaign starts with
                everything you&apos;ve already shipped vouching for it.
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-chart-2 text-white flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Built for the long haul</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Not a one-shot funding event. Run multiple campaigns, keep your community across
                releases, ship your second album with the people who funded the first.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-primary rounded-3xl p-12 text-center text-primary-foreground">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Got a project?</h2>
            <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
              Form a collective, run a campaign, ship the thing your community has been waiting for.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <WalletConnection>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                <Rocket className="h-5 w-5 mr-2" />
                Start a project
              </Button>
            </WalletConnection>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6">
              <Activity className="h-5 w-5 mr-2" />
              Browse what&apos;s live
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
