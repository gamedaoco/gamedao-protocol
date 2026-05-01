'use client'

import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { encodeFunctionData, type Abi, type Hash, type Hex } from 'viem'

// Thin wrapper around Privy's smart-account client (Track B Phase 2 hybrid).
//
// Phase 1 (#59) wired <SmartWalletsProvider> so a Kernel smart account is
// provisioned per signed-in user. Reads still flow through wagmi/EOA, but
// writes that opt into this hook go through the smart account — which means
// the bundler/paymaster URLs configured in the Privy dashboard handle gas
// sponsorship automatically.
//
// Why a hybrid instead of the full wagmi connector swap (`useEmbeddedSmartAccountConnector`):
// the connector swap requires installing the ZeroDev SDK and writing a
// `getSmartAccountFromSigner` adapter. That's a larger change — tracked
// separately as #66 — and we'd rather migrate critical write paths
// explicitly so we can verify each one rather than have everything
// silently route through code we just installed.
//
// Usage:
//   const tx = useSmartTx()
//   if (tx.ready) {
//     await tx.writeContract({ address, abi, functionName: 'vote', args: [...] })
//   }

export function useSmartTx() {
  const { client } = useSmartWallets()

  const sendTransaction = async (input: {
    to: `0x${string}`
    data?: Hex
    value?: bigint
  }): Promise<Hash> => {
    if (!client) {
      throw new Error('Smart account is not provisioned yet — sign in first.')
    }
    // The SDK's signature accepts both a viem SendTransactionParameters and
    // a permissionless SendUserOperationParameters — passing the simpler
    // `{ to, data, value }` shape lets the SDK pick the right path.
    return client.sendTransaction({
      to: input.to,
      data: input.data,
      value: input.value,
    } as any)
  }

  const writeContract = async <const TAbi extends Abi>(input: {
    address: `0x${string}`
    abi: TAbi
    functionName: string
    args?: readonly unknown[]
    value?: bigint
  }): Promise<Hash> => {
    if (!client) {
      throw new Error('Smart account is not provisioned yet — sign in first.')
    }
    const data = encodeFunctionData({
      abi: input.abi as Abi,
      functionName: input.functionName,
      args: input.args,
    } as any)
    return client.sendTransaction({
      to: input.address,
      data,
      value: input.value,
    } as any)
  }

  return {
    ready: !!client,
    address: client?.account.address as `0x${string}` | undefined,
    sendTransaction,
    writeContract,
  }
}
