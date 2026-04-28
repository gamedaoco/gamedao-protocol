'use client'

import { ModuleGate } from '@/components/guards/ModuleGate'

export default function SignalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="SIGNAL">
      {children}
    </ModuleGate>
  )
}


