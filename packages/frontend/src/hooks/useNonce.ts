'use client'

import { useAccount, usePublicClient } from 'wagmi'

export function useNonce() {
  const { address } = useAccount()
  const client = usePublicClient()

  const getNextNonce = async (): Promise<number> => {
    if (!client) throw new Error('No public client')
    if (!address) throw new Error('No connected address')
    return await client.getTransactionCount({ address, blockTag: 'pending' })
  }

  return { getNextNonce }
}


