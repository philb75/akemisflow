const puppeteer = require('puppeteer');

async function testLoginAndSuppliers() {
  console.log('🧪 Testing login and suppliers page...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 300,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/signin', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    console.log('📝 Filling in login form...');
    await page.type('input[name="email"], input[type="email"]', 'philb75@gmail.com');
    await page.type('input[name="password"], input[type="password"]', 'admin123');
    
    console.log('🔐 Clicking sign in button...');
    await page.click('button[type="submit"], button:contains("Sign in")');
    
    // Wait for navigation after login
    console.log('⏳ Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    
    console.log('📍 Current URL after login:', page.url());
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png' });
    console.log('📷 After login screenshot saved');
    
    console.log('📍 Navigating to suppliers page...');
    await page.goto('http://localhost:3000/entities/suppliers', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    // Wait for the page to load data
    console.log('⏳ Waiting for suppliers data to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take final screenshot
    await page.screenshot({ path: 'suppliers-after-login.png', fullPage: true });
    console.log('📷 Suppliers after login screenshot saved');
    
    console.log('✅ Test completed successfully!');
    
    // Keep browser open for manual inspection
    console.log('🔍 Keeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
    await page.screenshot({ path: 'test-error.png' });
    console.log('📷 Error screenshot saved');
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testLoginAndSuppliers().catch(console.error);