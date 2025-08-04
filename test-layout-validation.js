#!/usr/bin/env node

/**
 * Layout Validation Test Runner
 * Specialized script for running layout and alignment validation tests
 * Focuses on contractor expanded views and comment field positioning issues
 */

const AkemisFlowTestAgent = require('./agents/test-agent');

class LayoutValidationRunner {
  constructor() {
    this.scenarios = {
      'comment-alignment': {
        description: 'Validate comment field alignment with AkemisFlow column only',
        tests: ['layout-validation'],
        options: {
          validateCommentFields: true,
          tolerance: 5,
          maxCommentFieldWidth: null // Auto-detect
        }
      },
      
      'expanded-view-layout': {
        description: 'Test layout issues in expanded contractor views',
        tests: ['airwallex-sync'],
        options: {
          includeLayoutValidation: true,
          layoutValidation: {
            validateExpandedViews: true,
            screenshotComparisons: true
          }
        }
      },
      
      'full-layout-audit': {
        description: 'Comprehensive layout validation across all contractor features',
        tests: ['airwallex-sync', 'layout-validation'],
        options: {
          includeLayoutValidation: true,
          tolerance: 10,
          validateTableStructure: true,
          validateCommentFields: true,
          validateColumnAlignment: true
        }
      },
      
      'column-width-analysis': {
        description: 'Analyze column width consistency and alignment',
        tests: ['layout-validation'],
        options: {
          validateColumnAlignment: true,
          validateTableStructure: true,
          tolerance: 5
        }
      }
    };
  }

  async runScenario(scenarioName) {
    console.log(`🎯 Running layout validation scenario: ${scenarioName}`);
    
    const scenario = this.scenarios[scenarioName];
    if (!scenario) {
      console.error(`❌ Unknown scenario: ${scenarioName}`);
      console.log('Available scenarios:', Object.keys(this.scenarios).join(', '));
      return false;
    }
    
    console.log(`📋 Description: ${scenario.description}`);
    console.log(`🧪 Tests: ${scenario.tests.join(', ')}`);
    
    const agent = new AkemisFlowTestAgent();
    
    try {
      const result = await agent.runTestSuite(scenario.tests, scenario.options);
      
      // Generate layout-focused report
      console.log('\n' + '='.repeat(80));
      console.log(`📊 LAYOUT VALIDATION REPORT: ${scenarioName.toUpperCase()}`);
      console.log('='.repeat(80));
      
      // Overall status
      const statusIcon = result.overallStatus === 'passed' ? '✅' : '❌';
      console.log(`${statusIcon} Overall Status: ${result.overallStatus.toUpperCase()}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`🧪 Tests Run: ${result.tests.length}`);
      
      // Layout validation specific results
      if (result.layoutValidation) {
        const layout = result.layoutValidation;
        const metrics = layout.metrics?.layoutValidation || {};
        
        console.log('\n📐 LAYOUT VALIDATION DETAILS:');
        console.log(`Total Issues: ${metrics.totalIssues || 0}`);
        
        if (metrics.criticalIssues > 0) {
          console.log(`🚨 Critical Issues: ${metrics.criticalIssues} (REQUIRES IMMEDIATE ATTENTION)`);
        }
        
        if (metrics.highIssues > 0) {
          console.log(`🔺 High Priority Issues: ${metrics.highIssues}`);
        }
        
        if (metrics.mediumIssues > 0) {
          console.log(`🔶 Medium Priority Issues: ${metrics.mediumIssues}`);
        }
        
        if (metrics.lowIssues > 0) {
          console.log(`🔷 Low Priority Issues: ${metrics.lowIssues}`);
        }
        
        // Specific issue types
        if (metrics.hasCommentFieldIssues) {
          console.log('💬 Comment field positioning issues detected');
        }
        
        if (metrics.hasColumnAlignmentIssues) {
          console.log('📏 Column alignment issues detected');
        }
        
        // Show top issues
        if (layout.layoutIssues && layout.layoutIssues.length > 0) {
          console.log('\n🔍 TOP LAYOUT ISSUES:');
          
          const criticalIssues = layout.layoutIssues.filter(i => i.severity === 'critical');
          const highIssues = layout.layoutIssues.filter(i => i.severity === 'high');
          
          [...criticalIssues.slice(0, 3), ...highIssues.slice(0, 2)].forEach((issue, index) => {
            const severityIcon = issue.severity === 'critical' ? '🚨' : '🔺';
            console.log(`${index + 1}. ${severityIcon} ${issue.type}: ${issue.message}`);
          });
          
          if (layout.layoutIssues.length > 5) {
            console.log(`... and ${layout.layoutIssues.length - 5} more issues`);
          }
        }
      }
      
      // Individual test results
      console.log('\n🧪 INDIVIDUAL TEST RESULTS:');
      result.tests.forEach((test, index) => {
        const statusIcon = test.status === 'passed' ? '✅' : '❌';
        console.log(`${index + 1}. ${statusIcon} ${test.testType} (${test.duration}ms)`);
        
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
      });
      
      // Recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (result.layoutValidation && result.layoutValidation.layoutIssues) {
        const commentIssues = result.layoutValidation.layoutIssues.filter(i => 
          i.type.includes('comment') && ['critical', 'high'].includes(i.severity)
        );
        
        if (commentIssues.length > 0) {
          console.log('1. 🎯 PRIORITY: Fix comment field alignment issues');
          console.log('   - Comment fields should align only with AkemisFlow column');
          console.log('   - Check CSS grid/flexbox properties for comment containers');
          console.log('   - Ensure comment fields don\'t span multiple table columns');
        }
        
        const structureIssues = result.layoutValidation.layoutIssues.filter(i => 
          i.type.includes('structure') || i.type.includes('alignment')
        );
        
        if (structureIssues.length > 0) {
          console.log('2. 📊 Review table structure and column alignment');
          console.log('   - Verify header-cell width consistency');
          console.log('   - Check for responsive design issues');
        }
        
        if (result.layoutValidation.layoutIssues.length === 0) {
          console.log('✅ No layout issues detected - UI alignment appears correct!');
        }
      }
      
      console.log('\n📷 Screenshots saved to: ./test-screenshots/');
      console.log('📁 Detailed reports saved to: ./test-results/');
      console.log('='.repeat(80));
      
      return result.overallStatus === 'passed';
      
    } catch (error) {
      console.error(`❌ Scenario execution failed: ${error.message}`);
      return false;
    }
  }

  async runAllScenarios() {
    console.log('🚀 Running all layout validation scenarios...\n');
    
    const results = {};
    let overallSuccess = true;
    
    for (const [scenarioName, scenario] of Object.entries(this.scenarios)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Starting scenario: ${scenarioName}`);
      console.log(`${'='.repeat(60)}`);
      
      try {
        const success = await this.runScenario(scenarioName);
        results[scenarioName] = { success, error: null };
        
        if (!success) {
          overallSuccess = false;
        }
        
        // Brief pause between scenarios
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Scenario ${scenarioName} failed: ${error.message}`);
        results[scenarioName] = { success: false, error: error.message };
        overallSuccess = false;
      }
    }
    
    // Summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 ALL SCENARIOS SUMMARY');
    console.log('='.repeat(80));
    
    Object.entries(results).forEach(([scenario, result]) => {
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} ${scenario}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const passedCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n📈 Overall: ${passedCount}/${totalCount} scenarios passed`);
    console.log(`Status: ${overallSuccess ? '✅ SUCCESS' : '❌ SOME FAILURES'}`);
    
    return overallSuccess;
  }

  showHelp() {
    console.log(`
🎯 Layout Validation Test Runner

Usage:
  node test-layout-validation.js <scenario>
  node test-layout-validation.js all
  node test-layout-validation.js list
  node test-layout-validation.js help

Available Scenarios:
`);
    
    Object.entries(this.scenarios).forEach(([name, scenario]) => {
      console.log(`  ${name.padEnd(25)} - ${scenario.description}`);
    });
    
    console.log(`
Examples:
  node test-layout-validation.js comment-alignment
  node test-layout-validation.js full-layout-audit
  node test-layout-validation.js all

This tool specifically tests for:
- Comment field alignment with correct table columns
- Expanded contractor view layout issues
- Column width consistency and alignment
- Table structure validation
- Visual layout problems that functional tests miss
    `);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const runner = new LayoutValidationRunner();
  
  if (!command || command === 'help') {
    runner.showHelp();
    return;
  }
  
  if (command === 'list') {
    console.log('Available scenarios:');
    Object.keys(runner.scenarios).forEach(name => {
      console.log(`  - ${name}`);
    });
    return;
  }
  
  if (command === 'all') {
    const success = await runner.runAllScenarios();
    process.exit(success ? 0 : 1);
    return;
  }
  
  if (runner.scenarios[command]) {
    const success = await runner.runScenario(command);
    process.exit(success ? 0 : 1);
  } else {
    console.error(`❌ Unknown scenario: ${command}`);
    console.log('Available scenarios:', Object.keys(runner.scenarios).join(', '));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = LayoutValidationRunner;