const { Client } = require('pg')

async function testSupabasePostgres() {
  // Try different connection string formats that might work
  const connectionStrings = [
    'postgresql://postgres.wflcaapznpczlxjaeyfd:DEV_DB_2024_akemis!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.wflcaapznpczlxjaeyfd:DEV_DB_2024_akemis!@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
    'postgresql://postgres:DEV_DB_2024_akemis!@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres'
  ]
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i]
    console.log(`🔄 Testing connection ${i + 1}/${connectionStrings.length}...`)
    
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    })
    
    try {
      await client.connect()
      console.log('✅ Connected successfully!')
      
      // Test basic query
      const result = await client.query('SELECT version()')
      console.log('📊 PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...')
      
      // Check existing tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `)
      
      console.log(`🗂️ Found ${tablesResult.rows.length} existing tables`)
      if (tablesResult.rows.length > 0) {
        console.log('📋 Tables:', tablesResult.rows.map(r => r.table_name).join(', '))
      }
      
      await client.end()
      
      // If we get here, this connection string works
      return connectionString
      
    } catch (error) {
      console.log(`❌ Connection ${i + 1} failed:`, error.message)
      try {
        await client.end()
      } catch (endError) {
        // Ignore end errors
      }
    }
  }
  
  return null
}

testSupabasePostgres().then(workingConnection => {
  if (workingConnection) {
    console.log('')
    console.log('🎉 Working connection found!')
    console.log('🔗 Connection string:', workingConnection)
  } else {
    console.log('')
    console.log('❌ No working connection found')
    console.log('🔧 Please verify Supabase credentials')
  }
})