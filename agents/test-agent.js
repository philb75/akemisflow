#!/usr/bin/env node

/**
 * AkemisFlow Test Agent
 * Specialized testing subagent using Puppeteer for automated application testing
 * Supports various test types and provides comprehensive result reporting
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class AkemisFlowTestAgent {
  constructor() {
    this.config = {
      appUrl: 'http://localhost:3000',
      screenshotsDir: './test-screenshots',
      logsDir: './logs',
      serverLogFile: './logs/app-2025-08-04.log',
      testTimeout: 30000,
      browserOptions: {
        headless: false,
        slowMo: 100,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      },
      viewport: { width: 1280, height: 720 }
    };

    this.testModules = {
      'airwallex-sync': './test-modules/airwallex-sync',
      'contractor-crud': './test-modules/contractor-crud',
      'auth-flow': './test-modules/auth-flow',
      'navigation': './test-modules/navigation',
      'ui-interactions': './test-modules/ui-interactions',
      'layout-validation': './test-modules/layout-validation'
    };

    this.results = {
      testType: null,
      status: 'pending',
      startTime: null,
      endTime: null,
      duration: null,
      screenshots: [],
      errors: [],
      serverLogExcerpts: [],
      performanceMetrics: {},
      stepResults: [],
      summary: null
    };

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.config.screenshotsDir, this.config.logsDir, './test-results'].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Run layout validation as part of other tests
   * @param {Page} page - Puppeteer page instance
   * @param {Object} options - Layout validation options
   */
  async runLayoutValidation(page, options = {}) {
    console.log('📐 Running integrated layout validation...');
    
    try {
      const LayoutValidationTest = require('./test-modules/layout-validation');
      const layoutTest = new LayoutValidationTest(page, this.config, options);
      
      const layoutResults = await layoutTest.execute();
      
      // Integrate layout results into main results
      this.results.layoutValidation = {
        issues: layoutResults.layoutIssues || [],
        measurements: layoutResults.measurements || {},
        summary: layoutResults.summary
      };
      
      return layoutResults;
      
    } catch (error) {
      console.log('⚠️  Layout validation failed:', error.message);
      this.results.layoutValidation = {
        issues: [],
        measurements: {},
        summary: `Layout validation failed: ${error.message}`,
        error: error.message
      };
      
      return null;
    }
  }

  /**
   * Run comprehensive test suite with layout validation
   * @param {Array} testTypes - Array of test types to run
   * @param {Object} options - Test options
   */
  async runTestSuite(testTypes, options = {}) {
    console.log(`🧪 Starting comprehensive test suite: ${testTypes.join(', ')}`);
    
    const suiteResults = {
      tests: [],
      overallStatus: 'passed',
      layoutValidation: null,
      startTime: new Date(),
      endTime: null,
      duration: null
    };
    
    let browser = null;
    let page = null;
    
    try {
      // Initialize browser once for all tests
      browser = await puppeteer.launch(this.config.browserOptions);
      page = await browser.newPage();
      await page.setViewport(this.config.viewport);
      await this.setupPageMonitoring(page);
      
      // Run each test
      for (const testType of testTypes) {
        console.log(`🔄 Running ${testType} test...`);
        
        try {
          const testResult = await this.runSingleTest(testType, page, options);
          suiteResults.tests.push(testResult);
          
          if (testResult.status === 'failed') {
            suiteResults.overallStatus = 'failed';
          }
        } catch (testError) {
          console.log(`❌ Test ${testType} failed:`, testError.message);
          suiteResults.tests.push({
            testType,
            status: 'failed',
            error: testError.message,
            duration: 0
          });
          suiteResults.overallStatus = 'failed';
        }
      }
      
      // Run layout validation if requested or if any visual tests were included
      const shouldRunLayoutValidation = options.includeLayoutValidation || 
        testTypes.some(t => ['airwallex-sync', 'contractor-crud', 'ui-interactions'].includes(t));
      
      if (shouldRunLayoutValidation) {
        console.log('📐 Running final layout validation...');
        const layoutResults = await this.runLayoutValidation(page, options.layoutValidation || {});
        suiteResults.layoutValidation = layoutResults;
      }
      
    } finally {
      if (browser) {
        await browser.close();
      }
      
      suiteResults.endTime = new Date();
      suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
    }
    
    console.log(`📊 Test suite completed in ${suiteResults.duration}ms`);
    console.log(`Status: ${suiteResults.overallStatus}, Tests: ${suiteResults.tests.length}`);
    
    return suiteResults;
  }

  /**
   * Run a single test with existing page
   * @param {string} testType - Type of test to run
   * @param {Page} page - Puppeteer page instance
   * @param {Object} options - Test options
   */
  async runSingleTest(testType, page, options = {}) {
    if (!this.testModules[testType]) {
      throw new Error(`Unknown test type: ${testType}`);
    }
    
    const TestModule = require(this.testModules[testType]);
    const testInstance = new TestModule(page, this.config, options);
    
    const startTime = Date.now();
    
    try {
      const testResults = await testInstance.execute();
      const duration = Date.now() - startTime;
      
      return {
        testType,
        status: 'passed',
        duration,
        results: testResults
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testType,
        status: 'failed',
        duration,
        error: error.message
      };
    }
  }

  /**
   * Main test execution method
   * @param {string} testType - Type of test to run
   * @param {Object} options - Test options and parameters
   */
  async runTest(testType, options = {}) {
    this.results.testType = testType;
    this.results.startTime = new Date();
    
    console.log(`🧪 Starting ${testType} test at ${this.results.startTime.toISOString()}`);
    
    let browser = null;
    let page = null;

    try {
      // Initialize browser and page
      browser = await puppeteer.launch(this.config.browserOptions);
      page = await browser.newPage();
      await page.setViewport(this.config.viewport);
      
      // Setup page monitoring
      await this.setupPageMonitoring(page);
      
      // Start server log monitoring
      const logMonitor = this.startLogMonitoring();
      
      // Execute the specific test module
      if (!this.testModules[testType]) {
        throw new Error(`Unknown test type: ${testType}`);
      }

      // Load and execute test module
      const TestModule = require(this.testModules[testType]);
      const testInstance = new TestModule(page, this.config, options);
      
      const testResults = await testInstance.execute();
      
      // Stop log monitoring
      this.stopLogMonitoring(logMonitor);
      
      // Compile results
      this.results.status = 'passed';
      this.results.stepResults = testResults.steps || [];
      this.results.performanceMetrics = testResults.metrics || {};
      this.results.summary = testResults.summary;
      
    } catch (error) {
      this.results.status = 'failed';
      this.results.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Take failure screenshot
      if (page) {
        await this.captureScreenshot(page, 'test-failure');
      }
    } finally {
      if (browser) {
        await browser.close();
      }
      
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      // Generate final report
      const report = await this.generateReport();
      console.log(`📊 Test completed in ${this.results.duration}ms`);
      
      return report;
    }
  }

  /**
   * Setup page monitoring for performance and errors
   */
  async setupPageMonitoring(page) {
    // Monitor console logs
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      
      if (['error', 'warning'].includes(msg.type())) {
        this.results.errors.push(logEntry);
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      this.results.errors.push({
        type: 'pageerror',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Monitor failed requests
    page.on('requestfailed', request => {
      this.results.errors.push({
        type: 'requestfailed',
        url: request.url(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start monitoring server log file
   */
  startLogMonitoring() {
    const logFile = this.config.serverLogFile;
    
    if (!fs.existsSync(logFile)) {
      console.warn(`⚠️  Server log file not found: ${logFile}`);
      return null;
    }

    const initialSize = fs.statSync(logFile).size;
    
    return {
      file: logFile,
      initialSize: initialSize,
      interval: setInterval(() => {
        try {
          const currentSize = fs.statSync(logFile).size;
          if (currentSize > initialSize) {
            const newContent = fs.readFileSync(logFile, 'utf8').slice(initialSize);
            this.results.serverLogExcerpts.push({
              content: newContent,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn('Log monitoring error:', error.message);
        }
      }, 1000)
    };
  }

  /**
   * Stop log monitoring
   */
  stopLogMonitoring(logMonitor) {
    if (logMonitor && logMonitor.interval) {
      clearInterval(logMonitor.interval);
    }
  }

  /**
   * Capture screenshot with timestamp
   */
  async captureScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.config.screenshotsDir, filename);
    
    await page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    this.results.screenshots.push({
      name: name,
      filename: filename,
      filepath: filepath,
      timestamp: new Date().toISOString()
    });

    return filepath;
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const reportData = {
      ...this.results,
      metadata: {
        agentVersion: '1.0.0',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Save JSON report
    const reportFilename = `test-report-${this.results.testType}-${Date.now()}.json`;
    const reportPath = path.join('./test-results', reportFilename);
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // Generate summary
    const summary = this.generateSummary(reportData);
    console.log(summary);
    
    return {
      success: this.results.status === 'passed',
      report: reportData,
      reportPath: reportPath,
      summary: summary
    };
  }

  /**
   * Generate human-readable test summary
   */
  generateSummary(reportData) {
    const { status, duration, errors, screenshots, stepResults } = reportData;
    
    let summary = `\n${'='.repeat(60)}\n`;
    summary += `🧪 TEST REPORT: ${reportData.testType.toUpperCase()}\n`;
    summary += `${'='.repeat(60)}\n`;
    summary += `Status: ${status === 'passed' ? '✅ PASSED' : '❌ FAILED'}\n`;
    summary += `Duration: ${duration}ms\n`;
    summary += `Screenshots: ${screenshots.length}\n`;
    summary += `Errors: ${errors.length}\n`;
    summary += `Steps Completed: ${stepResults.length}\n`;
    
    if (errors.length > 0) {
      summary += `\n❌ ERRORS:\n`;
      errors.slice(0, 3).forEach((error, i) => {
        summary += `${i + 1}. ${error.message || error.text}\n`;
      });
      if (errors.length > 3) {
        summary += `... and ${errors.length - 3} more errors\n`;
      }
    }
    
    if (stepResults.length > 0) {
      summary += `\n📋 STEP RESULTS:\n`;
      stepResults.forEach((step, i) => {
        const status = step.success ? '✅' : '❌';
        summary += `${i + 1}. ${status} ${step.name} (${step.duration}ms)\n`;
      });
    }
    
    if (screenshots.length > 0) {
      summary += `\n📷 SCREENSHOTS:\n`;
      screenshots.forEach(screenshot => {
        summary += `- ${screenshot.name}: ${screenshot.filepath}\n`;
      });
    }
    
    summary += `\n📊 Full report saved to: ${reportData.reportPath || 'test-results/'}\n`;
    summary += `${'='.repeat(60)}\n`;
    
    return summary;
  }

  /**
   * CLI entry point
   */
  static async main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const testType = args[1];
    const options = {};
    
    // Parse additional options
    for (let i = 2; i < args.length; i += 2) {
      if (args[i] && args[i].startsWith('--')) {
        const key = args[i].replace('--', '');
        const value = args[i + 1] || true;
        options[key] = value;
      }
    }
    
    if (!command || (command === 'run' && !testType)) {
      console.log(`
🧪 AkemisFlow Test Agent

Usage:
  node agents/test-agent.js run <test-type> [options]
  node agents/test-agent.js suite [test-types] [options]
  node agents/test-agent.js list
  node agents/test-agent.js help

Test Types:
  airwallex-sync     - Test Airwallex synchronization functionality
  contractor-crud    - Test contractor CRUD operations
  auth-flow         - Test authentication flow
  navigation        - Test general navigation
  ui-interactions   - Test UI component interactions
  layout-validation - Test UI layout and alignment issues

Options:
  --headless true   - Run browser in headless mode
  --timeout 30000   - Set test timeout in milliseconds
  --server-log path - Path to server log file to monitor

Examples:
  node agents/test-agent.js run airwallex-sync
  node agents/test-agent.js run layout-validation --tolerance 5
  node agents/test-agent.js suite airwallex-sync,layout-validation
  node agents/test-agent.js suite --includeLayoutValidation true
      `);
      process.exit(1);
    }

    try {
      const agent = new AkemisFlowTestAgent();
      
      if (command === 'list') {
        console.log('Available test types:', Object.keys(agent.testModules));
        return;
      }
      
      if (command === 'run') {
        const result = await agent.runTest(testType, options);
        process.exit(result.success ? 0 : 1);
      }
      
      if (command === 'suite') {
        // Run multiple tests as a suite
        const testTypes = testType ? testType.split(',') : ['airwallex-sync', 'layout-validation'];
        const result = await agent.runTestSuite(testTypes, options);
        process.exit(result.overallStatus === 'passed' ? 0 : 1);
      }
      
    } catch (error) {
      console.error('❌ Test agent error:', error.message);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  AkemisFlowTestAgent.main().catch(console.error);
}

module.exports = AkemisFlowTestAgent;