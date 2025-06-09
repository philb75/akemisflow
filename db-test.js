// Direct database connection test without npm dependencies
const { Client } = require('pg');

async function testDatabaseConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'akemisflow_dev',
    user: 'akemisflow',
    password: 'dev_password_2024',
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test basic query
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);

    // Create a simple test table to verify schema creation works
    console.log('🔧 Testing table creation...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO test_connection (message) VALUES ('AkemisFlow connection test successful')
    `);

    const testResult = await client.query('SELECT * FROM test_connection ORDER BY created_at DESC LIMIT 1');
    console.log('✅ Test record:', testResult.rows[0]);

    // Clean up
    await client.query('DROP TABLE test_connection');
    console.log('🧹 Cleanup completed');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testDatabaseConnection();