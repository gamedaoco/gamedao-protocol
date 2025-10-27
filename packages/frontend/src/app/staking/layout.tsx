'use client'

import { ModuleGate } from '@/components/guards/ModuleGate'

export default function StakingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="STAKING">
      {children}
    </ModuleGate>
  )
}


