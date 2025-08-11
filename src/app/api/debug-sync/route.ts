import { NextRequest, NextResponse } from 'next/server'
import { AirwallexClientStandalone } from '@/lib/airwallex-client-standalone'
import { createSupabaseClient } from '@/lib/supabase'

// Debug endpoint to test actual sync process without authentication
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug Sync: Starting diagnostic...')
    
    // Check environment
    const isProduction = process.env.NODE_ENV === 'production'
    const airwallexConfigured = !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY)
    const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    console.log('🔧 Environment check:', { isProduction, airwallexConfigured, supabaseConfigured })
    
    if (!airwallexConfigured) {
      return NextResponse.json({
        error: 'Airwallex not configured',
        details: 'Missing AIRWALLEX_CLIENT_ID or AIRWALLEX_API_KEY'
      }, { status: 503 })
    }
    
    if (!supabaseConfigured) {
      return NextResponse.json({
        error: 'Supabase not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 503 })
    }
    
    // Test Airwallex connection
    console.log('🌐 Testing Airwallex connection...')
    let airwallexStatus = 'unknown'
    let beneficiaryCount = 0
    let airwallexError: string | null = null
    
    try {
      const airwallex = new AirwallexClientStandalone()
      await airwallex.initialize()
      
      // Try to get just 1 beneficiary to test the connection
      const beneficiaries = await airwallex.getAllBeneficiaries()
      beneficiaryCount = beneficiaries.length
      airwallexStatus = 'connected'
      console.log(`✅ Airwallex connected, found ${beneficiaryCount} beneficiaries`)
    } catch (error: any) {
      airwallexStatus = 'failed'
      airwallexError = error.message
      console.error('❌ Airwallex connection failed:', error.message)
    }
    
    // Test Supabase connection
    console.log('🗄️ Testing Supabase connection...')
    let supabaseStatus = 'unknown'
    let tableCount = 0
    let supabaseError: string | null = null
    
    try {
      const supabase = createSupabaseClient()
      
      // Test basic query
      const { data, error } = await supabase
        .from('users')
        .select('email, role', { count: 'exact', head: true })
      
      if (error) {
        throw error
      }
      
      // Test airwallex_contractors table
      const { count } = await supabase
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
      
      tableCount = count || 0
      supabaseStatus = 'connected'
      console.log(`✅ Supabase connected, ${tableCount} airwallex contractors`)
    } catch (error: any) {
      supabaseStatus = 'failed'
      supabaseError = error.message
      console.error('❌ Supabase connection failed:', error.message)
    }
    
    return NextResponse.json({
      environment: isProduction ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      diagnostic_results: {
        airwallex: {
          status: airwallexStatus,
          beneficiary_count: beneficiaryCount,
          error: airwallexError,
          configured: airwallexConfigured
        },
        supabase: {
          status: supabaseStatus,
          airwallex_contractors_count: tableCount,
          error: supabaseError,
          configured: supabaseConfigured
        }
      },
      next_steps: airwallexStatus === 'connected' && supabaseStatus === 'connected' 
        ? 'Both services are working. The sync should work when authenticated.'
        : 'Check the errors above to identify the issue.'
    }, { status: 200 })
    
  } catch (error) {
    console.error('🚨 Debug sync failed:', error)
    return NextResponse.json({
      error: 'Debug sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}