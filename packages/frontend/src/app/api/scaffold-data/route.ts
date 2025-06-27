import { NextResponse } from 'next/server'
import { loadScaffoldData } from '@/lib/load-scaffold-data'

// GET /api/scaffold-data - Returns scaffold data for development
export async function GET() {
  try {
    const data = await loadScaffoldData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error loading scaffold data:', error)
    return NextResponse.json(
      { error: 'Failed to load scaffold data' },
      { status: 500 }
    )
  }
}
