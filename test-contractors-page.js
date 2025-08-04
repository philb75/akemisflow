const puppeteer = require('puppeteer');

async function testContractorsPage() {
  console.log('🧪 Testing new contractors page...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📍 Navigating to contractors page...');
    await page.goto('http://localhost:3000/entities/contractors', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    console.log('📷 Taking screenshot...');
    await page.screenshot({ path: 'contractors-page.png', fullPage: true });
    console.log('✅ Screenshot saved as contractors-page.png');
    
    // Wait a bit to see the page
    await page.waitForSelector('body', { timeout: 3000 }).catch(() => {});
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testContractorsPage().catch(console.error);