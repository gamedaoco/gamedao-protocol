'use client'

import { useEffect, useState } from 'react'
import { loadScaffoldData } from '@/lib/load-scaffold-data'

export function ScaffoldDataLoader() {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const success = await loadScaffoldData()
        setIsLoaded(success)
        console.log(success ? '✅ Scaffold data loaded' : '⚠️ Using fallback data')
      } catch (error) {
        console.error('Failed to load scaffold data:', error)
        setIsLoaded(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // This component doesn't render anything visible
  // It just loads data in the background
  return null
}
