import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST() {
  const logs: string[] = []
  
  try {
    logs.push(`🔍 Environment detection: ${useSupabase ? 'Supabase' : 'Prisma'}`)
    
    // Check environment variables
    logs.push(`📝 NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`)
    logs.push(`📝 SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`)
    logs.push(`📝 AIRWALLEX_CLIENT_ID: ${process.env.AIRWALLEX_CLIENT_ID ? 'SET' : 'NOT SET'}`)
    logs.push(`📝 AIRWALLEX_API_KEY: ${process.env.AIRWALLEX_API_KEY ? 'SET' : 'NOT SET'}`)
    
    // Test Airwallex connection
    logs.push('🔄 Testing Airwallex connection...')
    const airwallex = new AirwallexClientStandalone()
    await airwallex.initialize()
    logs.push('✅ Airwallex authenticated successfully')
    
    // Get a single beneficiary to test
    const beneficiaries = await airwallex.getBeneficiaries(1)
    logs.push(`📊 Found ${beneficiaries.length} beneficiaries (testing with first 1)`)
    
    if (beneficiaries.length === 0) {
      return NextResponse.json({ logs, error: 'No beneficiaries found' })
    }
    
    const testBeneficiary = beneficiaries[0]
    logs.push(`🧪 Testing with beneficiary: ${testBeneficiary.email}`)
    
    // Test database connection and insertion
    if (useSupabase) {
      logs.push('🔵 Using Supabase database')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Test simple query first
      try {
        const { count, error: countError } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          logs.push(`❌ Count query error: ${countError.message}`)
        } else {
          logs.push(`📊 Current suppliers in DB: ${count}`)
        }
      } catch (err: any) {
        logs.push(`❌ Count query exception: ${err.message}`)
      }
      
      // Test insertion with minimal data
      const minimalSupplier = {
        firstName: testBeneficiary.first_name || 'Test',
        lastName: testBeneficiary.last_name || 'User',
        email: `test-${Date.now()}@example.com`, // Unique email
        status: 'ACTIVE'
      }
      
      logs.push(`📤 Attempting to insert test supplier...`)
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(minimalSupplier)
          .select()
          .single()
        
        if (error) {
          logs.push(`❌ Insert error: ${error.message}`)
          logs.push(`❌ Error code: ${error.code}`)
          logs.push(`❌ Error details: ${JSON.stringify(error.details)}`)
        } else {
          logs.push(`✅ Successfully inserted supplier: ${data.id}`)
          
          // Clean up test data
          await supabase.from('suppliers').delete().eq('id', data.id)
          logs.push(`🧹 Cleaned up test data`)
        }
      } catch (err: any) {
        logs.push(`❌ Insert exception: ${err.message}`)
      }
      
    } else {
      logs.push('🟡 Using Prisma database')
      const count = await prisma.supplier.count()
      logs.push(`📊 Current suppliers in DB: ${count}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      logs,
      environment: useSupabase ? 'supabase' : 'prisma',
      testBeneficiary: {
        id: testBeneficiary.id,
        email: testBeneficiary.email,
        firstName: testBeneficiary.first_name,
        lastName: testBeneficiary.last_name
      }
    })
    
  } catch (error: any) {
    logs.push(`❌ Test failed: ${error.message}`)
    return NextResponse.json({ 
      success: false, 
      logs,
      error: error.message,
      environment: useSupabase ? 'supabase' : 'prisma'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Sync test endpoint. Use POST to run tests.',
    environment: useSupabase ? 'supabase' : 'prisma'
  })
}