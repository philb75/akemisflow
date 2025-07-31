import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const logs: string[] = []
    
    // Try to get schema information
    logs.push('🔍 Inspecting Supabase schema...')
    
    // Try a simple select to see what happens
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .limit(1)
      
      if (error) {
        logs.push(`❌ Suppliers table error: ${error.message}`)
        logs.push(`❌ Error code: ${error.code}`)
        logs.push(`❌ Error hint: ${error.hint || 'none'}`)
      } else {
        logs.push(`✅ Suppliers table exists, found ${data ? data.length : 0} records`)
        if (data && data.length > 0) {
          logs.push(`📊 Sample record fields: ${Object.keys(data[0]).join(', ')}`)
        }
      }
    } catch (err: any) {
      logs.push(`❌ Exception querying suppliers: ${err.message}`)
    }
    
    // Try to list all tables
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (tablesError) {
        logs.push(`❌ Cannot list tables: ${tablesError.message}`)
      } else {
        logs.push(`📋 Available tables: ${tables.map(t => t.table_name).join(', ')}`)
      }
    } catch (err: any) {
      logs.push(`❌ Exception listing tables: ${err.message}`)
    }
    
    // Try to get column information for suppliers if it exists  
    try {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'suppliers')
        .eq('table_schema', 'public')
      
      if (columnsError) {
        logs.push(`❌ Cannot get supplier columns: ${columnsError.message}`)
      } else if (columns && columns.length > 0) {
        logs.push(`📊 Suppliers table columns:`)
        columns.forEach(col => {
          logs.push(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
        })
      } else {
        logs.push(`❌ No columns found for suppliers table`)
      }
    } catch (err: any) {
      logs.push(`❌ Exception getting columns: ${err.message}`)
    }
    
    return NextResponse.json({ 
      success: true,
      logs,
      environment: 'supabase'
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      environment: 'supabase'
    }, { status: 500 })
  }
}