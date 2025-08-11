import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createSupabaseClient } from '@/lib/supabase'

// TEMPORARY: Bypass DELETE and test if we can at least SELECT from the table
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🧪 Quick fix: Testing table access...')
    
    const supabase = createSupabaseClient()
    
    // Test 1: Can we SELECT from the table?
    console.log('📋 Testing SELECT operation...')
    const { data: selectData, error: selectError } = await supabase
      .from('airwallex_contractors')
      .select('id, beneficiary_id, first_name, last_name')
      .limit(5)
    
    if (selectError) {
      console.error('❌ SELECT failed:', selectError)
      return NextResponse.json({
        success: false,
        error: 'SELECT operation failed',
        details: selectError.message,
        step: 'select_test'
      }, { status: 500 })
    }
    
    console.log(`✅ SELECT works: found ${selectData?.length || 0} records`)
    
    // Test 2: Can we INSERT a test record?
    console.log('📝 Testing INSERT operation...')
    const testRecord = {
      beneficiary_id: `test-${Date.now()}`,
      first_name: 'Test',
      last_name: 'User',
      status: 'ACTIVE',
      last_fetched_at: new Date().toISOString()
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('airwallex_contractors')
      .insert(testRecord)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ INSERT failed:', insertError)
      return NextResponse.json({
        success: false,
        error: 'INSERT operation failed',
        details: insertError.message,
        step: 'insert_test',
        select_worked: true,
        records_found: selectData?.length || 0
      }, { status: 500 })
    }
    
    console.log('✅ INSERT works:', insertData?.beneficiary_id)
    
    // Test 3: Can we DELETE the test record?
    console.log('🗑️ Testing DELETE operation...')
    const { error: deleteError } = await supabase
      .from('airwallex_contractors')
      .delete()
      .eq('beneficiary_id', testRecord.beneficiary_id)
    
    if (deleteError) {
      console.error('❌ DELETE failed:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'DELETE operation failed',
        details: deleteError.message,
        step: 'delete_test',
        select_worked: true,
        insert_worked: true,
        test_record_id: insertData?.beneficiary_id
      }, { status: 500 })
    }
    
    console.log('✅ DELETE works')
    
    return NextResponse.json({
      success: true,
      message: 'All operations work! Table is accessible.',
      data: {
        select_worked: true,
        insert_worked: true,
        delete_worked: true,
        records_found: selectData?.length || 0,
        test_record_created_and_deleted: testRecord.beneficiary_id
      }
    })
    
  } catch (error) {
    console.error('🚨 Quick fix test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Quick fix test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}