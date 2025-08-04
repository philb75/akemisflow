const puppeteer = require('puppeteer');

async function testPageFinal() {
  console.log('🧪 Testing final page with working APIs...');
  
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
    
    // Wait for data to load
    console.log('⏳ Waiting for data to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Take final screenshot
    await page.screenshot({ path: 'final-contractors-page.png', fullPage: true });
    console.log('📷 Final contractors page screenshot saved');
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

testPageFinal().catch(console.error);