'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useBalance, usePublicClient } from 'wagmi'
import { hardhat } from 'wagmi/chains'

// Dev-only: top up the connected address on Hardhat the first time we see
// it with a zero balance. Hardhat exposes the non-standard
// `hardhat_setBalance` RPC method which lets us mint native ETH for any
// address without a sudo key — perfect for unblocking Privy embedded
// wallets that arrive at the chain with no funds.
//
// Behaviour:
//   - Only fires on chainId 31337 (Hardhat). On Amoy / Polygon the RPC
//     method doesn't exist; we'd hit an error and no-op.
//   - Only fires once per session-address pair (held in an in-memory ref).
//   - Only fires when the live balance is exactly zero. Anyone with a
//     prior balance — sudo, scaffold-funded EOA, returning user — is
//     untouched.
//
// Default top-up is 10 ETH, plenty for repeated create-org / contribute
// flows in dev. This is a developer convenience, never shipped to prod.

const TOPUP_HEX = '0x8AC7230489E80000' // 10 ETH = 10e18 wei

export function useHardhatDevFund() {
  const { address, chainId, isConnected } = useAccount()
  const { data: balance, refetch } = useBalance({
    address,
    query: { enabled: isConnected && chainId === hardhat.id },
  })
  const publicClient = usePublicClient({ chainId: hardhat.id })
  const fundedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isConnected) return
    if (chainId !== hardhat.id) return
    if (!address) return
    if (!publicClient) return
    if (balance === undefined) return // wait for first balance read
    if (balance.value !== BigInt(0)) return
    if (fundedRef.current.has(address.toLowerCase())) return

    fundedRef.current.add(address.toLowerCase())

    // viem's PublicClient.request is the typed JSON-RPC escape hatch.
    // hardhat_setBalance isn't in viem's known methods; we cast through
    // unknown-as-any so TS doesn't try to validate the method name.
    publicClient
      .request({
        method: 'hardhat_setBalance' as any,
        params: [address, TOPUP_HEX] as any,
      })
      .then(() => refetch())
      .catch((err) => {
        // Silent on non-Hardhat (method missing). Loud on actual failures
        // so a flaky dev node is visible.
        // eslint-disable-next-line no-console
        console.warn('[devfund] hardhat_setBalance failed:', err)
        fundedRef.current.delete(address.toLowerCase())
      })
  }, [isConnected, chainId, address, balance, publicClient, refetch])
}
