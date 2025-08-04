const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function executeSupabaseMigration() {
  try {
    console.log('🔄 Starting Supabase migration...')
    
    const supabaseUrl = 'https://wflcaapznpczlxjaeyfd.supabase.co'
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZUsiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDg2MTg5NTUsImV4cCI6MjA2NDE5NDk1NX0.Vv6milIIq0Ne9XdEG2yfwmAfn73t2AOuJ27CIamLRYo'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test connection first
    const { data: authTest, error: authError } = await supabase.auth.getSession()
    if (authError) {
      throw new Error('Connection failed: Cannot access Supabase')
    }
    console.log('✅ Supabase connection verified')
    
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('./supabase-migration.sql', 'utf8')
    console.log('📖 Read migration SQL script')
    
    // Since Supabase client doesn't support raw SQL execution via the client library,
    // we need to use the REST API directly
    const supabaseRestUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`
    
    console.log('🚨 Note: This migration requires direct database access.')
    console.log('🔧 Please execute the SQL migration manually in Supabase dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd')
    console.log('   2. Open SQL Editor')
    console.log('   3. Copy the contents of supabase-migration.sql')
    console.log('   4. Execute the migration')
    console.log('')
    console.log('📋 Migration SQL preview (first 500 characters):')
    console.log(migrationSQL.substring(0, 500) + '...')
    
    // Check if we can at least verify the database is accessible
    console.log('')
    console.log('🔍 Checking current database state...')
    
    // Since we can't query information_schema directly, let's try to access a known table
    // If it fails, that means the migration hasn't been run yet
    const { data: testSuppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id')
      .limit(1)
    
    if (suppliersError) {
      if (suppliersError.code === 'PGRST116') {
        console.log('📝 Database is empty - migration needed')
        return false
      } else {
        console.log('❌ Database access error:', suppliersError.message)
        return false
      }
    } else {
      console.log('✅ Tables already exist - migration may have been completed')
      console.log(`📊 Found ${testSuppliers?.length || 0} suppliers in database`)
      return true
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message)
    return false
  }
}

executeSupabaseMigration().then(success => {
  if (success) {
    console.log('✅ Migration verification completed')
  } else {
    console.log('❌ Migration needs to be executed manually')
  }
})