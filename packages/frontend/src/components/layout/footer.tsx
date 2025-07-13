'use client'

import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { formatAddress } from '@/lib/utils'

export function Footer() {
  const { contracts, networkName, isConnected } = useGameDAO()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GameDAO Protocol
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized Autonomous Organizations for Gaming Communities
            </p>
          </div>

          {/* Modules */}
          <div className="space-y-2">
            <h4 className="font-medium">Modules</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <span>🏛️ Control</span>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span>🗳️ Signal</span>
                <Badge variant="outline" className="text-xs">Soon</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span>🪙 Staking</span>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span>💸 Flow</span>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span>👤 Sense</span>
                <Badge variant="outline" className="text-xs">Soon</Badge>
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <h4 className="font-medium">Resources</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>📚 Documentation</div>
              <div>🔗 GitHub</div>
              <div>💬 Discord</div>
              <div>🐦 Twitter</div>
            </div>
          </div>

          {/* Network Info */}
          <div className="space-y-2">
            <h4 className="font-medium">Network</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <span>Chain:</span>
                <Badge variant="outline" className="text-xs">
                  {networkName}
                </Badge>
              </div>
              {isConnected && (
                <>
                  <div className="space-y-1">
                    <div>Registry: {formatAddress(contracts.REGISTRY)}</div>
                    <div>Control: {formatAddress(contracts.CONTROL)}</div>
                    <div>Flow: {formatAddress(contracts.FLOW)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <div>
            © {currentYear} GameDAO Protocol. Built for Gaming Communities.
          </div>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <span>Made with ❤️ for Gamers</span>
            <Badge variant="outline" className="text-xs">
              v0.1.0
            </Badge>
          </div>
        </div>
      </div>
    </footer>
  )
}
