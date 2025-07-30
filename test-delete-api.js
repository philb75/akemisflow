#!/usr/bin/env node

// Test the delete API endpoint directly
const http = require('http');

async function testDeleteAPI() {
  try {
    console.log('=== TESTING DELETE API ENDPOINT ===');
    
    const postData = JSON.stringify({
      fromDate: '2025-06-01'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/transactions/delete-by-date',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('Making request to:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('Request body:', postData);
    
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data);
        try {
          const parsed = JSON.parse(data);
          console.log('Parsed response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Could not parse response as JSON');
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`Request error: ${e.message}`);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDeleteAPI();