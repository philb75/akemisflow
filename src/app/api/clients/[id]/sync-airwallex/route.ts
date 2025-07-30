import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { airwallexClientSync } from '@/lib/airwallex-client-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔄 Starting Airwallex sync for client ${params.id}...`)
    
    // Sync the individual client
    const result = await airwallexClientSync.syncSingleClient(params.id)
    
    const response = {
      success: true,
      message: 'Client sync completed',
      data: {
        client: result,
        is_new: result.isNew || false,
        sync_status: 'SYNCED'
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error(`❌ Client sync failed for ${params.id}:`, error)
    
    return NextResponse.json({
      success: false,
      message: 'Client sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}