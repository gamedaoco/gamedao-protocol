'use client'

import { ModuleGate } from '@/components/guards/ModuleGate'

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="CONTROL">
      {children}
    </ModuleGate>
  )
}


