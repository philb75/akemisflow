import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    environment: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
  }
  
  // Test 1: Supabase JS Client (we know this works)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { count, error } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
      
      results.tests.supabaseClient = {
        success: !error,
        count: count,
        error: error?.message
      }
    }
  } catch (error: any) {
    results.tests.supabaseClient = {
      success: false,
      error: error.message
    }
  }
  
  // Test 2: Direct PostgreSQL connection with explicit SSL
  try {
    const directUrl = process.env.DIRECT_URL || ''
    // Force SSL mode
    const sslUrl = directUrl.includes('sslmode=') 
      ? directUrl 
      : directUrl + (directUrl.includes('?') ? '&' : '?') + 'sslmode=require'
    
    const directPrisma = new PrismaClient({
      datasourceUrl: sslUrl,
      log: ['error', 'warn'],
    })
    
    // Set connection timeout
    await directPrisma.$connect()
    const count = await directPrisma.supplier.count()
    await directPrisma.$disconnect()
    
    results.tests.prismaDirectSSL = {
      success: true,
      count: count
    }
  } catch (error: any) {
    results.tests.prismaDirectSSL = {
      success: false,
      error: error.message,
      code: error.code
    }
  }
  
  // Test 3: Try with no SSL (just to test)
  try {
    const directUrl = process.env.DIRECT_URL || ''
    const noSslUrl = directUrl.replace('sslmode=require', 'sslmode=disable')
    
    const noSslPrisma = new PrismaClient({
      datasourceUrl: noSslUrl,
    })
    
    await noSslPrisma.$connect()
    const count = await noSslPrisma.supplier.count()
    await noSslPrisma.$disconnect()
    
    results.tests.prismaNoSSL = {
      success: true,
      count: count
    }
  } catch (error: any) {
    results.tests.prismaNoSSL = {
      success: false,
      error: error.message
    }
  }
  
  // Test 4: Raw SQL query through Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.rpc('get_supplier_count', {})
      
      if (!error) {
        results.tests.supabaseRPC = {
          success: true,
          message: 'RPC function would work if defined'
        }
      } else {
        // Try direct SQL through Supabase
        const { data: sqlData, error: sqlError } = await supabase
          .from('suppliers')
          .select('id')
          .limit(1)
        
        results.tests.supabaseSQL = {
          success: !sqlError,
          hasData: !!sqlData,
          error: sqlError?.message
        }
      }
    }
  } catch (error: any) {
    results.tests.supabaseRPC = {
      success: false,
      error: error.message
    }
  }
  
  // Test 5: Check if this is a Vercel/Prisma specific issue
  results.tests.deploymentInfo = {
    isVercel: !!process.env.VERCEL,
    vercelRegion: process.env.VERCEL_REGION,
    functionRegion: process.env.AWS_REGION,
    isEdgeFunction: !!process.env.NEXT_RUNTIME,
  }
  
  // Recommendations
  results.recommendations = []
  
  if (results.tests.supabaseClient?.success && !results.tests.prismaDirectSSL?.success) {
    results.recommendations.push('Prisma cannot connect but Supabase can - this is a Prisma-specific issue')
    results.recommendations.push('Consider using Supabase client for database operations temporarily')
    results.recommendations.push('Check if Prisma client is properly generated in node_modules')
  }
  
  if (results.tests.prismaNoSSL?.success && !results.tests.prismaDirectSSL?.success) {
    results.recommendations.push('SSL configuration issue detected')
  }
  
  return NextResponse.json(results)
}