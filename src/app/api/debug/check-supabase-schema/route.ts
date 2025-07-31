import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    if (!useSupabase) {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is for production environment only (requires Supabase)'
      })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get actual table schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'suppliers')
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Schema query failed: ${error.message}`,
        errorCode: error.code
      })
    }

    // Try a minimal insert to see what fails
    const testData = {
      first_name: 'Test',
      last_name: 'User',
      email: `test-${Date.now()}@example.com`,
      status: 'ACTIVE',
      is_active: true
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('suppliers')
      .insert(testData)
      .select()
      .single()

    let insertSuccess = false
    let insertErrorMessage = null

    if (insertError) {
      insertErrorMessage = {
        message: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        details: insertError.details
      }
    } else {
      insertSuccess = true
      
      // Clean up test record
      await supabase
        .from('suppliers')
        .delete()
        .eq('id', insertResult.id)
    }

    return NextResponse.json({
      success: true,
      environment: 'production',
      schema: {
        table: 'suppliers',
        columns: columns || [],
        columnCount: columns?.length || 0,
        columnNames: columns?.map(col => col.column_name) || []
      },
      testInsert: {
        success: insertSuccess,
        data: testData,
        error: insertErrorMessage,
        resultId: insertSuccess ? insertResult?.id : null
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}