#!/usr/bin/env node

// Set Vercel Environment Variables
const https = require('https');

const VERCEL_TOKEN = 'GvvdIlBMcIsvuWWuupv1URZA';
const PROJECT_ID = 'akemisflow';
const TEAM_ID = 'philippe-barthelemys-projects';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function setEnvironmentVariables() {
  console.log('🔧 Setting Vercel environment variables...');

  const envVars = [
    { 
      key: 'DATABASE_URL', 
      value: 'postgresql://postgres.wflcaapznpczlxjaeyfd:JqQKoxNn1HMm4cThe@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
      type: 'encrypted',
      target: ['production', 'preview']
    },
    { 
      key: 'NEXTAUTH_SECRET', 
      value: 'akemisflow-production-secret-2024-secure-very-long-random-string',
      type: 'encrypted',
      target: ['production', 'preview']
    },
    { 
      key: 'NEXTAUTH_URL', 
      value: 'https://akemisflow-philippe-barthelemys-projects.vercel.app',
      type: 'encrypted',
      target: ['production']
    },
    { 
      key: 'NEXT_PUBLIC_SUPABASE_URL', 
      value: 'https://wflcaapznpczlxjaeyfd.supabase.co',
      type: 'plain',
      target: ['production', 'preview']
    },
    { 
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MTg5NTUsImV4cCI6MjA2NDE5NDk1NX0.rDlg3hBRp_AdfpZMDcOEi8pWYiySzmUkWCy1lpKb9Bg',
      type: 'plain',
      target: ['production', 'preview']
    },
    { 
      key: 'SUPABASE_SERVICE_ROLE_KEY', 
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYxODk1NSwiZXhwIjoyMDY0MTk0OTU1fQ.Vv6milIIq0Ne9XdEG2yfwmAfn73t2AOuJ27CIamLRYo',
      type: 'encrypted',
      target: ['production', 'preview']
    },
    { 
      key: 'NODE_ENV', 
      value: 'production',
      type: 'plain',
      target: ['production']
    }
  ];

  for (const envVar of envVars) {
    try {
      console.log(`📝 Setting ${envVar.key}...`);
      
      const result = await makeRequest(
        `/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
        'POST',
        {
          key: envVar.key,
          value: envVar.value,
          type: envVar.type,
          target: envVar.target
        }
      );

      if (result.status === 200) {
        console.log(`✅ ${envVar.key} set successfully`);
      } else if (result.status === 409) {
        console.log(`⚠️  ${envVar.key} already exists, skipping`);
      } else {
        console.log(`❌ Failed to set ${envVar.key}: ${result.status}`, result.data);
      }
    } catch (error) {
      console.log(`❌ Error setting ${envVar.key}:`, error.message);
    }
  }

  console.log('✅ Environment variables setup completed');
}

setEnvironmentVariables().catch(console.error);