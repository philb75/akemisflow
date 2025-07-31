import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      message: 'Airwallex sync endpoint (Supabase version). Use POST to sync.',
      configured: !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY),
      usingSupabase: true
    })
  } catch (error) {
    console.error('Error in GET /api/suppliers/sync-airwallex-supabase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
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

    console.log('🔄 Starting Airwallex supplier sync with Supabase...')
    
    // Initialize Airwallex client
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    // Fetch beneficiaries from Airwallex
    const beneficiaries = await airwallex.getBeneficiaries()
    console.log(`Found ${beneficiaries.length} beneficiaries in Airwallex`)
    
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: any[] = []
    
    for (const beneficiary of beneficiaries) {
      try {
        // Check if supplier exists
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id, airwallexBeneficiaryId')
          .eq('email', beneficiary.email)
          .single()
        
        const supplierData = {
          firstName: beneficiary.first_name || '',
          lastName: beneficiary.last_name || '',
          companyName: beneficiary.company_name || null,
          email: beneficiary.email,
          phone: beneficiary.phone_number || null,
          address: beneficiary.address?.street_address || null,
          city: beneficiary.address?.city || null,
          state: beneficiary.address?.state || null,
          country: beneficiary.address?.country || null,
          postalCode: beneficiary.address?.postcode || null,
          accountNumber: beneficiary.bank_details?.account_number || null,
          accountName: beneficiary.bank_details?.account_name || null,
          bankName: beneficiary.bank_details?.bank_name || null,
          swiftCode: beneficiary.bank_details?.swift_code || null,
          airwallexBeneficiaryId: beneficiary.id,
          status: 'ACTIVE' as const,
          metadata: {
            airwallex: {
              beneficiaryId: beneficiary.id,
              entityType: beneficiary.entity_type,
              paymentMethods: beneficiary.payment_methods,
              lastSynced: new Date().toISOString()
            }
          }
        }
        
        if (existingSupplier) {
          // Update existing supplier
          const { error: updateError } = await supabase
            .from('suppliers')
            .update(supplierData)
            .eq('id', existingSupplier.id)
          
          if (updateError) throw updateError
          updated++
          console.log(`✓ Updated supplier: ${beneficiary.email}`)
        } else {
          // Create new supplier
          const { error: insertError } = await supabase
            .from('suppliers')
            .insert(supplierData)
          
          if (insertError) throw insertError
          created++
          console.log(`✓ Created supplier: ${beneficiary.email}`)
        }
        
      } catch (error: any) {
        errors++
        console.error(`Error processing beneficiary ${beneficiary.id}:`, error)
        errorDetails.push({
          beneficiaryId: beneficiary.id,
          email: beneficiary.email,
          error: error.message
        })
      }
    }
    
    const summary = {
      success: true,
      message: 'Sync completed',
      stats: {
        total: beneficiaries.length,
        created,
        updated,
        errors
      },
      errorDetails: errors > 0 ? errorDetails : undefined,
      usingSupabase: true
    }
    
    console.log('✅ Supplier sync completed')
    console.log(`📊 Summary: ${created} new, ${updated} updated, ${errors} errors`)
    
    return NextResponse.json(summary)
    
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync suppliers',
      usingSupabase: true
    }, { status: 500 })
  }
}