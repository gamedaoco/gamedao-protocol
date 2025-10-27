'use client'

import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'
import { keccak256, stringToBytes } from 'viem'

export function Footer() {
  const { contracts, networkName, isConnected, blockExplorer } = useGameDAO()
  const currentYear = new Date().getFullYear()
  const { data: modulesData } = useQuery(GET_MODULES, { pollInterval: 5000, errorPolicy: 'ignore' })
  const enabled = new Set<string>((modulesData?.modules || [])
    .filter((m: any) => m.enabled)
    .map((m: any) => m.id))
  const idHex = (name: string) => keccak256(stringToBytes(name))

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <img
                src="/gamedao-color-square.svg"
                alt="GameDAO"
                className="h-6 w-6"
              />
              <div className="text-lg font-bold text-primary">
                GameDAO Protocol
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized Autonomous Organizations for Gaming Communities
            </p>
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
                <span>Network:</span>
                <Badge variant="outline" className="text-xs">
                  {networkName}
                </Badge>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full bg-green-500`}></div>
                  <span>🧭 Registry</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.REGISTRY}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.REGISTRY}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${enabled.has(idHex('CONTROL')) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>🏛️ Control</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.CONTROL}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.CONTROL}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${enabled.has(idHex('SIGNAL')) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>🗳️ Signal</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.SIGNAL}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.SIGNAL}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${enabled.has(idHex('STAKING')) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>🪙 Staking</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.STAKING}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.STAKING}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${enabled.has(idHex('FLOW')) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>💸 Flow</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.FLOW}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.FLOW}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${enabled.has(idHex('SENSE')) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>👤 Sense</span>
                  {blockExplorer && (
                    <a
                      href={`${blockExplorer}/address/${contracts.SENSE}`}
                      target="_blank"
                      rel="noreferrer"
                      title={contracts.SENSE}
                      className="text-xs underline"
                    >
                      Explorer
                    </a>
                  )}
                </div>
              </div>

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
