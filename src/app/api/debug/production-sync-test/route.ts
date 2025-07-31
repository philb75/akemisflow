import { NextResponse } from 'next/server'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createClient } from '@supabase/supabase-js'
import { formatSupplierNames } from '@/lib/name-formatter'

export async function GET() {
  return await runDiagnostic()
}

export async function POST() {
  return await runDiagnostic()
}

async function runDiagnostic() {
  const logs: string[] = []
  
  try {
    logs.push('🔍 Production Sync Diagnostic Test')
    
    // Check environment
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    logs.push(`📍 Environment: ${useSupabase ? 'Production (Supabase)' : 'Local (Prisma)'}`)
    
    if (!useSupabase) {
      return NextResponse.json({ 
        success: false, 
        logs, 
        error: 'This diagnostic is for production environment only' 
      })
    }
    
    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    logs.push('✅ Supabase client initialized')
    
    // Check current suppliers count
    const { count: currentCount, error: countError } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      logs.push(`❌ Error counting suppliers: ${countError.message}`)
    } else {
      logs.push(`📊 Current suppliers in database: ${currentCount}`)
    }
    
    // Check Airwallex connection
    logs.push('🔗 Testing Airwallex connection...')
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    
    const beneficiaries = await airwallex.getBeneficiaries()
    logs.push(`📋 Airwallex beneficiaries found: ${beneficiaries.length}`)
    
    if (beneficiaries.length === 0) {
      return NextResponse.json({
        success: false,
        logs,
        error: 'No beneficiaries found in Airwallex'
      })
    }
    
    // Test inserting ONE beneficiary
    const testBeneficiary = beneficiaries[0]
    logs.push(`🧪 Testing with beneficiary: ${testBeneficiary.email}`)
    
    // Check if already exists
    const { data: existing, error: existsError } = await supabase
      .from('suppliers')
      .select('id, email')
      .eq('email', testBeneficiary.email)
      .single()
    
    if (existsError && existsError.code !== 'PGRST116') {
      logs.push(`❌ Error checking existing supplier: ${existsError.message}`)
      logs.push(`Error code: ${existsError.code}`)
    } else if (existing) {
      logs.push(`⚠️  Supplier already exists: ${existing.id}`)
    } else {
      logs.push(`✅ Supplier doesn't exist, will attempt insert`)
    }
    
    // Test the exact data structure we're trying to insert
    const baseSupplierData = {
      first_name: testBeneficiary.first_name || '',
      last_name: testBeneficiary.last_name || '',
      email: testBeneficiary.email,
      phone: testBeneficiary.phone_number || null,
      company: testBeneficiary.company_name || null,
      address: testBeneficiary.address?.street_address || null,
      city: testBeneficiary.address?.city || null,
      country: testBeneficiary.address?.country || null,
      postal_code: testBeneficiary.address?.postcode || null,
      bank_account_name: testBeneficiary.bank_details?.account_name || null,
      bank_account_number: testBeneficiary.bank_details?.account_number || null,
      bank_name: testBeneficiary.bank_details?.bank_name || null,
      swift_code: testBeneficiary.bank_details?.swift_code || null,
      airwallex_beneficiary_id: testBeneficiary.id,
      status: 'ACTIVE' as const,
      is_active: true,
      airwallex_sync_status: 'SYNCED',
      airwallex_last_sync_at: new Date().toISOString(),
      airwallex_raw_data: {
        beneficiaryId: testBeneficiary.id,
        entityType: testBeneficiary.entity_type,
        paymentMethods: testBeneficiary.payment_methods,
        lastSynced: new Date().toISOString()
      }
    }
    
    // Apply name formatting
    const supplierData = formatSupplierNames(baseSupplierData)
    
    logs.push('📝 Final supplier data to insert:')
    logs.push(`  - first_name: "${supplierData.first_name}"`)
    logs.push(`  - last_name: "${supplierData.last_name}"`)
    logs.push(`  - email: "${supplierData.email}"`)
    logs.push(`  - status: "${supplierData.status}"`)
    logs.push(`  - is_active: ${supplierData.is_active}`)
    
    // Attempt the insert (only if doesn't exist)
    if (!existing) {
      logs.push('🚀 Attempting insert...')
      
      const { data: insertResult, error: insertError } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single()
      
      if (insertError) {
        logs.push(`❌ Insert failed: ${insertError.message}`)
        logs.push(`Error code: ${insertError.code}`)
        logs.push(`Error hint: ${insertError.hint || 'none'}`)
        logs.push(`Error details: ${JSON.stringify(insertError.details)}`)
      } else {
        logs.push(`✅ Insert successful! Created supplier ID: ${insertResult.id}`)
        logs.push(`📧 Inserted email: ${insertResult.email}`)
        logs.push(`👤 Inserted name: ${insertResult.first_name} ${insertResult.last_name}`)
      }
    }
    
    // Final count check
    const { count: finalCount, error: finalCountError } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
    
    if (finalCountError) {
      logs.push(`❌ Error getting final count: ${finalCountError.message}`)
    } else {
      logs.push(`📊 Final suppliers count: ${finalCount}`)
      logs.push(`📈 Change: ${(finalCount || 0) - (currentCount || 0)}`)
    }
    
    return NextResponse.json({
      success: true,
      logs,
      summary: {
        environment: 'production',
        currentSuppliers: currentCount,
        airwallexBeneficiaries: beneficiaries.length,
        testBeneficiary: testBeneficiary.email,
        finalCount: finalCount
      }
    })
    
  } catch (error: any) {
    logs.push(`❌ Diagnostic error: ${error.message}`)
    return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 })
  }
}