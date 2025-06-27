import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// GET /api/scaffold-data - Returns scaffold data for development
export async function GET() {
  try {
    // Try to load from the public directory first (static file)
    const publicPath = path.join(process.cwd(), 'public/scaffold-data.json')
    if (fs.existsSync(publicPath)) {
      const data = fs.readFileSync(publicPath, 'utf-8')
      return NextResponse.json(JSON.parse(data))
    }

    // Fallback to contracts directory
    const contractsPath = path.join(process.cwd(), '../../contracts-solidity/scaffold-output.json')
    if (fs.existsSync(contractsPath)) {
      const data = fs.readFileSync(contractsPath, 'utf-8')
      return NextResponse.json(JSON.parse(data))
    }

    return NextResponse.json(
      { error: 'No scaffold data found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Error loading scaffold data:', error)
    return NextResponse.json(
      { error: 'Failed to load scaffold data' },
      { status: 500 }
    )
  }
}
