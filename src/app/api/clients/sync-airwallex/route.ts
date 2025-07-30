import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { airwallexClientSync } from '@/lib/airwallex-client-sync'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting Airwallex client sync...')
    
    // Run the client sync
    const result = await airwallexClientSync.syncClientsFromAirwallex()
    
    // Get summary statistics
    const summary = await airwallexClientSync.getClientSyncSummary()
    
    const response = {
      success: true,
      message: 'Client sync completed',
      data: {
        sync_results: {
          total_payers: result.totalPayers,
          new_clients: result.newClients,
          updated_clients: result.updatedClients,
          conflicts: result.conflicts.length,
          errors: result.errors,
          clients_processed: result.syncedClients.length
        },
        database_summary: summary,
        synced_clients: result.syncedClients,
        conflicts: result.conflicts
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Client sync failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Client sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync summary without running sync
    const summary = await airwallexClientSync.getClientSyncSummary()
    const airwallexClients = await airwallexClientSync.getClientsWithAirwallexData()
    
    return NextResponse.json({
      success: true,
      message: 'Client sync summary retrieved',
      data: {
        database_summary: summary,
        airwallex_clients: airwallexClients.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email,
          airwallexPayerAccountId: client.airwallexPayerAccountId,
          airwallexEntityType: client.airwallexEntityType,
          receivingAccountCurrency: client.receivingAccountCurrency,
          syncStatus: client.airwallexSyncStatus,
          lastSyncAt: client.airwallexLastSyncAt,
          syncError: client.airwallexSyncError
        }))
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get client sync summary:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get client sync summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}