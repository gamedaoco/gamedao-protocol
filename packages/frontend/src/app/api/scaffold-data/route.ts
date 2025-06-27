import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Path to the scaffold output file - from frontend package to contracts package
    const scaffoldPath = join(process.cwd(), '../contracts-solidity/scaffold-output.json')

    try {
      const data = readFileSync(scaffoldPath, 'utf-8')
      const jsonData = JSON.parse(data)

      return NextResponse.json(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    } catch (fileError) {
      console.warn('Could not read scaffold-output.json, returning empty data')
      console.warn('Tried path:', scaffoldPath)
      console.warn('Error:', fileError)

      // Return empty scaffold data structure
      const emptyData = {
        users: [],
        daos: [],
        campaigns: [],
        proposals: [],
        contracts: {
          registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '',
          control: process.env.NEXT_PUBLIC_CONTROL_ADDRESS || '',
          flow: process.env.NEXT_PUBLIC_FLOW_ADDRESS || '',
          signal: process.env.NEXT_PUBLIC_SIGNAL_ADDRESS || '',
        },
        timestamp: new Date().toISOString(),
      }

      return NextResponse.json(emptyData)
    }
  } catch (error) {
    console.error('Error in scaffold-data API:', error)

    return NextResponse.json(
      { error: 'Could not load scaffold data' },
      { status: 500 }
    )
  }
}
