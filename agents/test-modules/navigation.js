/**
 * Navigation Test Module
 * Tests general application navigation and routing
 */

class NavigationTest {
  constructor(page, config, options = {}) {
    this.page = page;
    this.config = config;
    this.options = options;
    this.results = {
      steps: [],
      metrics: {},
      summary: null
    };
    this.pagesToTest = [
      { path: '/', name: 'Home' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/entities', name: 'Entities' },
      { path: '/entities/contractors', name: 'Contractors' },
      { path: '/entities/clients', name: 'Clients' },
      { path: '/finance', name: 'Finance' },
      { path: '/reporting', name: 'Reporting' },
      { path: '/admin', name: 'Admin' }
    ];
  }

  async execute() {
    console.log('🧭 Starting Navigation test...');
    
    try {
      await this.step1_TestMainNavigation();
      await this.step2_TestBreadcrumbs();
      await this.step3_TestBackNavigation();
      await this.step4_TestDirectNavigation();
      await this.step5_TestResponsiveNavigation();
      
      this.results.summary = 'Navigation test completed successfully';
      
    } catch (error) {
      this.results.summary = `Navigation test failed: ${error.message}`;
      throw error;
    }
    
    return this.results;
  }

  async step1_TestMainNavigation() {
    const stepStart = Date.now();
    console.log('🏠 Step 1: Testing main navigation...');
    
    try {
      // Start from home page
      await this.page.goto(this.config.appUrl, { 
        waitUntil: 'domcontentloaded' 
      });
      
      await this.captureScreenshot('01-home-page');
      
      // Find and test navigation menu
      const navMenu = await this.page.$('nav, .navigation, .nav-menu, header nav');
      
      if (navMenu) {
        console.log('✅ Found navigation menu');
        
        // Get all navigation links
        const navLinks = await this.page.evaluate(() => {
          const links = document.querySelectorAll('nav a, .navigation a, .nav-menu a, header nav a');
          return Array.from(links).map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            visible: link.offsetParent !== null
          })).filter(link => link.text && link.visible);
        });
        
        console.log(`🔗 Found ${navLinks.length} navigation links:`, navLinks.map(l => l.text));
        
        this.results.metrics.navigationLinks = navLinks;
        
        // Test a few key navigation links
        const keyLinks = navLinks.filter(link => 
          ['dashboard', 'entities', 'contractors', 'finance', 'admin'].some(key => 
            link.text.toLowerCase().includes(key) || link.href.includes(key)
          )
        );
        
        for (const link of keyLinks.slice(0, 3)) {
          try {
            console.log(`🎯 Testing navigation to: ${link.text}`);
            
            // Click the link
            await this.page.click(`a[href="${new URL(link.href).pathname}"]`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify navigation
            const currentUrl = this.page.url();
            const expectedPath = new URL(link.href).pathname;
            
            if (currentUrl.includes(expectedPath)) {
              console.log(`✅ Successfully navigated to ${link.text}`);
              await this.captureScreenshot(`nav-${link.text.toLowerCase().replace(/\s+/g, '-')}`);
            } else {
              console.log(`⚠️  Navigation to ${link.text} may have failed`);
            }
            
            // Go back to home for next test
            await this.page.goto(this.config.appUrl, { waitUntil: 'domcontentloaded' });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.log(`❌ Error testing navigation to ${link.text}:`, error.message);
          }
        }
        
      } else {
        console.log('⚠️  No navigation menu found');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Main Navigation',
        success: true,
        duration: stepEnd - stepStart,
        details: `Found ${this.results.metrics.navigationLinks?.length || 0} navigation links`
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Main Navigation',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      throw error;
    }
  }

  async step2_TestBreadcrumbs() {
    const stepStart = Date.now();
    console.log('🍞 Step 2: Testing breadcrumbs...');
    
    try {
      // Navigate to a deep page to test breadcrumbs
      await this.page.goto(`${this.config.appUrl}/entities/contractors`, { 
        waitUntil: 'domcontentloaded' 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for breadcrumb elements
      const breadcrumbs = await this.page.evaluate(() => {
        const breadcrumbSelectors = [
          '.breadcrumb', 
          '.breadcrumbs', 
          '[aria-label="breadcrumb"]',
          '.breadcrumb-nav',
          'nav[aria-label="breadcrumb"]'
        ];
        
        for (const selector of breadcrumbSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const links = element.querySelectorAll('a, span');
            return Array.from(links).map(link => ({
              text: link.textContent.trim(),
              href: link.href || null,
              isLink: link.tagName === 'A'
            }));
          }
        }
        
        return [];
      });
      
      if (breadcrumbs.length > 0) {
        console.log('✅ Found breadcrumbs:', breadcrumbs.map(b => b.text));
        await this.captureScreenshot('02-breadcrumbs');
        
        // Test breadcrumb navigation
        if (breadcrumbs.length > 1) {
          const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
          if (parentBreadcrumb.isLink && parentBreadcrumb.href) {
            console.log(`🎯 Testing breadcrumb navigation to: ${parentBreadcrumb.text}`);
            
            await this.page.click(`a[href="${new URL(parentBreadcrumb.href).pathname}"]`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.captureScreenshot('03-breadcrumb-navigation');
          }
        }
        
      } else {
        console.log('⚠️  No breadcrumbs found');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Breadcrumbs',
        success: true,
        duration: stepEnd - stepStart,
        details: breadcrumbs.length > 0 ? `Found ${breadcrumbs.length} breadcrumb items` : 'No breadcrumbs found'
      });
      
      this.results.metrics.breadcrumbs = breadcrumbs;
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Breadcrumbs',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - breadcrumbs are optional
    }
  }

  async step3_TestBackNavigation() {
    const stepStart = Date.now();
    console.log('⬅️ Step 3: Testing back navigation...');
    
    try {
      // Navigate through a few pages
      await this.page.goto(`${this.config.appUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.page.goto(`${this.config.appUrl}/entities`, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const beforeBackUrl = this.page.url();
      
      // Test browser back button
      await this.page.goBack();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterBackUrl = this.page.url();
      
      const backWorked = afterBackUrl !== beforeBackUrl && afterBackUrl.includes('/dashboard');
      
      if (backWorked) {
        console.log('✅ Browser back navigation working');
        await this.captureScreenshot('04-after-back');
      } else {
        console.log('⚠️  Browser back navigation may not be working as expected');
      }
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Back Navigation',
        success: backWorked,
        duration: stepEnd - stepStart,
        details: backWorked ? 'Back navigation working' : 'Back navigation issues detected'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Back Navigation',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - continue with other tests
    }
  }

  async step4_TestDirectNavigation() {
    const stepStart = Date.now();
    console.log('🎯 Step 4: Testing direct URL navigation...');
    
    const navigationResults = [];
    
    for (const pageInfo of this.pagesToTest) {
      try {
        console.log(`🔗 Testing direct navigation to: ${pageInfo.name} (${pageInfo.path})`);
        
        const navigationStart = Date.now();
        await this.page.goto(`${this.config.appUrl}${pageInfo.path}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        const navigationEnd = Date.now();
        
        // Check if page loaded successfully
        const currentUrl = this.page.url();
        const isError404 = await this.page.evaluate(() => {
          const text = document.body.textContent.toLowerCase();
          return text.includes('404') || text.includes('not found') || text.includes('page not found');
        });
        
        const isAuthRedirect = currentUrl.includes('/auth/signin') || currentUrl.includes('/login');
        
        let status = 'success';
        let details = 'Page loaded successfully';
        
        if (isError404) {
          status = 'not-found';
          details = 'Page not found (404)';
        } else if (isAuthRedirect && !pageInfo.path.includes('auth')) {
          status = 'auth-required';
          details = 'Redirected to authentication';
        }
        
        navigationResults.push({
          page: pageInfo.name,
          path: pageInfo.path,
          status: status,
          loadTime: navigationEnd - navigationStart,
          details: details
        });
        
        console.log(`${status === 'success' ? '✅' : '⚠️'} ${pageInfo.name}: ${details} (${navigationEnd - navigationStart}ms)`);
        
      } catch (error) {
        navigationResults.push({
          page: pageInfo.name,
          path: pageInfo.path,
          status: 'error',
          loadTime: 0,
          details: error.message
        });
        
        console.log(`❌ ${pageInfo.name}: ${error.message}`);
      }
    }
    
    await this.captureScreenshot('05-direct-navigation-final');
    
    const successfulNavigations = navigationResults.filter(r => r.status === 'success').length;
    const averageLoadTime = navigationResults.reduce((sum, r) => sum + r.loadTime, 0) / navigationResults.length;
    
    const stepEnd = Date.now();
    this.results.steps.push({
      name: 'Test Direct Navigation',
      success: successfulNavigations > 0,
      duration: stepEnd - stepStart,
      details: `${successfulNavigations}/${navigationResults.length} pages loaded successfully`
    });
    
    this.results.metrics.directNavigation = {
      results: navigationResults,
      successRate: successfulNavigations / navigationResults.length,
      averageLoadTime: averageLoadTime
    };
  }

  async step5_TestResponsiveNavigation() {
    const stepStart = Date.now();
    console.log('📱 Step 5: Testing responsive navigation...');
    
    try {
      // Test mobile viewport
      await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE size
      await this.page.goto(`${this.config.appUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.captureScreenshot('06-mobile-navigation');
      
      // Look for mobile menu toggle (hamburger menu)
      const mobileMenuToggle = await this.page.$('.hamburger, .menu-toggle, [aria-label="Menu"], button:has-text("Menu")');
      
      if (mobileMenuToggle) {
        console.log('✅ Found mobile menu toggle');
        
        // Test opening mobile menu
        await mobileMenuToggle.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.captureScreenshot('07-mobile-menu-open');
        
        // Check if menu opened
        const menuVisible = await this.page.evaluate(() => {
          const menu = document.querySelector('.mobile-menu, .nav-menu-mobile, .menu-overlay');
          return menu && (menu.offsetParent !== null || window.getComputedStyle(menu).display !== 'none');
        });
        
        if (menuVisible) {
          console.log('✅ Mobile menu opened successfully');
        } else {
          console.log('⚠️  Mobile menu may not have opened');
        }
        
      } else {
        console.log('⚠️  No mobile menu toggle found');
      }
      
      // Reset to desktop viewport
      await this.page.setViewport(this.config.viewport);
      
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Responsive Navigation',
        success: true,
        duration: stepEnd - stepStart,
        details: mobileMenuToggle ? 'Mobile navigation tested' : 'No mobile navigation found'
      });
      
    } catch (error) {
      const stepEnd = Date.now();
      this.results.steps.push({
        name: 'Test Responsive Navigation',
        success: false,
        duration: stepEnd - stepStart,
        error: error.message
      });
      // Don't throw - responsive navigation is optional
    }
  }

  async captureScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `navigation-${name}-${timestamp}.png`;
    const filepath = `${this.config.screenshotsDir}/${filename}`;
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    console.log(`📷 Screenshot saved: ${filename}`);
    return filepath;
  }
}

module.exports = NavigationTest;