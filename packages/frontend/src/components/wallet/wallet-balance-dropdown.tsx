'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useTokenBalances, useSenseUsername } from '@/hooks/useTokenBalances'
import { formatAddress } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  Coins,
  DollarSign,
  Gamepad2,
  Copy,
  ExternalLink,
  LogOut,
  Wallet,
  User,
  TrendingUp,
  Network,
  Shield,
  Settings,
  UserCircle
} from 'lucide-react'

type BalanceView = 'total' | 'network' | 'tokens'

export function WalletBalanceDropdown() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const { balances, isLoading, ethBalance, gameBalance, usdcBalance } = useTokenBalances()
  const { username: senseUsername, isLoading: usernameLoading } = useSenseUsername(address)
  const [copied, setCopied] = useState(false)
  const [balanceView, setBalanceView] = useState<BalanceView>('total')

  // Format numbers with compact notation (k, m) and 2 decimal places
  const formatCompactNumber = (value: number): string => {
    if (value === 0) return '0'

    if (value < 1000) {
      return value.toFixed(2).replace(/\.?0+$/, '')
    }

    if (value < 1000000) {
      const thousands = value / 1000
      return `${thousands.toFixed(2).replace(/\.?0+$/, '')}k`
    }

    const millions = value / 1000000
    return `${millions.toFixed(2).replace(/\.?0+$/, '')}m`
  }

  // Cycle through balance views
  const cycleBalanceView = () => {
    setBalanceView(current => {
      const next = current === 'total' ? 'network' :
                   current === 'network' ? 'tokens' : 'total'
      return next
    })
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openEtherscan = () => {
    if (address) {
      window.open(`https://etherscan.io/address/${address}`, '_blank')
    }
  }

  // Calculate total USD value (mock calculation)
  const calculateTotalValue = () => {
    const ethPrice = 2000 // Mock ETH price
    const gamePrice = 0.1 // Mock GAME price
    const usdcPrice = 1 // USDC price

    const ethValue = parseFloat(ethBalance.balance) * ethPrice
    const gameValue = parseFloat(gameBalance.balance) * gamePrice
    const usdcValue = parseFloat(usdcBalance.balance) * usdcPrice

    return ethValue + gameValue + usdcValue
  }

  const getBalanceDisplay = () => {
    if (balanceView === 'total') {
      const totalValue = calculateTotalValue()
      return `$${formatCompactNumber(totalValue)} USD`
    }

    if (balanceView === 'network') {
      const ethValue = parseFloat(ethBalance.balance)
      return `${formatCompactNumber(ethValue)} ETH`
    }

    // tokens view
    const gameValue = parseFloat(gameBalance.balance)
    const usdcValue = parseFloat(usdcBalance.balance)
    return `${formatCompactNumber(gameValue)} GAME • ${formatCompactNumber(usdcValue)} USDC`
  }

  const getBalanceIcon = () => {
    switch (balanceView) {
      case 'total': return <TrendingUp className="h-3 w-3" />
      case 'network': return <Network className="h-3 w-3" />
      case 'tokens': return <Gamepad2 className="h-3 w-3" />
      default: return <TrendingUp className="h-3 w-3" />
    }
  }

  const getBalanceLabel = () => {
    switch (balanceView) {
      case 'total': return 'Total Value'
      case 'network': return 'Network Balance'
      case 'tokens': return 'Governance • Payment'
      default: return 'Total Value'
    }
  }

  if (!isConnected) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Interactive wallet info - completely separate from dropdown */}
      <div className="flex flex-col items-start gap-0.5 min-w-[140px]">
        {/* Top line: Username or Address - Copy on click */}
        <button
          onClick={copyAddress}
          className="text-sm font-medium hover:text-primary transition-colors text-left flex items-center gap-1"
        >
          <span>
            {senseUsername ? `@${senseUsername}` : formatAddress(address)}
            {copied && <span className="text-xs text-green-600 ml-1">✓</span>}
          </span>
          {senseUsername && (
            <Shield className="h-3 w-3 text-green-600 flex-shrink-0" />
          )}
        </button>

        {/* Bottom line: Cycling balance info - Cycle on click */}
        <button
          onClick={cycleBalanceView}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-1 w-full"
          title={`Click to cycle (Current: ${getBalanceLabel()})`}
        >
          <span className="flex-1 text-left">{getBalanceDisplay()}</span>
          <span className="opacity-60 flex-shrink-0">
            {getBalanceIcon()}
          </span>
        </button>
      </div>

      {/* Dropdown menu - separate trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="p-1 h-auto">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet Details
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Identity Section */}
          <div className="px-2 py-2">
            <div className="text-xs text-muted-foreground mb-1">Identity</div>
            <div className="space-y-2">
              {senseUsername && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">@{senseUsername}</span>
                  </div>
                  <div className="text-xs text-green-600">Verified</div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatAddress(address)}
                </code>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={copyAddress}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={openEtherscan}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Balance Overview */}
          <div className="px-2 py-2">
            <div className="text-xs text-muted-foreground mb-2">Balance Overview</div>
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <div className="text-center">
                <div className="text-lg font-semibold">${formatCompactNumber(calculateTotalValue())} USD</div>
                <div className="text-xs text-muted-foreground">Total Portfolio Value</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Ethereum</span>
                </div>
                <div className="text-sm font-medium">{formatCompactNumber(parseFloat(ethBalance.balance))} ETH</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">GameDAO</span>
                </div>
                <div className="text-sm font-medium">{formatCompactNumber(parseFloat(gameBalance.balance))} GAME</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">USD Coin</span>
                </div>
                <div className="text-sm font-medium">{formatCompactNumber(parseFloat(usdcBalance.balance))} USDC</div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Quick Actions */}
          <div className="px-2 py-1">
            <div className="text-xs text-muted-foreground mb-2">Quick Actions</div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={cycleBalanceView}
              >
                Current View: {getBalanceLabel()}
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Navigation */}
          <div className="px-2 py-1">
            <div className="text-xs text-muted-foreground mb-2">Navigation</div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => router.push(`/sense/${address}`)}
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => router.push('/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Disconnect */}
          <DropdownMenuItem onClick={() => disconnect()} className="text-red-600 focus:text-red-600">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
