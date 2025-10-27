'use client'

import { ReactNode, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'
import { keccak256, stringToBytes } from 'viem'

type ModuleKey = 'CONTROL' | 'SIGNAL' | 'STAKING' | 'FLOW' | 'SENSE'

export function ModuleGate({ module, children }: { module: ModuleKey, children: ReactNode }) {
  const { data, loading, error } = useQuery(GET_MODULES, { pollInterval: 5000, errorPolicy: 'ignore' })

  const moduleId = useMemo(() => keccak256(stringToBytes(module)), [module])
  const enabled = useMemo(() => {
    const list = (data?.modules || []) as Array<{ id: string, enabled: boolean }>
    const m = list.find((x) => x.id === moduleId)
    return Boolean(m?.enabled)
  }, [data, moduleId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground">
        Checking module access...
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10 text-sm text-red-600">
        Failed to load module status. {String(error.message)}
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="border rounded-md p-6">
          <div className="text-lg font-medium">Module Disabled</div>
          <div className="text-sm text-muted-foreground mt-1">
            The {module} module is currently disabled by protocol admins.
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


