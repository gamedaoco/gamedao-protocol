'use client'

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useGameDAO } from '@/hooks/useGameDAO'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'
import { ABIS } from '@/lib/abis'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useMemo } from 'react'

// Whitelist of admin addresses (env-configured)
const ADMIN_WHITELIST = ((process.env.NEXT_PUBLIC_ADMIN_WHITELIST || process.env.NEXT_PUBLIC_PROTOCOL_SUDO || '') as string)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export default function AdminModulesPage() {
  const { address, isConnected } = useAccount()
  const { contracts, chainId } = useGameDAO()
  const { data, refetch } = useQuery(GET_MODULES, { pollInterval: 15000, fetchPolicy: 'cache-and-network' })

  const isWhitelisted = useMemo(() => {
    return !!address && ADMIN_WHITELIST.includes(address.toLowerCase())
  }, [address])

  // On-chain admin check via AccessControl: hasRole(ADMIN_ROLE, address)
  const { data: adminRole } = useReadContract({
    address: contracts.REGISTRY,
    abi: ABIS.REGISTRY,
    functionName: 'ADMIN_ROLE',
    query: { enabled: Boolean(contracts.REGISTRY) },
  })

  const { data: hasAdminRole } = useReadContract({
    address: contracts.REGISTRY,
    abi: ABIS.REGISTRY,
    functionName: 'hasRole',
    args: adminRole && address ? [adminRole as `0x${string}` , address] : undefined,
    query: { enabled: Boolean(adminRole && address) },
  })

  const modules: Array<{ id: string; address: `0x${string}`; enabled: boolean; version: string; name: string }> =
    (data?.modules || []).map((m: any) => ({
      id: m.id,
      address: m.address,
      enabled: m.enabled,
      version: m.version,
      name: (() => {
        // reverse map known IDs to names
        const known: Record<string, string> = {
          [ABIS?.REGISTRY ? '': '' ]: 'Registry', // placeholder to satisfy ts
        }
        try {
          const { keccak256, stringToBytes } = require('viem') as typeof import('viem')
          const map: Record<string, string> = {
            [keccak256(stringToBytes('CONTROL'))]: 'CONTROL',
            [keccak256(stringToBytes('SIGNAL'))]: 'SIGNAL',
            [keccak256(stringToBytes('STAKING'))]: 'STAKING',
            [keccak256(stringToBytes('FLOW'))]: 'FLOW',
            [keccak256(stringToBytes('SENSE'))]: 'SENSE',
          }
          return map[m.id] || m.id
        } catch {
          return m.id
        }
      })()
    }))

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      refetch()
      reset()
    }
  }, [isSuccess, refetch, reset])

  const toggleModule = async (moduleIdHex: string, enabled: boolean) => {
    const fn = enabled ? 'disableModule' : 'enableModule'
    await writeContract({
      address: contracts.REGISTRY,
      abi: ABIS.REGISTRY,
      functionName: fn,
      args: [moduleIdHex as `0x${string}`],
    })
  }

  const isAdmin = Boolean(isWhitelisted || hasAdminRole)

  if (!isConnected || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>This page is restricted to protocol admins.</div>
              <div className="mt-2 font-medium">Diagnostics</div>
              <div>Connected: {address || 'Not connected'}</div>
              <div>Registry: {contracts.REGISTRY}</div>
              <div>NEXT_PUBLIC_PROTOCOL_SUDO: {process.env.NEXT_PUBLIC_PROTOCOL_SUDO || '(not set)'}</div>
              <div>NEXT_PUBLIC_ADMIN_WHITELIST: {process.env.NEXT_PUBLIC_ADMIN_WHITELIST || '(not set)'}</div>
              <div>ADMIN_ROLE: {adminRole ? String(adminRole) : '(loading)'}</div>
              <div>has ADMIN_ROLE (on-chain): {hasAdminRole === undefined ? '(loading)' : String(Boolean(hasAdminRole))}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Admin Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>Connected: {address}</div>
            <div>ChainId: {chainId}</div>
            <div>Registry: {contracts.REGISTRY}</div>
            <div>NEXT_PUBLIC_PROTOCOL_SUDO: {process.env.NEXT_PUBLIC_PROTOCOL_SUDO || '(not set)'}</div>
            <div>NEXT_PUBLIC_ADMIN_WHITELIST: {process.env.NEXT_PUBLIC_ADMIN_WHITELIST || '(not set)'}</div>
            <div>ADMIN_ROLE: {adminRole ? String(adminRole) : '(loading)'}</div>
            <div>has ADMIN_ROLE (on-chain): {hasAdminRole === undefined ? '(loading)' : String(Boolean(hasAdminRole))}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((m) => (
              <div key={m.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground break-all">{m.id}</div>
                  <div className="text-xs text-muted-foreground">{m.address}</div>
                  <div className="text-xs">v{m.version}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs ${m.enabled ? 'text-green-600' : 'text-gray-500'}`}>{m.enabled ? 'Enabled' : 'Disabled'}</div>
                  <Button size="sm" variant={m.enabled ? 'outline' : 'default'} disabled={isPending || isConfirming}
                    onClick={() => toggleModule(m.id, m.enabled)}>
                    {m.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {error && <div className="text-red-600 text-sm mt-3">{String(error?.message || error)}</div>}
    </div>
  )
}


