// Simple test to verify the application is working
const http = require('http');

function testEndpoint(port, path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${description}: ${res.statusCode} - ${path}`);
        resolve({ success: true, status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: Failed - ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ ${description}: Timeout - ${path}`);
      resolve({ success: false, error: 'timeout' });
    });

    req.end();
  });
}

async function testAkemisFlow() {
  console.log('🧪 Testing AkemisFlow Application');
  console.log('==================================');

  const tests = [
    { port: 3002, path: '/', description: 'Homepage' },
    { port: 3002, path: '/api/health', description: 'Health API' },
    { port: 3002, path: '/api/dashboard', description: 'Dashboard API' },
    { port: 3002, path: '/api/clients', description: 'Clients API' },
    { port: 3001, path: '/', description: 'Alt Homepage (3001)' },
    { port: 3001, path: '/api/health', description: 'Alt Health API (3001)' },
  ];

  for (const test of tests) {
    await testEndpoint(test.port, test.path, test.description);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }

  console.log('\n🎯 Access Links:');
  console.log('================');
  console.log('🏠 Homepage: http://localhost:3002');
  console.log('📊 Dashboard: http://localhost:3002/dashboard');
  console.log('🏢 Clients: http://localhost:3002/clients');
  console.log('📄 Invoices: http://localhost:3002/invoices');
  console.log('💳 Transactions: http://localhost:3002/transactions');
  console.log('🏦 Bank Accounts: http://localhost:3002/bank-accounts');
  console.log('');
  console.log('🔗 API Endpoints:');
  console.log('=================');
  console.log('📊 Health: http://localhost:3002/api/health');
  console.log('📊 Dashboard: http://localhost:3002/api/dashboard');
  console.log('🏢 Clients: http://localhost:3002/api/clients');
  console.log('📄 Invoices: http://localhost:3002/api/invoices');
  console.log('💳 Transactions: http://localhost:3002/api/transactions');
}

testAkemisFlow().catch(console.error);