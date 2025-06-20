'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useGameDAO } from '@/hooks/useGameDAO'

export function WalletConnection() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { contractsValid } = useGameDAO()
  const [isOpen, setIsOpen] = useState(false)

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      // You could add a toast notification here
    }
  }

  const openExplorer = () => {
    if (address) {
      window.open(`https://etherscan.io/address/${address}`, '_blank')
    }
  }

  if (!isConnected) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            <Wallet className="h-4 w-4 mr-2" />
            {isPending ? 'Connecting...' : 'Connect Wallet'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Choose Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => {
                connect({ connector })
                setIsOpen(false)
              }}
              disabled={isPending}
              className="flex items-center justify-between"
            >
              <span>{connector.name}</span>
              {connector.name.toLowerCase().includes('talisman') && (
                <Badge variant="secondary" className="text-xs">
                  Polkadot
                </Badge>
              )}
              {connector.name.toLowerCase().includes('metamask') && (
                <Badge variant="secondary" className="text-xs">
                  Popular
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="hidden sm:inline">
              {address ? formatAddress(address) : 'Connected'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Wallet Connected</span>
          <Badge variant={contractsValid ? "default" : "destructive"} className="text-xs">
            {contractsValid ? "GameDAO Ready" : "Network Issue"}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {address && (
          <>
            <DropdownMenuItem onClick={copyAddress} className="flex items-center">
              <Copy className="h-4 w-4 mr-2" />
              <span className="flex-1">Copy Address</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={openExplorer} className="flex items-center">
              <ExternalLink className="h-4 w-4 mr-2" />
              <span className="flex-1">View on Explorer</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onClick={() => disconnect()}
          className="flex items-center text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="flex-1">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
