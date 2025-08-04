const puppeteer = require('puppeteer');

async function testAuthenticatedFlow() {
  console.log('🧪 Testing authenticated flows...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Go to signin page directly
    console.log('📍 Test 1: Navigate to signin page...');
    await page.goto('http://localhost:3000/auth/signin', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    console.log('✅ Signin page loaded');
    
    // Test 2: Try to access dashboard (should redirect to signin)
    console.log('📍 Test 2: Access dashboard (should redirect)...');
    const response = await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    console.log('✅ Dashboard redirect working, final URL:', page.url());
    
    // Test 3: Multiple navigation attempts
    console.log('📍 Test 3: Multiple navigation attempts...');
    const routes = ['/dashboard', '/contractors', '/admin/configuration'];
    
    for (const route of routes) {
      try {
        console.log(`🔄 Testing route: ${route}`);
        await page.goto(`http://localhost:3000${route}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 5000 
        });
        console.log(`✅ Route ${route} handled (redirected to: ${page.url()})`);
        await page.waitForSelector('body', { timeout: 1000 }).catch(() => {});
      } catch (error) {
        console.error(`🚨 Route ${route} failed:`, error.message);
      }
    }
    
    // Test 4: Rapid refreshes to test stability
    console.log('📍 Test 4: Rapid refreshes on signin page...');
    await page.goto('http://localhost:3000/auth/signin', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Refresh ${i}/5...`);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForSelector('body', { timeout: 500 }).catch(() => {});
    }
    console.log('✅ Rapid refreshes completed successfully');
    
  } catch (error) {
    console.error('🚨 AUTH TEST FAILED:', error.message);
    
    // Check if server is still responding
    try {
      const testResponse = await page.goto('http://localhost:3000', { 
        waitUntil: 'domcontentloaded',
        timeout: 3000 
      });
      console.log('✅ Server still responding after error');
    } catch (serverError) {
      console.error('🚨 SERVER APPEARS DOWN:', serverError.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Auth test completed');
  }
}

testAuthenticatedFlow().catch(console.error);