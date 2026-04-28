'use client'

import { ModuleGate } from '@/components/guards/ModuleGate'

export default function SenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="SENSE">
      {children}
    </ModuleGate>
  )
}


