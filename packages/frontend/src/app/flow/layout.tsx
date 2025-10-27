'use client'

import { ModuleGate } from '@/components/guards/ModuleGate'

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="FLOW">
      {children}
    </ModuleGate>
  )
}


