'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'

// Privy app id is provided at runtime via env. We surface a clear console
// warning if it is missing so the dev/operator immediately knows what to
// fix — Privy itself errors deeper in the modal, which is harder to debug.
// NOTE: the matching origin must also be added to Privy Dashboard →
// Settings → Domains, otherwise login fails with `invalid_origin`.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ''

if (typeof window !== 'undefined' && !PRIVY_APP_ID) {
  // eslint-disable-next-line no-console
  console.warn(
    '[GameDAO] NEXT_PUBLIC_PRIVY_APP_ID is not set. Login will not work until ' +
      'the operator injects a Privy app id at deploy time.',
  )
}

// wagmi config without connectors — Privy supplies the embedded-wallet
// connector via @privy-io/wagmi's <WagmiProvider>. We only declare chains
// + transports so existing hooks (`useReadContract`, `useBalance`, etc.)
// keep working unchanged.
const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchInterval: 30 * 1000,
            retry: 3,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'apple', 'discord'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          // Provision an embedded wallet for users who sign in without one.
          // Stage 2 will flip this over to ERC-4337 smart accounts via
          // `embeddedWallets.ethereum.useSmartWallets = true` once the
          // smart-account flow is implemented.
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
