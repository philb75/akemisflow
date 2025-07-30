import { NextRequest, NextResponse } from 'next/server'
import { airwallexContactSync } from '@/lib/airwallex-contacts'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Airwallex contact import...')
    
    // Run the contact sync
    const result = await airwallexContactSync.syncAllContacts()
    
    // Get summary statistics
    const summary = await airwallexContactSync.getContactsSummary()
    
    const response = {
      success: true,
      message: 'Contact import completed',
      data: {
        import_results: {
          total_beneficiaries: result.totalBeneficiaries,
          total_counterparties: result.totalCounterparties,
          new_contacts: result.newContacts,
          updated_contacts: result.updatedContacts,
          errors: result.errors,
          contacts_processed: result.contactsData.length
        },
        database_summary: summary,
        contact_details: result.contactsData
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('❌ Contact import failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Contact import failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just return the current summary without importing
    const summary = await airwallexContactSync.getContactsSummary()
    
    return NextResponse.json({
      success: true,
      message: 'Contact summary retrieved',
      data: {
        database_summary: summary
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to get contact summary:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get contact summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}