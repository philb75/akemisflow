import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { SupplierService } from '@/lib/supplier-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Airwallex is configured
    const isConfigured = process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY
    
    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        message: 'Airwallex API not configured',
        error: 'Missing AIRWALLEX_CLIENT_ID or AIRWALLEX_API_KEY environment variables.'
      }, { status: 503 })
    }

    const body = await request.json()
    const {
      syncFields = {}, // Which fields to sync
      overwriteExisting = true, // Whether to overwrite existing data
      applyNameFormatting = true // Whether to apply name formatting
    } = body

    console.log(`🔄 Starting single supplier Airwallex sync for ID: ${params.id}`)
    
    // Sync the supplier
    const result = await SupplierService.syncSupplierWithAirwallex(params.id, {
      syncFields,
      overwriteExisting,
      applyNameFormatting
    })

    if (!result.success) {
      console.error(`❌ Sync failed for supplier ${params.id}: ${result.error}`)
      return NextResponse.json({
        success: false,
        message: 'Supplier sync failed',
        error: result.error
      }, { status: 400 })
    }

    console.log(`✅ Successfully synced supplier ${params.id}`)
    console.log(`📊 Synced fields: ${result.syncedFields.join(', ')}`)
    
    return NextResponse.json({
      success: true,
      message: 'Supplier sync completed',
      data: {
        supplier: result.supplier,
        syncedFields: result.syncedFields,
        syncedCount: result.syncedFields.length
      }
    })

  } catch (error: any) {
    console.error(`❌ Supplier sync error for ID ${params.id}:`, error)
    
    return NextResponse.json({
      success: false,
      message: 'Supplier sync failed',
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current supplier data
    const supplier = await SupplierService.getSupplier(params.id)
    
    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Check sync status
    const canSync = !!supplier.airwallexBeneficiaryId
    const lastSyncAt = supplier.airwallexLastSyncAt
    const syncStatus = supplier.airwallexSyncStatus || 'NONE'

    return NextResponse.json({
      success: true,
      data: {
        supplierId: params.id,
        canSync,
        syncStatus,
        lastSyncAt,
        beneficiaryId: supplier.airwallexBeneficiaryId,
        syncableFields: [
          'firstName', 'lastName', 'email', 'phone',
          'address', 'city', 'zipCode', 'state', 'country',
          'companyName', 'bankAccountName', 'bankAccountNumber',
          'bankName', 'swiftCode', 'airwallexEntityType'
        ]
      }
    })

  } catch (error: any) {
    console.error(`❌ Error getting sync status for supplier ${params.id}:`, error)
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}