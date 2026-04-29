'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { http } from 'wagmi'
import { hardhat, polygon, polygonAmoy } from 'wagmi/chains'
import { PrivyProvider } from '@privy-io/react-auth'
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets'
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
//
// Supported chains match docs/worklog/116: Hardhat dev + Polygon Amoy +
// Polygon mainnet. Ethereum mainnet / Sepolia removed — wagmi's default
// `http()` for them targets eth.merkle.io which blocks browser CORS, so
// even unused chains spam the console with CORS failures at boot.
// `ssr: true` is deliberately omitted. With Privy's wagmi bridge, the
// embedded connector attaches only on the client, so wagmi's <Hydrate>
// step (which only runs when ssr is on) consistently mismatches against
// the server tree. Without it wagmi just initialises client-side and
// the hooks return their safe defaults during SSR.
const wagmiConfig = createConfig({
  chains: [hardhat, polygonAmoy, polygon],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_URL || 'https://rpc-amoy.polygon.technology'),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_URL || 'https://polygon-rpc.com'),
  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No global refetchInterval — every wagmi hook (useReadContract,
            // useBalance, useAccount, …) is a TanStack query, so a global
            // poll fires N×period requests per minute and floods devtools.
            // Hooks that genuinely need polling set their own interval.
            staleTime: 5 * 60 * 1000,
            retry: 3,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  // Privy v2 throws on empty appId at render time. Rather than crash
  // (which surfaces as "Fast Refresh had to perform a full reload"),
  // render a clear instruction page when the env var is missing in dev.
  // Children call usePrivy() so we can't simply skip the provider —
  // pausing the whole app is correct behaviour.
  const inDev = process.env.NODE_ENV !== 'production'
  if (!PRIVY_APP_ID && inDev) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-monospace, monospace', maxWidth: 720, margin: '0 auto', lineHeight: 1.6 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Privy app id not configured</h1>
        <p>Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in <code>.env.local</code> with your app id from the <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Privy Dashboard</a>.</p>
        <p>Then add the dev origin (e.g. <code>http://localhost:3000</code>) to <em>Dashboard → Settings → Domains</em> so the SDK accepts requests.</p>
        <p>Restart the dev server after editing <code>.env.local</code>.</p>
      </div>
    )
  }

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
          // Provision an embedded EOA for users who sign in without one.
          // Smart-account behaviour layers on top of this EOA via
          // `<SmartWalletsProvider>` — the EOA is the *signer*; the Kernel
          // smart account (configured in Privy dashboard) is the address
          // users actually transact from once Phase 2 routes wagmi writes
          // through it.
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {/* SmartWalletsProvider provisions a Kernel smart account for the
              embedded EOA on first login. Smart-account type + bundler /
              paymaster URLs are configured per-network in the Privy
              dashboard; this provider just makes `useSmartWallets()`
              available. Phase 2 wires wagmi writes to route through the
              smart account so paymaster sponsorship kicks in for every
              `useWriteContract` call site. */}
          <SmartWalletsProvider>{children}</SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}
