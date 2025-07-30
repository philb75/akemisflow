#!/usr/bin/env node

// Supabase Database Wake-up Script
// Uses Supabase Management API to wake up paused database

const https = require('https');

const SUPABASE_ACCESS_TOKEN = 'sbp_7cb3affb7a9b72d1c4c9eeb418127d8ed4951303';
const PROJECT_ID = 'wflcaapznpczlxjaeyfd';

console.log('🔄 Attempting to wake up Supabase database...');
console.log(`📋 Project ID: ${PROJECT_ID}`);

// Function to make HTTPS requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

async function wakeUpDatabase() {
  try {
    // Step 1: Get project status
    console.log('📊 Checking project status...');
    const statusOptions = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AkemisFlow-Deploy/1.0'
      }
    };

    const statusResult = await makeRequest(statusOptions);
    console.log(`✅ Project status: ${statusResult.status}`);
    
    if (statusResult.status === 200) {
      console.log(`📋 Database status: ${statusResult.data.database?.status || 'unknown'}`);
      console.log(`📋 Project status: ${statusResult.data.status || 'unknown'}`);
    }

    // Step 2: Attempt to resume the database if paused
    if (statusResult.data.database?.status === 'INACTIVE' || statusResult.data.status === 'INACTIVE') {
      console.log('🔄 Database appears to be paused. Attempting to resume...');
      
      const resumeOptions = {
        hostname: 'api.supabase.com',
        port: 443,
        path: `/v1/projects/${PROJECT_ID}/database/resume`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AkemisFlow-Deploy/1.0'
        }
      };

      const resumeResult = await makeRequest(resumeOptions);
      console.log(`📋 Resume request status: ${resumeResult.status}`);
      
      if (resumeResult.status === 200) {
        console.log('✅ Database resume initiated successfully!');
        console.log('⏳ Waiting for database to become active...');
        
        // Wait a bit for the database to wake up
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        console.log('⚠️  Resume request may have failed:', resumeResult.data);
      }
    }

    // Step 3: Test database connectivity
    console.log('🔍 Testing database connectivity...');
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: 'postgresql://postgres:JqQKoxNn1HMm4cThe@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres',
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT current_timestamp as wake_time, current_database() as db_name');
      console.log('✅ Database is responding!');
      console.log(`📋 Connected to: ${result.rows[0].db_name}`);
      console.log(`📋 Server time: ${result.rows[0].wake_time}`);
      client.release();
      await pool.end();
      return true;
    } catch (dbError) {
      console.log('❌ Database connection test failed:', dbError.message);
      await pool.end();
      return false;
    }

  } catch (error) {
    console.error('❌ Error waking up database:', error.message);
    return false;
  }
}

// Run the wake-up process
wakeUpDatabase().then(success => {
  if (success) {
    console.log('🎉 Database wake-up completed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Database wake-up may have failed. Check Supabase dashboard.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});