import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🔧 Environment detection:')
console.log('- NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY) 
console.log('- Using Supabase:', useSupabase)
console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('- VERCEL_URL:', process.env.VERCEL_URL)

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗑️ Deleting all Airwallex contractors...')
    console.log(useSupabase ? '🔵 Using Supabase database client' : '🟡 Using Prisma database client')
    
    // Delete all Airwallex contractors
    let deleteResult: any = { count: 0 }
    
    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      // First get all records to count them
      const { data: allRecords, error: selectError } = await supabase
        .from('airwallex_contractors')
        .select('id')
      
      if (selectError) {
        throw new Error(`Failed to fetch records for deletion: ${selectError.message}`)
      }
      
      const recordCount = allRecords?.length || 0
      console.log(`📊 Found ${recordCount} records to delete`)
      
      if (recordCount > 0) {
        // Delete all records using a condition that matches all
        const { error: deleteError } = await supabase
          .from('airwallex_contractors')
          .delete()
          .not('id', 'is', null) // More reliable condition: delete where id is not null
        
        if (deleteError) {
          throw new Error(`Delete operation failed: ${deleteError.message}`)
        }
        
        deleteResult.count = recordCount
      } else {
        deleteResult.count = 0
      }
    } else {
      deleteResult = await prisma.airwallexContractor.deleteMany({})
    }
    
    console.log(`✅ Deleted ${deleteResult.count} Airwallex contractors`)
    
    return NextResponse.json({
      success: true,
      message: 'Airwallex contractors deleted successfully',
      data: {
        deletedCount: deleteResult.count
      }
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to delete Airwallex contractors:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to delete Airwallex contractors',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Re-importing Airwallex contractors...')
    
    // Trigger the contractors sync endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    console.log(`🔗 Making internal sync request to: ${baseUrl}/api/contractors/sync-airwallex`)
    
    const syncResponse = await fetch(`${baseUrl}/api/contractors/sync-airwallex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      console.error(`❌ Sync request failed with status ${syncResponse.status}:`, errorText)
      
      let errorMessage = 'Sync failed'
      try {
        const error = JSON.parse(errorText)
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }
    
    const syncResult = await syncResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Airwallex contractors re-imported successfully',
      data: syncResult.data
    }, { status: 200 })
  } catch (error) {
    console.error('❌ Failed to re-import Airwallex contractors:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to re-import Airwallex contractors',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}