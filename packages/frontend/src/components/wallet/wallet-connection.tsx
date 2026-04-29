'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

interface WalletConnectionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Top-level wallet entry point. Pre-Privy this surfaced a custom modal that
 * iterated wagmi connectors; now login goes through Privy's hosted modal
 * (email + Google + Apple + Discord) and the embedded wallet is provisioned
 * automatically. The wagmi adapter (@privy-io/wagmi) bridges that wallet
 * back into wagmi so existing hooks (`useAccount`, `useReadContract`,
 * `useWriteContract`, etc.) keep working with no callsite changes.
 *
 * Stage 1 only: AA / smart-wallet / paymaster paths are out of scope here
 * and will be enabled in Stages 2+ via
 * `embeddedWallets.ethereum.useSmartWallets`.
 */
export function WalletConnection({ children, className }: WalletConnectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { ready, authenticated, login, logout, user } = usePrivy()

  // Privy initialises async; consuming auth state before `ready` flickers
  // and can race with login. The skill flags this as the most common
  // gotcha — when not ready, render the trigger inert.
  if (!ready) {
    return (
      <div className={className} aria-busy="true">
        {children}
      </div>
    )
  }

  const handleLogin = () => {
    try {
      login()
    } catch (err) {
      console.error('Privy login failed:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsOpen(false)
    } catch (err) {
      console.error('Privy logout failed:', err)
    }
  }

  // Authenticated → trigger opens a small status dialog with a logout
  // action. Richer wallet UX (balances, address copy, etc.) lives in
  // `WalletBalanceDropdown`.
  if (authenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className={className}>{children}</div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>
              {user?.email?.address
                ? `Signed in as ${user.email.address}`
                : 'Your embedded wallet is connected to GameDAO.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
              <Shield className="h-8 w-8 text-green-600 mr-2" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                Wallet Connected
              </span>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Not authenticated → trigger fires Privy's hosted modal directly.
  return (
    <button
      type="button"
      className={className}
      onClick={handleLogin}
      aria-label="Sign in to GameDAO"
    >
      {children}
    </button>
  )
}

/**
 * Marketing-flavoured "why connect" card that the previous component
 * embedded inside its dialog. Exported standalone so any caller that
 * relied on the surrounding copy can render it next to the connect button.
 */
export function WalletConnectionBenefits() {
  return (
    <Card className="bg-accent/20 dark:bg-secondary/40 border-accent/40 dark:border-secondary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Why Connect?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Create and join gaming communities</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <span>Participate in governance and voting</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Support and fund game development</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span>Earn rewards through staking</span>
        </div>
      </CardContent>
    </Card>
  )
}
