#!/usr/bin/env node

/**
 * AkemisFlow Test Runner
 * Convenient script to run various test scenarios
 */

const { spawn } = require('child_process');
const path = require('path');

const TEST_AGENT_PATH = './agents/test-agent.js';

class TestRunner {
  constructor() {
    this.scenarios = {
      'quick': {
        name: 'Quick Test',
        description: 'Run basic navigation and UI tests',
        tests: ['navigation', 'ui-interactions']
      },
      'auth': {
        name: 'Authentication Test',
        description: 'Test user authentication flow',
        tests: ['auth-flow']
      },
      'airwallex': {
        name: 'Airwallex Integration Test',
        description: 'Test Airwallex synchronization',
        tests: ['airwallex-sync']
      },
      'crud': {
        name: 'CRUD Operations Test',
        description: 'Test contractor CRUD operations',
        tests: ['contractor-crud']
      },
      'full': {
        name: 'Full Test Suite',
        description: 'Run all available tests',
        tests: ['auth-flow', 'navigation', 'contractor-crud', 'airwallex-sync', 'ui-interactions']
      }
    };
  }

  async runTest(testType, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['run', testType];
      
      // Add options as command line arguments
      Object.entries(options).forEach(([key, value]) => {
        args.push(`--${key}`, value.toString());
      });

      console.log(`🚀 Running test: ${testType}`);
      console.log(`📝 Command: node ${TEST_AGENT_PATH} ${args.join(' ')}`);

      const testProcess = spawn('node', [TEST_AGENT_PATH, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Test ${testType} completed successfully`);
          resolve({ success: true, code });
        } else {
          console.log(`❌ Test ${testType} failed with exit code ${code}`);
          resolve({ success: false, code });
        }
      });

      testProcess.on('error', (error) => {
        console.error(`❌ Error running test ${testType}:`, error.message);
        reject(error);
      });
    });
  }

  async runScenario(scenarioName, options = {}) {
    if (!this.scenarios[scenarioName]) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    const scenario = this.scenarios[scenarioName];
    console.log(`\n🎬 Starting scenario: ${scenario.name}`);
    console.log(`📋 Description: ${scenario.description}`);
    console.log(`🧪 Tests: ${scenario.tests.join(', ')}\n`);

    const results = [];
    let totalDuration = 0;

    for (const testType of scenario.tests) {
      const startTime = Date.now();
      
      try {
        const result = await this.runTest(testType, options);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.push({
          test: testType,
          success: result.success,
          duration: duration,
          code: result.code
        });
        
        totalDuration += duration;
        
        console.log(`⏱️  ${testType} completed in ${duration}ms\n`);
        
      } catch (error) {
        results.push({
          test: testType,
          success: false,
          duration: 0,
          error: error.message
        });
        
        console.log(`❌ ${testType} failed: ${error.message}\n`);
      }
    }

    // Generate scenario report
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / results.length) * 100;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SCENARIO REPORT: ${scenario.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Tests Run: ${results.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${results.length - successCount}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(totalDuration / results.length)}ms`);
    
    console.log(`\n📋 DETAILED RESULTS:`);
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test} (${result.duration}ms)${result.error ? ` - ${result.error}` : ''}`);
    });
    
    console.log(`${'='.repeat(60)}\n`);

    return {
      scenario: scenarioName,
      results: results,
      successRate: successRate,
      totalDuration: totalDuration
    };
  }

  showHelp() {
    console.log(`
🧪 AkemisFlow Test Runner

Usage:
  node test-runner.js <command> [options]

Commands:
  test <test-type>      Run a single test type
  scenario <scenario>   Run a predefined test scenario
  list                  List available tests and scenarios
  help                  Show this help message

Single Test Types:
  airwallex-sync       Test Airwallex synchronization functionality
  contractor-crud      Test contractor CRUD operations
  auth-flow           Test authentication flow
  navigation          Test general navigation
  ui-interactions     Test UI component interactions

Test Scenarios:
`);
    
    Object.entries(this.scenarios).forEach(([key, scenario]) => {
      console.log(`  ${key.padEnd(18)} ${scenario.description}`);
      console.log(`${''.padEnd(20)} Tests: ${scenario.tests.join(', ')}`);
    });

    console.log(`
Options:
  --headless true      Run browser in headless mode
  --timeout 30000      Set test timeout in milliseconds
  --server-log path    Path to server log file to monitor

Examples:
  node test-runner.js test airwallex-sync
  node test-runner.js scenario quick
  node test-runner.js scenario full --headless true
  node test-runner.js test contractor-crud --timeout 60000
    `);
  }

  async main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const target = args[1];
    
    // Parse options
    const options = {};
    for (let i = 2; i < args.length; i += 2) {
      if (args[i] && args[i].startsWith('--')) {
        const key = args[i].replace('--', '');
        const value = args[i + 1] || true;
        options[key] = value;
      }
    }

    try {
      switch (command) {
        case 'test':
          if (!target) {
            console.error('❌ Please specify a test type');
            this.showHelp();
            process.exit(1);
          }
          await this.runTest(target, options);
          break;

        case 'scenario':
          if (!target) {
            console.error('❌ Please specify a scenario');
            this.showHelp();
            process.exit(1);
          }
          const scenarioResult = await this.runScenario(target, options);
          process.exit(scenarioResult.successRate === 100 ? 0 : 1);
          break;

        case 'list':
          console.log('\n🧪 Available Test Types:');
          console.log('  airwallex-sync, contractor-crud, auth-flow, navigation, ui-interactions\n');
          
          console.log('🎬 Available Scenarios:');
          Object.entries(this.scenarios).forEach(([key, scenario]) => {
            console.log(`  ${key}: ${scenario.description}`);
          });
          console.log('');
          break;

        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Test runner error:', error.message);
      process.exit(1);
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.main().catch(console.error);
}

module.exports = TestRunner;