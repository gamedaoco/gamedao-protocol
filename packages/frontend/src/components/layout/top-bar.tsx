'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGameDAO } from '@/hooks/useGameDAO'
import { ModeToggle } from '@/components/mode-toggle'
import { WalletConnection } from '@/components/wallet/wallet-connection'
import { WalletBalanceDropdown } from '@/components/wallet/wallet-balance-dropdown'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { isConnected } = useGameDAO()
  const pathname = usePathname()

  // Helper function to determine if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  // Helper function to get nav item classes
  const getNavClasses = (path: string) => {
    const baseClasses = "transition-colors hover:text-foreground/80"
    return isActive(path)
      ? `${baseClasses} text-foreground font-medium`
      : `${baseClasses} text-foreground/60`
  }

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
          <Link
            href="/staking"
            className={getNavClasses('/staking')}
          >
            Staking
          </Link>
          <Link
            href="/control"
            className={getNavClasses('/control')}
          >
            Organizations
          </Link>
          <Link
            href="/flow"
            className={getNavClasses('/flow')}
          >
            Campaigns
          </Link>
          <Link
            href="/signal"
            className={getNavClasses('/signal')}
          >
            Governance
          </Link>
          <Link
            href="/sense"
            className={getNavClasses('/sense')}
          >
            Profiles
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Dashboard - only show when connected */}
          {isConnected && (
            <Link
              href="/dashboard"
              className={getNavClasses('/dashboard')}
            >
              Dashboard
            </Link>
          )}

          {/* Wallet - show balance dropdown if connected, connect button if not */}
          {isConnected ? (
            <WalletBalanceDropdown />
          ) : (
            <WalletConnection>
              <Button variant="outline" size="sm">
                Connect Wallet
              </Button>
            </WalletConnection>
          )}

          {/* Theme Toggle */}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
