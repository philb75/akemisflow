import { NextRequest, NextResponse } from 'next/server'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createSupabaseClient } from '@/lib/supabase'
import { formatContractorNames } from '@/lib/name-formatter'

// TEMPORARY: Test sync without authentication to diagnose the issue
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST SYNC: Starting without authentication...')
    
    // Check if Airwallex is configured
    const isConfigured = process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY
    
    if (!isConfigured) {
      console.error('[Test Sync] API credentials not configured')
      return NextResponse.json({
        success: false,
        message: 'Airwallex API not configured'
      }, { status: 503 })
    }

    // Initialize Airwallex client
    console.log('🔄 Initializing Airwallex client...')
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    // Get first 3 beneficiaries only for testing
    console.log('📋 Fetching first 3 beneficiaries for test...')
    const allBeneficiaries = await airwallex.getAllBeneficiaries()
    const beneficiaries = allBeneficiaries.slice(0, 3) // Only test with 3
    
    console.log(`✅ Found ${allBeneficiaries.length} total, testing with ${beneficiaries.length}`)
    
    if (beneficiaries.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No beneficiaries found in Airwallex'
      }, { status: 404 })
    }
    
    const supabase = createSupabaseClient()
    let created = 0
    let errors = 0
    const errorDetails: any[] = []
    
    for (const beneficiary of beneficiaries) {
      try {
        console.log(`🔄 Processing beneficiary: ${beneficiary.beneficiary_id}`)
        
        // Apply name formatting rules
        const formattedNames = formatContractorNames({
          firstName: beneficiary.first_name || '',
          lastName: beneficiary.last_name || ''
        })
        
        // Check if already exists
        const { data: existing, error: lookupError } = await supabase
          .from('airwallex_contractors')
          .select('*')
          .eq('beneficiary_id', beneficiary.beneficiary_id)
          .single()
        
        if (lookupError && lookupError.code !== 'PGRST116') {
          console.error(`❌ Lookup error for ${beneficiary.beneficiary_id}:`, lookupError)
          throw lookupError
        }
        
        if (existing) {
          console.log(`⏭️  Skipping existing: ${beneficiary.beneficiary_id}`)
          continue
        }
        
        // Create new airwallex contractor with minimal required fields
        const insertData = {
          beneficiary_id: beneficiary.beneficiary_id,
          first_name: formattedNames.firstName,
          last_name: formattedNames.lastName,
          email: beneficiary.email,
          status: 'ACTIVE',
          last_fetched_at: new Date().toISOString()
        }
        
        console.log(`📝 Inserting: ${JSON.stringify(insertData)}`)
        
        const { data: newContractor, error: insertError } = await supabase
          .from('airwallex_contractors')
          .insert(insertData)
          .select()
          .single()
        
        if (insertError) {
          console.error(`❌ Insert error for ${beneficiary.beneficiary_id}:`, insertError)
          throw insertError
        }
        
        console.log(`✅ Created: ${beneficiary.beneficiary_id}`)
        created++
        
      } catch (error: any) {
        errors++
        console.error(`❌ Error processing ${beneficiary.beneficiary_id}:`, error.message)
        errorDetails.push({
          beneficiaryId: beneficiary.beneficiary_id,
          error: error.message,
          code: error.code
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Test sync completed: ${created} created, ${errors} errors`,
      data: {
        total_tested: beneficiaries.length,
        created: created,
        errors: errors,
        error_details: errorDetails
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('🚨 Test sync failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Test sync failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}