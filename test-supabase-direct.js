const { createClient } = require('@supabase/supabase-js')

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection with createClient...')
    
    const supabaseUrl = 'https://wflcaapznpczlxjaeyfd.supabase.co'
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYxODk1NSwiZXhwIjoyMDY0MTk0OTU1fQ.Vv6milIIq0Ne9XdEG2yfwmAfn73t2AOuJ27CIamLRYo'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test basic connection with a simple SQL query
    const { data, error } = await supabase.rpc('version')
    
    if (error) {
      console.log('❌ Cannot execute SQL function:', error.message)
      
      // Try alternative: check if we can access auth users (always available)
      const { data: authTest, error: authError } = await supabase.auth.getSession()
      if (authError) {
        throw new Error('Connection failed: Cannot access auth system')
      }
    }
    
    console.log('✅ Supabase client connection successful')
    
    // Test SQL query directly
    const { data: versionData, error: versionError } = await supabase.rpc('version')
    
    if (versionError) {
      console.log('❌ SQL query failed:', versionError.message)
    } else {
      console.log('✅ SQL queries working')
    }
    
    // Check existing tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
    
    if (tablesError) {
      console.log('❌ Cannot query tables:', tablesError.message)
    } else {
      console.log(`📊 Found ${tables?.length || 0} existing tables`)
      if (tables && tables.length > 0) {
        console.log('🗂️ Existing tables:', tables.map(t => t.table_name).join(', '))
      }
    }
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return false
  }
  
  return true
}

testSupabaseConnection()