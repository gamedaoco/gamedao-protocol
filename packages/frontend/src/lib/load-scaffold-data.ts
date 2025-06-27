import { ScaffoldData } from './scaffold-data'
import fs from 'fs'
import path from 'path'

export async function loadScaffoldData(): Promise<ScaffoldData | null> {
  try {
    // In server-side context, load from the contracts scaffold output file
    if (typeof window === 'undefined') {
      const scaffoldPath = path.join(process.cwd(), '../../contracts-solidity/scaffold-output.json')
      if (fs.existsSync(scaffoldPath)) {
        const data = fs.readFileSync(scaffoldPath, 'utf-8')
        return JSON.parse(data)
      }
    }

    // In client-side context, fetch from API
    const response = await fetch('/api/scaffold-data')
    if (!response.ok) {
      throw new Error('Failed to load scaffold data')
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading scaffold data:', error)
    return null
  }
}
