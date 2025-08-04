const puppeteer = require('puppeteer');

async function testPageRefresh() {
  console.log('🧪 Testing page refresh...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📍 Navigating to suppliers page...');
    await page.goto('http://localhost:3000/entities/suppliers', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    // Wait for loading to complete
    await page.waitForSelector('body', { timeout: 5000 });
    
    console.log('📷 Taking screenshot after load...');
    await page.screenshot({ path: 'suppliers-after-fix.png', fullPage: true });
    console.log('✅ Screenshot saved as suppliers-after-fix.png');
    
    // Wait to see if data loads
    await page.waitForSelector('body', { timeout: 3000 }).catch(() => {});
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testPageRefresh().catch(console.error);