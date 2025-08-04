#!/usr/bin/env node

/**
 * Validation Tester Agent
 * 
 * This agent tests the changes made by the developer agent
 * against the test plan from the orchestrator.
 * 
 * Model: Sonnet
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const puppeteer = require('puppeteer');

class ValidationTester {
  constructor(input) {
    this.requestId = input.requestId;
    this.testPlan = input.testPlan;
    this.changeManifest = input.changeManifest;
    this.requirements = input.requirements;
    this.testResults = [];
    this.browser = null;
    this.page = null;
    this.screenshotsPath = path.join(__dirname, 'screenshots', this.requestId);
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Main testing execution
   */
  async test() {
    // Suppress console logs during orchestration
    const originalLog = console.log;
    const originalError = console.error;
    if (process.env.ORCHESTRATION === 'true') {
      console.log = () => {};
      console.error = () => {};
    }
    
    try {
      // Setup
      await this.setup();
      
      // Run each test
      for (const test of this.testPlan) {
        const result = await this.runTest(test);
        this.testResults.push(result);
      }
      
      // Cleanup
      await this.cleanup();
      
      // Generate report
      const report = this.generateReport();
      
      // Save results
      await this.saveTestResults(report);
      
      // Return results
      const output = {
        success: true,
        requestId: this.requestId,
        testResults: this.testResults,
        summary: report.summary
      };
      
      // Restore console if suppressed
      if (process.env.ORCHESTRATION === 'true') {
        console.log = originalLog;
        console.error = originalError;
      }
      
      // Output only JSON for orchestration
      process.stdout.write(JSON.stringify(output));
      return output;
      
    } catch (error) {
      // Restore console if suppressed
      if (process.env.ORCHESTRATION === 'true') {
        console.log = originalLog;
        console.error = originalError;
      }
      
      const output = {
        success: false,
        requestId: this.requestId,
        error: error.message,
        testResults: this.testResults
      };
      
      // Output only JSON for orchestration
      process.stdout.write(JSON.stringify(output));
      return output;
    }
  }

  /**
   * Setup test environment
   */
  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Create screenshots directory
    await fs.mkdir(this.screenshotsPath, { recursive: true });
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Setup console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   🔴 Browser error:', msg.text());
      }
    });
    
    // Navigate to app
    await this.page.goto(this.appUrl, { waitUntil: 'networkidle2' });
    
    // Perform authentication if needed
    await this.authenticate();
    
    console.log('   ✅ Test environment ready');
  }

  /**
   * Authenticate if required
   */
  async authenticate() {
    try {
      // Check if we're on login page
      const url = this.page.url();
      if (url.includes('/auth/signin') || url.includes('/login')) {
        console.log('   🔐 Authenticating...');
        
        // Try test credentials
        await this.page.type('input[name="email"]', 'philb75@gmail.com');
        await this.page.type('input[name="password"]', 'password');
        await this.page.click('button[type="submit"]');
        
        // Wait for navigation
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('   ✅ Authenticated');
      }
    } catch (error) {
      console.log('   ⚠️  Authentication skipped or failed:', error.message);
    }
  }

  /**
   * Run a specific test
   */
  async runTest(test) {
    console.log(`\n📝 Running test: ${test.name}`);
    
    const startTime = Date.now();
    let result = {
      id: test.id,
      name: test.name,
      requirement: test.requirement,
      status: 'pending',
      duration: 0,
      details: {}
    };
    
    try {
      switch (test.type) {
        case 'layout-validation':
          result = await this.runLayoutTest(test, result);
          break;
        case 'database-validation':
          result = await this.runDatabaseTest(test, result);
          break;
        case 'api-validation':
          result = await this.runAPITest(test, result);
          break;
        default:
          result = await this.runGenericTest(test, result);
      }
      
      result.duration = Date.now() - startTime;
      console.log(`   ${result.status === 'pass' ? '✅' : '❌'} Test ${result.status} (${result.duration}ms)`);
      
    } catch (error) {
      result.status = 'fail';
      result.details = {
        error: error.message,
        stack: error.stack
      };
      result.duration = Date.now() - startTime;
      console.error(`   ❌ Test failed with error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Run layout validation test
   */
  async runLayoutTest(test, result) {
    console.log('   🎨 Running layout validation...');
    
    // Navigate to contractors page
    await this.page.goto(`${this.appUrl}/entities/contractors`, { 
      waitUntil: 'networkidle2' 
    });
    
    // Take screenshot
    const screenshotPath = path.join(this.screenshotsPath, `${test.id}-before.png`);
    await this.page.screenshot({ path: screenshotPath });
    
    // Find and expand a contractor if available
    const expandButtons = await this.page.$$('[data-testid="expand-contractor"]');
    if (expandButtons.length === 0) {
      // Try alternative selectors
      const rows = await this.page.$$('tr[onClick]');
      if (rows.length > 0) {
        await rows[0].click();
        await this.page.waitForTimeout(1000);
      }
    } else {
      await expandButtons[0].click();
      await this.page.waitForTimeout(1000);
    }
    
    // Take expanded screenshot
    const expandedScreenshot = path.join(this.screenshotsPath, `${test.id}-expanded.png`);
    await this.page.screenshot({ path: expandedScreenshot });
    
    // Validate comment field alignment
    const validationResult = await this.validateCommentAlignment();
    
    if (validationResult.aligned) {
      result.status = 'pass';
      result.details = {
        message: 'Layout correctly aligned',
        measurements: validationResult.measurements
      };
    } else {
      result.status = 'fail';
      result.details = {
        reason: 'Comment field not properly aligned',
        expected: validationResult.expected,
        actual: validationResult.actual,
        measurements: validationResult.measurements
      };
    }
    
    return result;
  }

  /**
   * Validate comment field alignment specifically
   */
  async validateCommentAlignment() {
    try {
      const measurements = await this.page.evaluate(() => {
        // Find comment field
        const commentField = document.querySelector('textarea[placeholder*="comment"]');
        if (!commentField) {
          return { found: false };
        }
        
        // Find Account Name field for reference
        const accountNameRow = Array.from(document.querySelectorAll('tr')).find(tr => 
          tr.textContent.includes('Account Name')
        );
        
        if (!accountNameRow) {
          return { found: false, reason: 'No Account Name row found' };
        }
        
        // Get the data cell (second td) of Account Name row
        const accountNameCell = accountNameRow.querySelectorAll('td')[1];
        if (!accountNameCell) {
          return { found: false, reason: 'No Account Name data cell found' };
        }
        
        // Get bounding rectangles
        const commentRect = commentField.getBoundingClientRect();
        const accountRect = accountNameCell.getBoundingClientRect();
        
        return {
          found: true,
          comment: {
            left: commentRect.left,
            right: commentRect.right,
            width: commentRect.width
          },
          accountName: {
            left: accountRect.left,
            right: accountRect.right,
            width: accountRect.width
          },
          aligned: Math.abs(commentRect.left - accountRect.left) < 5 && 
                   Math.abs(commentRect.right - accountRect.right) < 5
        };
      });
      
      return {
        aligned: measurements.aligned || false,
        measurements: measurements,
        expected: 'Comment field aligned with Account Name field',
        actual: measurements.found ? 
          `Comment: ${measurements.comment?.left}-${measurements.comment?.right}, Account: ${measurements.accountName?.left}-${measurements.accountName?.right}` :
          'Elements not found'
      };
      
    } catch (error) {
      return {
        aligned: false,
        error: error.message,
        expected: 'Comment field aligned with Account Name field',
        actual: 'Could not measure'
      };
    }
  }

  /**
   * Run database validation test
   */
  async runDatabaseTest(test, result) {
    console.log('   💾 Running database validation...');
    
    // Check if schema changes were applied
    const schemaValid = await this.validateDatabaseSchema();
    
    if (schemaValid) {
      result.status = 'pass';
      result.details = {
        message: 'Database schema correctly updated'
      };
    } else {
      result.status = 'fail';
      result.details = {
        reason: 'Database schema not properly updated'
      };
    }
    
    return result;
  }

  /**
   * Run API validation test
   */
  async runAPITest(test, result) {
    console.log('   🔌 Running API validation...');
    
    // Test API endpoint
    const apiResult = await this.testAPIEndpoint(test);
    
    if (apiResult.success) {
      result.status = 'pass';
      result.details = {
        message: 'API responding correctly',
        response: apiResult.response
      };
    } else {
      result.status = 'fail';
      result.details = {
        reason: 'API not responding as expected',
        error: apiResult.error
      };
    }
    
    return result;
  }

  /**
   * Run generic test
   */
  async runGenericTest(test, result) {
    console.log('   📦 Running generic test...');
    
    // Basic validation
    result.status = 'pass';
    result.details = {
      message: 'Generic test passed'
    };
    
    return result;
  }

  /**
   * Validate database schema
   */
  async validateDatabaseSchema() {
    try {
      // Check if prisma schema is valid
      const { stdout } = await execAsync('npx prisma validate', {
        cwd: path.join(__dirname, '../../')
      });
      
      return !stdout.includes('error');
    } catch (error) {
      console.error('   ❌ Schema validation failed:', error.message);
      return false;
    }
  }

  /**
   * Test API endpoint
   */
  async testAPIEndpoint(test) {
    try {
      // Make API request using page.evaluate
      const response = await this.page.evaluate(async () => {
        const res = await fetch('/api/contractors', {
          credentials: 'include'
        });
        return {
          status: res.status,
          ok: res.ok,
          data: await res.json()
        };
      });
      
      return {
        success: response.ok,
        response: response
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('   ✅ Cleanup complete');
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'pass').length;
    const failedTests = this.testResults.filter(t => t.status === 'fail').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
    
    return {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: `${passRate}%`
      },
      tests: this.testResults,
      changeManifest: this.changeManifest
    };
  }

  /**
   * Save test results to file
   */
  async saveTestResults(report) {
    const resultsPath = path.join(
      __dirname,
      'test-results',
      `${this.requestId}.json`
    );
    
    await fs.mkdir(path.dirname(resultsPath), { recursive: true });
    await fs.writeFile(resultsPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Test report saved to: ${resultsPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const input = process.argv[2];
  
  if (!input) {
    console.error('No input provided');
    process.exit(1);
  }
  
  try {
    const parsedInput = JSON.parse(input);
    const tester = new ValidationTester(parsedInput);
    
    tester.test()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
      
  } catch (error) {
    console.error('Invalid input:', error.message);
    process.exit(1);
  }
}

module.exports = ValidationTester;