import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

// TEMPORARY: Test DELETE operation to debug the issue
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    console.log('🧪 Testing DELETE operation...')
    
    // First, check current count
    const { count: beforeCount, error: countError1 } = await supabase
      .from('airwallex_contractors')
      .select('*', { count: 'exact', head: true })
    
    if (countError1) {
      return NextResponse.json({
        success: false,
        error: 'Failed to count records before delete',
        details: countError1.message
      }, { status: 500 })
    }
    
    console.log(`📊 Current count: ${beforeCount}`)
    
    if (beforeCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records to delete',
        data: {
          beforeCount: beforeCount,
          deletedCount: 0,
          afterCount: 0
        }
      })
    }
    
    // Try the DELETE operation with the same condition as the main code
    const { error: deleteError } = await supabase
      .from('airwallex_contractors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (deleteError) {
      console.error('❌ Delete failed:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Delete operation failed',
        details: deleteError.message,
        beforeCount: beforeCount
      }, { status: 500 })
    }
    
    // Check count after delete
    const { count: afterCount, error: countError2 } = await supabase
      .from('airwallex_contractors')
      .select('*', { count: 'exact', head: true })
    
    if (countError2) {
      return NextResponse.json({
        success: false,
        error: 'Failed to count records after delete',
        details: countError2.message
      }, { status: 500 })
    }
    
    const deletedCount = (beforeCount || 0) - (afterCount || 0)
    
    return NextResponse.json({
      success: true,
      message: 'DELETE test completed',
      data: {
        beforeCount: beforeCount,
        deletedCount: deletedCount,
        afterCount: afterCount
      }
    })
    
  } catch (error) {
    console.error('🚨 Test delete failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Test delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}