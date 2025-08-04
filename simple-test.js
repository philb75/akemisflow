const puppeteer = require('puppeteer');

async function simpleTest() {
  console.log('🧪 Starting simple test...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 Loading homepage...');
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0', 
      timeout: 5000 
    });
    
    console.log('✅ Status:', response.status());
    console.log('✅ Homepage loaded successfully');
    
  } catch (error) {
    console.error('🚨 SIMPLE TEST FAILED:', error.message);
  } finally {
    await browser.close();
  }
}

simpleTest().catch(console.error);