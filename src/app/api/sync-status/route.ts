import { NextRequest, NextResponse } from 'next/server'

// Public diagnostic endpoint to check sync configuration status
export async function GET(request: NextRequest) {
  try {
    // Check if we're in production
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Check if Airwallex is configured
    const airwallexConfigured = !!(process.env.AIRWALLEX_CLIENT_ID && process.env.AIRWALLEX_API_KEY)
    
    // Check if Supabase is configured
    const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Check if NextAuth is configured
    const nextAuthConfigured = !!process.env.NEXTAUTH_SECRET
    
    return NextResponse.json({
      environment: isProduction ? 'production' : 'development',
      configuration_status: {
        airwallex_configured: airwallexConfigured,
        supabase_configured: supabaseConfigured,
        nextauth_configured: nextAuthConfigured,
        database_url_present: !!process.env.DATABASE_URL
      },
      sync_endpoints: {
        contractors_sync: '/api/contractors/sync-airwallex',
        airwallex_contractors: '/api/airwallex-contractors/sync'
      },
      message: 'This endpoint shows configuration status for debugging sync issues'
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}