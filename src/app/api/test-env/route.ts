import { NextResponse } from 'next/server'

export async function GET() {
  // Check various environment aspects
  const envInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      AWS_REGION: process.env.AWS_REGION,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    },
    prismaCheck: {
      hasPrismaSchema: false,
      hasGeneratedClient: false,
    },
    moduleCheck: {
      hasSupabase: false,
      hasPrisma: false,
    }
  }
  
  // Check if Prisma client exists
  try {
    require.resolve('@prisma/client')
    envInfo.moduleCheck.hasPrisma = true
  } catch (e) {
    // Prisma client not found
  }
  
  // Check if Supabase exists
  try {
    require.resolve('@supabase/supabase-js')
    envInfo.moduleCheck.hasSupabase = true
  } catch (e) {
    // Supabase not found
  }
  
  // Check database URLs (safely)
  envInfo.databaseConfig = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  
  // Check Airwallex config
  envInfo.airwallexConfig = {
    hasClientId: !!process.env.AIRWALLEX_CLIENT_ID,
    hasApiKey: !!process.env.AIRWALLEX_API_KEY,
    hasBaseUrl: !!process.env.AIRWALLEX_BASE_URL,
  }
  
  return NextResponse.json(envInfo)
}