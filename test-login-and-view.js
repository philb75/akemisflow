const puppeteer = require('puppeteer');

async function testLoginAndView() {
  console.log('🧪 Testing login and view...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 200,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📍 Navigating to homepage (should redirect to login)...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    console.log('📍 Current URL after redirect:', page.url());
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png' });
    console.log('📷 Login page screenshot saved');
    
    // Check if we can directly access contractors page
    console.log('📍 Trying to access contractors page directly...');
    await page.goto('http://localhost:3000/entities/contractors', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    console.log('📍 Current URL after contractors attempt:', page.url());
    
    // Take screenshot 
    await page.screenshot({ path: 'contractors-access-attempt.png' });
    console.log('📷 Contractors access attempt screenshot saved');
    
    // Wait to see the page
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testLoginAndView().catch(console.error);