'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { Loader } from '@/components/ui/loader'

// Create the config on client side only - Web3 connections are inherently client-side
// This avoids SSR issues with WalletConnect's indexedDB usage
function createClientConfig() {
  const connectors = [
    // Injected connector - will detect MetaMask, Talisman, etc.
    injected({
      target() {
        return {
          id: 'injected',
          name: 'Browser Wallet',
          provider: typeof window !== 'undefined' ? window.ethereum : undefined,
        }
      },
    }),
    // MetaMask specific connector
    metaMask(),
    // WalletConnect for mobile wallets - only loaded on client side
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'GameDAO',
        description: 'Video Games Operating System for Communities',
        url: 'https://gamedao.co',
        icons: ['https://gamedao.co/favicon.ico'],
      },
      showQrModal: true,
    }),
  ]

  return createConfig({
    chains: [hardhat, sepolia, mainnet],
    connectors,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [hardhat.id]: http('http://127.0.0.1:8545'),
    },
    ssr: true,
  })
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes (increased from 1 minute)
        refetchInterval: 30 * 1000, // Refetch every 30 seconds instead of constantly
        retry: 3,
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
      },
    },
  }))

  const [config, setConfig] = useState<ReturnType<typeof createConfig> | null>(null)

  useEffect(() => {
    // Create config on client side only
    setConfig(createClientConfig())
  }, [])

  // Don't render until config is ready
  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="lg" text="Initializing Web3..." />
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
