const puppeteer = require('puppeteer');

async function testFullLoginFlow() {
  console.log('🧪 Testing full login flow...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 200,
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
    
    // Take screenshot of signin page
    await page.screenshot({ path: 'signin-page.png' });
    console.log('📷 Signin page screenshot saved');
    
    // Look for OAuth buttons or forms
    const googleButton = await page.$('button[type="submit"]:has-text("Sign in with Google"), button:has-text("Google"), [data-provider="google"]');
    const emailForm = await page.$('form input[type="email"], input[name="email"]');
    
    console.log('🔍 Google button found:', !!googleButton);
    console.log('🔍 Email form found:', !!emailForm);
    
    // Check page content to understand login options
    const pageContent = await page.content();
    console.log('📄 Page contains "Google":', pageContent.includes('Google'));
    console.log('📄 Page contains "email":', pageContent.includes('email'));
    console.log('📄 Page contains "Sign in":', pageContent.includes('Sign in'));
    
    // Try to find any form or button elements
    const buttons = await page.$$eval('button', buttons => buttons.map(btn => btn.textContent?.trim()));
    console.log('🔘 Buttons found:', buttons);
    
    const links = await page.$$eval('a', links => links.map(link => ({ text: link.textContent?.trim(), href: link.href })));
    console.log('🔗 Links found:', links.filter(link => link.text));
    
    // Wait longer to see the page
    console.log('⏳ Waiting to see the page...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testFullLoginFlow().catch(console.error);