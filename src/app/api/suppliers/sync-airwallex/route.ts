import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { airwallexSupplierSync } from '@/lib/airwallex-supplier-sync'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting Airwallex supplier sync...')
    
    // Run the supplier sync
    const result = await airwallexSupplierSync.syncSuppliersFromAirwallex()
    
    // Get summary statistics
    const summary = await airwallexSupplierSync.getSupplierSyncSummary()
    
    const response = {
      success: true,
      message: 'Supplier sync completed',
      data: {
        sync_results: {
          total_beneficiaries: result.totalBeneficiaries,
          new_suppliers: result.newSuppliers,
          updated_suppliers: result.updatedSuppliers,
          conflicts: result.conflicts.length,
          errors: result.errors,
          suppliers_processed: result.syncedSuppliers.length
        },
        database_summary: summary,
        synced_suppliers: result.syncedSuppliers,
        conflicts: result.conflicts
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Supplier sync failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Supplier sync failed',
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
    const summary = await airwallexSupplierSync.getSupplierSyncSummary()
    const airwallexSuppliers = await airwallexSupplierSync.getSuppliersWithAirwallexData()
    
    return NextResponse.json({
      success: true,
      message: 'Supplier sync summary retrieved',
      data: {
        database_summary: summary,
        airwallex_suppliers: airwallexSuppliers.map(supplier => ({
          id: supplier.id,
          name: `${supplier.firstName} ${supplier.lastName}`,
          email: supplier.email,
          airwallexBeneficiaryId: supplier.airwallexBeneficiaryId,
          airwallexEntityType: supplier.airwallexEntityType,
          bankAccountCurrency: supplier.bankAccountCurrency,
          syncStatus: supplier.airwallexSyncStatus,
          lastSyncAt: supplier.airwallexLastSyncAt,
          syncError: supplier.airwallexSyncError
        }))
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get supplier sync summary:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get supplier sync summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}