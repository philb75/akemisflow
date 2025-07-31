import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('Test Supabase Route - Starting connection test')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const dbUrl = process.env.DATABASE_URL || ''
  
  // Check environment
  const envCheck = {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    hasDatabaseUrl: !!dbUrl,
    dbUrlLength: dbUrl.length,
    // Check if connection string has required parameters
    connectionStringCheck: {
      hasProtocol: dbUrl.startsWith('postgresql://'),
      hasHost: dbUrl.includes('supabase.com'),
      hasPort: dbUrl.includes(':6543') || dbUrl.includes(':5432'),
      hasDatabase: dbUrl.includes('/postgres'),
      hasQueryParams: dbUrl.includes('?'),
    }
  }
  
  try {
    // Test 1: Try Supabase client connection
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      // Try a simple query through Supabase
      const { data, error } = await supabase
        .from('suppliers')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('Supabase query error:', error)
        return NextResponse.json({
          success: false,
          test: 'supabase-client',
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          environment: envCheck,
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        test: 'supabase-client',
        message: 'Supabase client connection successful',
        environment: envCheck,
      })
    }
    
    // Test 2: Direct connection string info
    return NextResponse.json({
      success: false,
      test: 'connection-check',
      message: 'Missing Supabase credentials',
      environment: envCheck,
      help: {
        required: [
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'DATABASE_URL with proper format'
        ],
        connectionStringFormat: 'postgresql://[user]:[password]@[host]:[port]/[database]?pgbouncer=true&connection_limit=1&sslmode=require'
      }
    })
    
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        name: error.name,
      },
      environment: envCheck,
    }, { status: 500 })
  }
}