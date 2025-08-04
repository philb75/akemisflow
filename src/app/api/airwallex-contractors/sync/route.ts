import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

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
      const { error } = await supabase
        .from('airwallex_contractors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (Supabase requires a condition)
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Get count of remaining records to calculate deleted count
      const { count } = await supabase
        .from('airwallex_contractors')
        .select('*', { count: 'exact', head: true })
      
      deleteResult.count = 'all' // We don't have the exact count but all were deleted
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
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/contractors/sync-airwallex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!syncResponse.ok) {
      const error = await syncResponse.json()
      throw new Error(error.error || 'Sync failed')
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