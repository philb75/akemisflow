import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

// Check what tables exist in the production database
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Query to get all table names
    const { data, error } = await supabase.rpc('get_table_list')
    
    if (error) {
      // Fallback: try a different approach
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
      
      if (tablesError) {
        // Last resort: try to query specific tables we expect
        const expectedTables = [
          'users', 'contractors', 'airwallex_contractors', 'contacts', 
          'bank_accounts', 'invoices', 'transactions'
        ]
        
        const tableStatus: any = {}
        
        for (const tableName of expectedTables) {
          try {
            const { error: checkError } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .limit(0)
            
            tableStatus[tableName] = checkError ? 'missing' : 'exists'
          } catch (e) {
            tableStatus[tableName] = 'missing'
          }
        }
        
        return NextResponse.json({
          method: 'individual_table_check',
          table_status: tableStatus,
          note: 'Could not query information_schema, checked individual tables'
        })
      }
      
      return NextResponse.json({
        method: 'information_schema',
        tables: tables?.map(t => t.table_name) || []
      })
    }
    
    return NextResponse.json({
      method: 'rpc_function',
      tables: data || []
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}