const puppeteer = require('puppeteer');

async function progressiveTest() {
  console.log('🧪 Starting progressive test to isolate crash...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Basic load
    console.log('📍 Test 1: Basic load...');
    await page.goto('http://localhost:3000');
    console.log('✅ Basic load successful');
    
    // Test 2: Navigate to dashboard 
    console.log('📍 Test 2: Dashboard navigation...');
    await page.goto('http://localhost:3000/dashboard');
    console.log('✅ Dashboard navigation successful');
    
    // Test 3: Single refresh (this often triggers the crash)
    console.log('📍 Test 3: Single refresh...');
    await page.reload();
    console.log('✅ Single refresh successful');
    
    // Test 4: Wait and check server response
    console.log('📍 Test 4: Waiting 3 seconds then testing response...');
    await page.waitForTimeout(3000);
    const response = await page.goto('http://localhost:3000/dashboard');
    console.log('✅ Response status:', response.status());
    
    // Test 5: Multiple quick refreshes
    console.log('📍 Test 5: Multiple quick refreshes...');
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 Quick refresh ${i}/3...`);
      await page.reload();
      await page.waitForTimeout(500); // Short wait
    }
    console.log('✅ Multiple refreshes successful');
    
  } catch (error) {
    console.error('🚨 PROGRESSIVE TEST FAILED at step:', error.message);
    
    // Try to check if server is still alive
    try {
      const response = await page.goto('http://localhost:3000', { timeout: 3000 });
      console.log('Server still alive, status:', response.status());
    } catch (serverError) {
      console.error('🚨 SERVER APPEARS TO BE DOWN:', serverError.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Progressive test completed');
  }
}

progressiveTest().catch(console.error);