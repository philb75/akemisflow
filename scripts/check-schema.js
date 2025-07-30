#!/usr/bin/env node

const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    user: 'postgres.wflcaapznpczlxjaeyfd',
    password: 'Philb921056$',
    host: 'aws-0-eu-west-3.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📋 Tables in database:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Get contacts table structure
    const contactsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Contacts table structure:');
    contactsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Count existing data
    const countResult = await client.query('SELECT COUNT(*) as count FROM contacts');
    console.log(`\n📈 Current contacts count: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();