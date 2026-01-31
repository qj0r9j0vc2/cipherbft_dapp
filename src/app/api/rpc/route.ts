import { NextRequest, NextResponse } from 'next/server'

// Server-side only: reads from environment variable
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'RPC request failed', status: res.status },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('RPC proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to RPC node' },
      { status: 503 }
    )
  }
}
