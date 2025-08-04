const puppeteer = require('puppeteer');

async function testSimpleLogin() {
  console.log('🧪 Testing simple login...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 500,
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
    
    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    console.log('📝 Filling in login form...');
    await page.type('input[type="email"]', 'philb75@gmail.com');
    await page.type('input[type="password"]', 'admin123');
    
    console.log('🔐 Looking for sign in button...');
    // Find the sign in button more reliably
    const signInButton = await page.$('button[type="submit"]');
    if (!signInButton) {
      const allButtons = await page.$$('button');
      console.log(`Found ${allButtons.length} buttons on page`);
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].evaluate(el => el.textContent);
        console.log(`Button ${i}: "${buttonText}"`);
      }
    }
    
    console.log('🔐 Clicking sign in button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    console.log('⏳ Waiting for login to complete...');
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log('📍 Current URL after login:', page.url());
    } catch (navError) {
      console.log('⚠️ No navigation detected, checking current page...');
      console.log('📍 Current URL:', page.url());
    }
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'login-attempt.png' });
    console.log('📷 Login attempt screenshot saved');
    
    console.log('✅ Login test completed!');
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
    try {
      await page.screenshot({ path: 'login-error.png' });
      console.log('📷 Error screenshot saved');
    } catch (screenshotError) {
      console.error('Could not save error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testSimpleLogin().catch(console.error);