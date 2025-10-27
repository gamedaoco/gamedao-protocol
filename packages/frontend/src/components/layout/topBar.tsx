'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'
import { keccak256, stringToBytes } from 'viem'
import { ModeToggle } from '@/components/mode-toggle'
import { WalletConnection } from '@/components/wallet/wallet-connection'
import { WalletBalanceDropdown } from '@/components/wallet/wallet-balance-dropdown'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { isConnected } = useGameDAO()
  const { data: modulesData, refetch } = useQuery(GET_MODULES, { pollInterval: 5000, errorPolicy: 'ignore' })
  const enabled = new Set<string>((modulesData?.modules || [])
    .filter((m: any) => m.enabled)
    .map((m: any) => m.id))

  const idHex = (name: string) => keccak256(stringToBytes(name))
  const pathname = usePathname()

  // Helper function to determine if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  // Helper function to get nav item classes
  const getNavClasses = (path: string) => {
    const baseClasses = "text-sm transition-colors hover:text-foreground/80"
    return isActive(path)
      ? `${baseClasses} text-foreground font-medium`
      : `${baseClasses} text-foreground/60`
  }

  return (
    <header className="sticky top-0 z-50 w-full glass-bar">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* Logo */}
        <div className="mr-6 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="/gamedao-color-square.svg"
              alt="GameDAO Logo"
              className="h-8 w-8"
            />
            <span className="font-bold">GameDAO</span>
          </Link>
        </div>

        {/* Navigation - Left aligned after logo */}
        <nav className="flex items-center space-x-6 text-sm mr-auto">
          {enabled.has(idHex('CONTROL')) && (
            <Link href="/control" className={getNavClasses('/control')}>
              Collectives
            </Link>
          )}
          {enabled.has(idHex('SIGNAL')) && (
            <Link href="/signal" className={getNavClasses('/signal')}>
              Governance
            </Link>
          )}
          {enabled.has(idHex('STAKING')) && (
            <Link href="/staking" className={getNavClasses('/staking')}>
              Staking
            </Link>
          )}
          {enabled.has(idHex('FLOW')) && (
            <Link href="/flow" className={getNavClasses('/flow')}>
              Campaigns
            </Link>
          )}
          {enabled.has(idHex('SENSE')) && (
            <Link href="/sense" className={getNavClasses('/sense')}>
              Profiles
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-4 text-sm">
          {/* Dashboard - only show when connected */}
          {isConnected && (
            <div className="flex items-center space-x-2">
              <Link
                href="/dashboard"
                className={getNavClasses('/dashboard')}
              >
                Dashboard
              </Link>
              <NotificationBell />
            </div>
          )}

          {/* Wallet - show balance dropdown if connected, connect button if not */}
          {isConnected ? (
            <WalletBalanceDropdown />
          ) : (
            <WalletConnection>
              <Button variant="glass" size="sm">
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
