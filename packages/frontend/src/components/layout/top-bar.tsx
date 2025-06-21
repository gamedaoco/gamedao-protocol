'use client'

import Link from 'next/link'
import { useGameDAO } from '@/hooks/useGameDAO'
import { ModeToggle } from '@/components/mode-toggle'
import { ReputationCard } from '@/components/reputation/reputation-card'
import { WalletConnection } from '@/components/wallet/wallet-connection'

export function TopBar() {
  const { isConnected } = useGameDAO()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* Logo */}
        <div className="mr-6 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500" />
            <span className="font-bold">GameDAO</span>
          </Link>
        </div>

        {/* Navigation - Left aligned after logo */}
        <nav className="flex items-center space-x-6 text-sm mr-auto">
          {isConnected && (
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
          )}
          <Link
            href="/control"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Organizations
          </Link>
          <Link
            href="/flow"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Campaigns
          </Link>
          <Link
            href="/signal"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Governance
          </Link>
          <Link
            href="/sense"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Profiles
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Reputation Card - only show when connected */}
          {isConnected && <ReputationCard />}

          {/* Wallet Connection */}
          <WalletConnection />

          {/* Theme Toggle */}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
