'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useQuery } from '@apollo/client'
import { GET_MODULES } from '@/lib/queries'

export interface ModuleRecord {
  id: string
  address: string
  admin: string
  enabled: boolean
  version: string
  updatedAt: string
}

interface ModulesContextValue {
  modules: ModuleRecord[]
  enabled: Set<string>
  loading: boolean
  error: Error | undefined
  refetch: () => Promise<unknown>
}

const ModulesContext = createContext<ModulesContextValue | null>(null)

// One Apollo poll for all consumers. Previously Footer/TopBar/Sidebar/
// ModuleGate each ran their own `useQuery(GET_MODULES, { pollInterval: 5000 })`,
// which meant 4 independent network requests every 5 s — flooded the
// console and the graph-node logs. The default here is 30 s; module
// enable/disable is a manual-admin action, so a tighter interval gains
// nothing in practice.
export function ModulesProvider({ children, pollInterval = 30000 }: { children: ReactNode, pollInterval?: number }) {
  const { data, loading, error, refetch } = useQuery(GET_MODULES, { pollInterval, errorPolicy: 'ignore' })

  const value = useMemo<ModulesContextValue>(() => {
    const modules = (data?.modules || []) as ModuleRecord[]
    const enabled = new Set(modules.filter(m => m.enabled).map(m => m.id))
    return { modules, enabled, loading, error: error as Error | undefined, refetch }
  }, [data, loading, error, refetch])

  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
}

export function useModules(): ModulesContextValue {
  const ctx = useContext(ModulesContext)
  if (!ctx) {
    throw new Error('useModules must be used inside <ModulesProvider>')
  }
  return ctx
}
