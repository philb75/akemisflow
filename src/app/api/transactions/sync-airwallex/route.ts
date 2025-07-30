import { NextRequest, NextResponse } from 'next/server'
import { syncAirwallexTransactions, testAirwallexConnection } from '@/lib/airwallex-sync'

export async function POST(request: NextRequest) {
  try {
    // Note: Authentication check removed for testing - add back in production
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { action, forceFullSync, fromDate } = body

    // Handle different actions
    switch (action) {
      case 'test':
        console.log('Testing Airwallex connection...')
        const testResult = await testAirwallexConnection()
        return NextResponse.json(testResult)

      case 'sync':
      default:
        console.log('Starting Airwallex transaction sync...')
        console.log('Sync parameters:', { forceFullSync: forceFullSync || false, fromDate })
        const syncResult = await syncAirwallexTransactions(forceFullSync || false, fromDate)

        if (!syncResult.success) {
          return NextResponse.json(
            { 
              error: 'Sync failed', 
              details: syncResult.errors 
            }, 
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Successfully synced ${syncResult.imported} transactions`,
          imported: syncResult.imported,
          skipped: syncResult.skipped,
          errors: syncResult.errors,
          lastSyncTime: syncResult.lastSyncTime,
        })
    }

  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// GET endpoint for checking sync status
export async function GET(request: NextRequest) {
  try {
    // Note: Authentication check removed for testing - add back in production
    // const session = await getServerSession()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'test') {
      const testResult = await testAirwallexConnection()
      return NextResponse.json(testResult)
    }

    // Default: return sync status/info
    return NextResponse.json({
      success: true,
      message: 'Airwallex sync endpoint is ready',
      available_actions: ['test', 'sync'],
      note: 'Use POST with action parameter to execute operations'
    })

  } catch (error) {
    console.error('Sync status API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}