'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatAddress } from '@/lib/utils'
import { CONTRACTS } from '@/lib/web3'

export default function HomePage() {
  const { address, isConnected, chain } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          GameDAO Protocol
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Decentralized Autonomous Organizations for Gaming Communities
        </p>
        <p className="text-lg text-muted-foreground mt-2">
          Create, manage, and govern gaming DAOs with advanced treasury, governance, and reputation systems.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Web3 Connection</CardTitle>
          <CardDescription>
            Connect your wallet to interact with the GameDAO Protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connected Account</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAddress(address!)}
                  </p>
                </div>
                <Badge variant="secondary">
                  {chain?.name || 'Unknown Network'}
                </Badge>
              </div>
              <Button onClick={() => disconnect()} variant="outline">
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Please connect your wallet to get started
              </p>
              <div className="flex flex-wrap gap-2">
                {connectors.map((connector) => (
                  <Button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    variant="outline"
                  >
                    Connect {connector.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Control Module</CardTitle>
            <CardDescription>DAO Management</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Organization creation, member management, and treasury integration
            </p>
            <Badge variant="secondary" className="text-xs">
              {formatAddress(CONTRACTS.CONTROL)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flow Module</CardTitle>
            <CardDescription>Crowdfunding</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Campaign creation, contributions, and reward distribution
            </p>
            <Badge variant="secondary" className="text-xs">
              {formatAddress(CONTRACTS.FLOW)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signal Module</CardTitle>
            <CardDescription>Governance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Proposals, voting, and delegation systems
            </p>
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sense Module</CardTitle>
            <CardDescription>Identity & Reputation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Profiles, achievements, and cross-DAO reputation
            </p>
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Protocol Features</CardTitle>
          <CardDescription>
            Comprehensive tooling for gaming community governance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">🏛️ DAO Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Organization creation and configuration</li>
                <li>• Member lifecycle management</li>
                <li>• Multi-token treasury support</li>
                <li>• GAME token staking requirements</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">💰 Crowdfunding</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multiple campaign types (Grant, Raise, etc.)</li>
                <li>• ETH and ERC20 contributions</li>
                <li>• Automated reward distribution</li>
                <li>• Protocol fee collection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🗳️ Governance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Advanced voting mechanisms</li>
                <li>• Delegation and conviction voting</li>
                <li>• Proposal execution framework</li>
                <li>• Multi-signature support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">👤 Identity</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• User profiles and verification</li>
                <li>• Achievement and reputation systems</li>
                <li>• Cross-DAO reputation portability</li>
                <li>• Social feedback mechanisms</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Separator className="my-8" />
      <div className="text-center text-sm text-muted-foreground">
        <p>GameDAO Protocol - Built for Gaming Communities</p>
        <p className="mt-1">
          Registry: {formatAddress(CONTRACTS.REGISTRY)} |
          Chain: {chain?.name || 'Not Connected'}
        </p>
      </div>
    </div>
  )
}
