'use client'

import { useState } from 'react'
import { useConnect, useDisconnect, useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Wallet, Mail, Phone, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react'

interface WalletConnectionProps {
  children: React.ReactNode
  className?: string
}

export function WalletConnection({ children, className }: WalletConnectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [magicMode, setMagicMode] = useState<'email' | 'phone'>('email')
  const [magicInput, setMagicInput] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { isConnected } = useAccount()

  const handleWalletConnect = async (connector: any) => {
    setIsConnecting(true)
    try {
      await connect({ connector })
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleMagicConnect = async () => {
    if (!magicInput.trim()) return

    setMagicLoading(true)
    try {
      // TODO: Implement Magic Link integration
      console.log('Magic Link connect:', magicMode, magicInput)
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsOpen(false)
      setMagicInput('')
    } catch (error) {
      console.error('Failed to connect with Magic Link:', error)
    } finally {
      setMagicLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setIsOpen(false)
  }

  if (isConnected) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className={className}>
            {children}
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>
              Your wallet is successfully connected to GameDAO
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
              <Shield className="h-8 w-8 text-green-600 mr-2" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                Wallet Connected
              </span>
            </div>
            <Button onClick={handleDisconnect} variant="outline" className="w-full">
              Disconnect Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={className}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect to GameDAO</DialogTitle>
          <DialogDescription className="text-base">
            Choose your preferred connection method to start building with GameDAO
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Web3 Wallets Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <h3 className="font-semibold">Web3 Wallets</h3>
            </div>

            <div className="grid gap-3">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="outline"
                  className="justify-start h-auto p-4"
                  onClick={() => handleWalletConnect(connector)}
                  disabled={isConnecting || isPending}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {connector.name === 'MetaMask' && 'Connect with MetaMask browser extension'}
                        {connector.name === 'WalletConnect' && 'Connect with mobile wallet or desktop app'}
                        {connector.name === 'Browser Wallet' && 'Connect with injected browser wallet'}
                      </div>
                    </div>
                    {(isConnecting || isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </Button>
              ))}
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure connection via blockchain</span>
            </div>
          </div>

          <Separator />

          {/* Magic Link Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <h3 className="font-semibold">Magic Link</h3>
            </div>

            <div className="space-y-3">
              <div className="flex rounded-lg bg-muted p-1">
                <Button
                  variant={magicMode === 'email' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMagicMode('email')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant={magicMode === 'phone' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMagicMode('phone')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="magic-input">
                  {magicMode === 'email' ? 'Email Address' : 'Phone Number'}
                </Label>
                <Input
                  id="magic-input"
                  type={magicMode === 'email' ? 'email' : 'tel'}
                  placeholder={magicMode === 'email' ? 'Enter your email' : 'Enter your phone number'}
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  disabled={magicLoading}
                />
              </div>

              <Button
                onClick={handleMagicConnect}
                disabled={!magicInput.trim() || magicLoading}
                className="w-full"
              >
                {magicLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Magic Link...
                  </>
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>No wallet needed - sign in with {magicMode}</span>
            </div>
          </div>

          {/* Benefits */}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
