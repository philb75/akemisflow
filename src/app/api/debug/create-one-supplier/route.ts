import { NextResponse } from 'next/server'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const logs: string[] = []
  
  try {
    logs.push('🔄 Testing single supplier creation from Airwallex...')
    
    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get Airwallex beneficiaries
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    const beneficiaries = await airwallex.getBeneficiaries(1)
    
    if (beneficiaries.length === 0) {
      return NextResponse.json({ success: false, logs, error: 'No beneficiaries found' })
    }
    
    const beneficiary = beneficiaries[0]
    logs.push(`👤 Creating supplier from: ${beneficiary.email}`)
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('email', beneficiary.email)
      .single()
    
    if (existing) {
      logs.push(`⚠️  Supplier already exists with ID: ${existing.id}`)
      return NextResponse.json({ success: true, logs, skipped: true, supplierId: existing.id })
    }
    
    // Create supplier with absolute minimum fields
    const supplierData = {
      first_name: beneficiary.first_name || 'Unknown',
      last_name: beneficiary.last_name || 'User', 
      email: beneficiary.email,
      status: 'ACTIVE'
    }
    
    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single()
    
    if (error) {
      logs.push(`❌ Failed to create supplier: ${error.message}`)
      return NextResponse.json({ success: false, logs, error: error.message })
    }
    
    logs.push(`✅ Created supplier: ${newSupplier.id}`)
    logs.push(`📧 Email: ${newSupplier.email}`)
    logs.push(`👤 Name: ${newSupplier.first_name} ${newSupplier.last_name}`)
    
    return NextResponse.json({ 
      success: true, 
      logs,
      supplier: newSupplier,
      beneficiary: {
        id: beneficiary.id,
        email: beneficiary.email,
        name: `${beneficiary.first_name} ${beneficiary.last_name}`
      }
    })
    
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`)
    return NextResponse.json({ success: false, logs, error: error.message }, { status: 500 })
  }
}