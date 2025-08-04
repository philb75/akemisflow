const puppeteer = require('puppeteer');

async function testSiteStability() {
  console.log('🧪 Starting site stability test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Listen for console messages from the page (client-side errors)
    page.on('console', msg => {
      console.log(`🖥️ BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.error('🚨 PAGE ERROR:', error.message);
    });
    
    // Test 1: Initial load
    console.log('📍 Test 1: Initial load...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: 'test-1-initial.png' });
    console.log('✅ Initial load successful');
    
    // Test 2: Navigate to dashboard
    console.log('📍 Test 2: Dashboard navigation...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: 'test-2-dashboard.png' });
    console.log('✅ Dashboard load successful');
    
    // Test 3: Multiple refreshes (this often triggers the crash)
    console.log('📍 Test 3: Multiple refreshes to trigger crash...');
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Refresh ${i}/5...`);
      try {
        await page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
        await page.screenshot({ path: `test-3-refresh-${i}.png` });
        console.log(`✅ Refresh ${i} successful`);
        
        // Wait between refreshes
        await page.waitForTimeout(2000);
      } catch (error) {
        console.error(`🚨 CRASH DETECTED on refresh ${i}:`, error.message);
        await page.screenshot({ path: `test-3-crash-${i}.png` });
        break;
      }
    }
    
    // Test 4: Navigate to suppliers page
    console.log('📍 Test 4: Suppliers page navigation...');
    try {
      await page.goto('http://localhost:3000/suppliers', { waitUntil: 'networkidle0', timeout: 10000 });
      await page.screenshot({ path: 'test-4-suppliers.png' });
      console.log('✅ Suppliers page load successful');
    } catch (error) {
      console.error('🚨 SUPPLIERS PAGE FAILED:', error.message);
      await page.screenshot({ path: 'test-4-suppliers-error.png' });
    }
    
    // Test 5: Click around the UI to trigger interactions
    console.log('📍 Test 5: UI interactions...');
    try {
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Try to find and click navigation elements
      const navElements = await page.$$('nav a, [role="button"], button');
      console.log(`Found ${navElements.length} interactive elements`);
      
      for (let i = 0; i < Math.min(navElements.length, 3); i++) {
        try {
          await navElements[i].click();
          await page.waitForTimeout(1000);
          console.log(`✅ Clicked element ${i + 1}`);
        } catch (error) {
          console.log(`⚠️ Click ${i + 1} failed:`, error.message);
        }
      }
      
      await page.screenshot({ path: 'test-5-interactions.png' });
    } catch (error) {
      console.error('🚨 UI INTERACTIONS FAILED:', error.message);
      await page.screenshot({ path: 'test-5-interactions-error.png' });
    }
    
  } catch (error) {
    console.error('🚨 TEST SUITE FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test suite completed');
  }
}

// Run the test
testSiteStability().catch(console.error);