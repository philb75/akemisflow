#!/usr/bin/env node

/**
 * Change Request Orchestrator Agent
 * 
 * This agent orchestrates the entire development workflow:
 * 1. Understands requirements
 * 2. Creates test plans
 * 3. Coordinates developer and tester agents
 * 4. Validates completion
 * 
 * Model: Claude Opus
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const crypto = require('crypto');

class ChangeRequestOrchestrator {
  constructor() {
    this.requestId = crypto.randomBytes(8).toString('hex');
    this.requirementsPath = path.join(__dirname, 'requirements');
    this.testPlansPath = path.join(__dirname, 'test-plans');
    this.contextPath = path.join(__dirname, '../shared/akemisflow-context.md');
    this.currentRequest = null;
    this.requirements = [];
    this.testPlan = [];
    this.attempts = 0;
    this.maxAttempts = 3;
  }

  async initialize() {
    // Ensure directories exist
    await fs.mkdir(this.requirementsPath, { recursive: true });
    await fs.mkdir(this.testPlansPath, { recursive: true });
    
    // Load application context
    this.appContext = await fs.readFile(this.contextPath, 'utf-8');
    
    console.log('🎭 Orchestrator initialized with request ID:', this.requestId);
  }

  /**
   * Main orchestration flow
   */
  async orchestrate(userRequest) {
    console.log('\n🎯 Starting orchestration for request:', userRequest);
    
    try {
      // Step 1: Understand and analyze request
      await this.analyzeRequest(userRequest);
      
      // Step 2: Generate requirements
      await this.generateRequirements();
      
      // Step 3: Create test plan
      await this.createTestPlan();
      
      // Step 4: Execute development cycle
      let success = false;
      while (!success && this.attempts < this.maxAttempts) {
        this.attempts++;
        console.log(`\n🔄 Development attempt ${this.attempts}/${this.maxAttempts}`);
        
        // Trigger developer agent
        const changeManifest = await this.triggerDeveloper();
        
        // Trigger tester agent
        const testResults = await this.triggerTester(changeManifest);
        
        // Validate results
        success = await this.validateResults(testResults);
        
        if (!success) {
          console.log('❌ Tests failed, preparing retry...');
          await this.prepareRetry(testResults);
        }
      }
      
      if (success) {
        console.log('\n✅ Change request completed successfully!');
        await this.finalizeRequest();
      } else {
        console.log('\n❌ Change request failed after maximum attempts');
        await this.handleFailure();
      }
      
    } catch (error) {
      console.error('🚨 Orchestration error:', error);
      await this.handleError(error);
    }
  }

  /**
   * Analyze the user's request and determine scope
   */
  async analyzeRequest(userRequest) {
    console.log('🔍 Analyzing request...');
    
    this.currentRequest = {
      id: this.requestId,
      original: userRequest,
      timestamp: new Date().toISOString(),
      analysis: {}
    };
    
    // Determine affected areas
    const affectedAreas = this.detectAffectedAreas(userRequest);
    
    // Determine deployment mode relevance
    const deploymentMode = this.detectDeploymentMode(userRequest);
    
    // Check for ambiguities
    const ambiguities = this.detectAmbiguities(userRequest);
    
    this.currentRequest.analysis = {
      affectedAreas,
      deploymentMode,
      ambiguities,
      complexity: this.assessComplexity(userRequest)
    };
    
    // Ask clarifying questions if needed
    if (ambiguities.length > 0) {
      await this.askClarifyingQuestions(ambiguities);
    }
    
    console.log('📊 Analysis complete:', this.currentRequest.analysis);
  }

  /**
   * Generate structured requirements from the request
   */
  async generateRequirements() {
    console.log('📝 Generating requirements...');
    
    const requirements = [];
    const { original, analysis } = this.currentRequest;
    
    // Parse request into requirements
    if (analysis.affectedAreas.includes('ui')) {
      requirements.push({
        id: `R${requirements.length + 1}`,
        type: 'ui',
        description: this.extractUIRequirement(original),
        priority: 'high',
        testable: true
      });
    }
    
    if (analysis.affectedAreas.includes('database')) {
      requirements.push({
        id: `R${requirements.length + 1}`,
        type: 'database',
        description: this.extractDatabaseRequirement(original),
        priority: 'high',
        testable: true
      });
    }
    
    if (analysis.affectedAreas.includes('api')) {
      requirements.push({
        id: `R${requirements.length + 1}`,
        type: 'api',
        description: this.extractAPIRequirement(original),
        priority: 'high',
        testable: true
      });
    }
    
    this.requirements = requirements;
    
    // Save requirements to file
    const requirementsDoc = this.formatRequirementsDocument();
    await fs.writeFile(
      path.join(this.requirementsPath, `${this.requestId}.md`),
      requirementsDoc
    );
    
    console.log(`✅ Generated ${requirements.length} requirements`);
  }

  /**
   * Create a test plan based on requirements
   */
  async createTestPlan() {
    console.log('🧪 Creating test plan...');
    
    const testPlan = [];
    
    for (const req of this.requirements) {
      if (req.testable) {
        const tests = this.generateTestsForRequirement(req);
        testPlan.push(...tests);
      }
    }
    
    this.testPlan = testPlan;
    
    // Save test plan to file
    const testPlanDoc = this.formatTestPlanDocument();
    await fs.writeFile(
      path.join(this.testPlansPath, `${this.requestId}.md`),
      testPlanDoc
    );
    
    console.log(`✅ Created test plan with ${testPlan.length} tests`);
  }

  /**
   * Trigger the developer agent
   */
  async triggerDeveloper() {
    console.log('👨‍💻 Triggering developer agent...');
    
    const model = this.attempts > 1 ? 'opus' : 'sonnet';
    console.log(`   Using model: ${model} (attempt ${this.attempts})`);
    
    const developerInput = {
      requestId: this.requestId,
      requirements: this.requirements,
      context: this.currentRequest.analysis,
      model: model,
      previousAttempts: this.attempts - 1
    };
    
    // Call developer agent with orchestration flag
    const command = `ORCHESTRATION=true node ${path.join(__dirname, '../developer/code-developer.js')} '${JSON.stringify(developerInput)}'`;
    
    try {
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      const result = JSON.parse(stdout);
      
      console.log('✅ Developer agent completed');
      return result.changeManifest;
      
    } catch (error) {
      console.error('❌ Developer agent failed:', error);
      throw error;
    }
  }

  /**
   * Trigger the tester agent
   */
  async triggerTester(changeManifest) {
    console.log('🧪 Triggering tester agent...');
    
    const testerInput = {
      requestId: this.requestId,
      testPlan: this.testPlan,
      changeManifest: changeManifest,
      requirements: this.requirements
    };
    
    // Call tester agent with orchestration flag
    const command = `ORCHESTRATION=true node ${path.join(__dirname, '../tester/validation-tester.js')} '${JSON.stringify(testerInput)}'`;
    
    try {
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      const result = JSON.parse(stdout);
      
      console.log('✅ Tester agent completed');
      return result.testResults;
      
    } catch (error) {
      console.error('❌ Tester agent failed:', error);
      throw error;
    }
  }

  /**
   * Validate test results against requirements
   */
  async validateResults(testResults) {
    console.log('🔍 Validating results...');
    
    const allPassed = testResults.every(test => test.status === 'pass');
    const passRate = testResults.filter(t => t.status === 'pass').length / testResults.length;
    
    console.log(`   Pass rate: ${(passRate * 100).toFixed(1)}%`);
    
    if (allPassed) {
      console.log('✅ All tests passed!');
      return true;
    }
    
    // Analyze failures
    const failures = testResults.filter(t => t.status === 'fail');
    console.log(`❌ ${failures.length} tests failed:`);
    failures.forEach(f => {
      console.log(`   - ${f.name}: ${f.details.reason}`);
    });
    
    return false;
  }

  /**
   * Prepare for retry after failure
   */
  async prepareRetry(testResults) {
    console.log('🔄 Preparing retry strategy...');
    
    // Analyze failure patterns
    const failureAnalysis = this.analyzeFailures(testResults);
    
    // Update requirements with failure context
    this.requirements = this.requirements.map(req => ({
      ...req,
      failureContext: failureAnalysis[req.id] || null
    }));
    
    // Add specific fix requirements
    const fixRequirements = this.generateFixRequirements(failureAnalysis);
    this.requirements.push(...fixRequirements);
    
    console.log(`📝 Added ${fixRequirements.length} fix requirements`);
  }

  /**
   * Finalize successful request
   */
  async finalizeRequest() {
    console.log('🎉 Finalizing request...');
    
    const summary = {
      requestId: this.requestId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      originalRequest: this.currentRequest.original,
      requirements: this.requirements.length,
      testsRun: this.testPlan.length,
      attempts: this.attempts,
      result: 'success'
    };
    
    // Save summary
    await fs.writeFile(
      path.join(__dirname, `summary-${this.requestId}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Request finalized successfully');
  }

  /**
   * Handle complete failure
   */
  async handleFailure() {
    console.log('💔 Handling failure...');
    
    const summary = {
      requestId: this.requestId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      originalRequest: this.currentRequest.original,
      requirements: this.requirements.length,
      testsRun: this.testPlan.length,
      attempts: this.attempts,
      result: 'failure',
      recommendation: 'Manual intervention required'
    };
    
    // Save failure summary
    await fs.writeFile(
      path.join(__dirname, `failure-${this.requestId}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('📋 Failure report saved');
  }

  // Helper methods

  detectAffectedAreas(request) {
    const areas = [];
    const lower = request.toLowerCase();
    
    if (lower.includes('ui') || lower.includes('layout') || lower.includes('button') || 
        lower.includes('field') || lower.includes('align') || lower.includes('comment')) {
      areas.push('ui');
    }
    
    if (lower.includes('database') || lower.includes('schema') || lower.includes('field') ||
        lower.includes('column') || lower.includes('table')) {
      areas.push('database');
    }
    
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) {
      areas.push('api');
    }
    
    if (lower.includes('contractor') || lower.includes('airwallex')) {
      areas.push('contractor');
    }
    
    return areas.length > 0 ? areas : ['general'];
  }

  detectDeploymentMode(request) {
    const lower = request.toLowerCase();
    
    if (lower.includes('production') || lower.includes('supabase')) {
      return 'remote';
    }
    
    if (lower.includes('local') || lower.includes('docker')) {
      return 'local';
    }
    
    return 'all'; // Applies to all modes
  }

  detectAmbiguities(request) {
    const ambiguities = [];
    
    // Check for vague terms
    if (request.includes('fix') && !request.includes('what')) {
      ambiguities.push('What specifically needs to be fixed?');
    }
    
    if (request.includes('align') && !request.includes('with')) {
      ambiguities.push('What should the alignment match?');
    }
    
    if (request.includes('change') && !request.includes('to')) {
      ambiguities.push('What should it be changed to?');
    }
    
    return ambiguities;
  }

  assessComplexity(request) {
    const words = request.split(' ').length;
    const affectedAreas = this.detectAffectedAreas(request).length;
    
    if (words < 10 && affectedAreas === 1) return 'simple';
    if (words < 30 && affectedAreas <= 2) return 'moderate';
    return 'complex';
  }

  async askClarifyingQuestions(questions) {
    console.log('\n❓ Clarification needed:');
    questions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });
    
    // In a real implementation, this would interact with the user
    // For now, we'll continue with assumptions
    console.log('   (Continuing with best guess...)\n');
  }

  extractUIRequirement(request) {
    // Extract UI-specific requirements
    return `UI changes as specified: ${request}`;
  }

  extractDatabaseRequirement(request) {
    // Extract database-specific requirements
    return `Database modifications as specified: ${request}`;
  }

  extractAPIRequirement(request) {
    // Extract API-specific requirements
    return `API updates as specified: ${request}`;
  }

  generateTestsForRequirement(requirement) {
    const tests = [];
    
    switch (requirement.type) {
      case 'ui':
        tests.push({
          id: `T${tests.length + 1}`,
          name: `UI Layout Test for ${requirement.id}`,
          type: 'layout-validation',
          requirement: requirement.id,
          expectedResult: 'Visual elements properly aligned'
        });
        break;
        
      case 'database':
        tests.push({
          id: `T${tests.length + 1}`,
          name: `Database Test for ${requirement.id}`,
          type: 'database-validation',
          requirement: requirement.id,
          expectedResult: 'Schema changes applied and data integrity maintained'
        });
        break;
        
      case 'api':
        tests.push({
          id: `T${tests.length + 1}`,
          name: `API Test for ${requirement.id}`,
          type: 'api-validation',
          requirement: requirement.id,
          expectedResult: 'API responds correctly with expected data'
        });
        break;
    }
    
    return tests;
  }

  formatRequirementsDocument() {
    return `# Requirements Document
## Request ID: ${this.requestId}
## Date: ${new Date().toISOString()}

### Original Request
${this.currentRequest.original}

### Analysis
- **Affected Areas**: ${this.currentRequest.analysis.affectedAreas.join(', ')}
- **Deployment Mode**: ${this.currentRequest.analysis.deploymentMode}
- **Complexity**: ${this.currentRequest.analysis.complexity}

### Requirements
${this.requirements.map(req => `
#### ${req.id}: ${req.type.toUpperCase()}
- **Description**: ${req.description}
- **Priority**: ${req.priority}
- **Testable**: ${req.testable ? 'Yes' : 'No'}
`).join('\n')}

### Success Criteria
- All requirements implemented
- All tests passing
- No regression in existing functionality
`;
  }

  formatTestPlanDocument() {
    return `# Test Plan Document
## Request ID: ${this.requestId}
## Date: ${new Date().toISOString()}

### Test Overview
Total Tests: ${this.testPlan.length}

### Test Cases
${this.testPlan.map(test => `
#### ${test.id}: ${test.name}
- **Type**: ${test.type}
- **Requirement**: ${test.requirement}
- **Expected Result**: ${test.expectedResult}
`).join('\n')}

### Execution Strategy
1. Run all tests in sequence
2. Capture screenshots for UI tests
3. Validate data integrity for database tests
4. Check response codes for API tests
`;
  }

  analyzeFailures(testResults) {
    const analysis = {};
    
    testResults.filter(t => t.status === 'fail').forEach(test => {
      const reqId = test.requirement;
      if (!analysis[reqId]) {
        analysis[reqId] = {
          failures: [],
          patterns: []
        };
      }
      
      analysis[reqId].failures.push({
        test: test.name,
        reason: test.details.reason
      });
    });
    
    return analysis;
  }

  generateFixRequirements(failureAnalysis) {
    const fixReqs = [];
    
    Object.entries(failureAnalysis).forEach(([reqId, analysis]) => {
      fixReqs.push({
        id: `R${this.requirements.length + fixReqs.length + 1}`,
        type: 'fix',
        description: `Fix failures for ${reqId}: ${analysis.failures.map(f => f.reason).join(', ')}`,
        priority: 'critical',
        testable: true,
        originalRequirement: reqId
      });
    });
    
    return fixReqs;
  }

  async handleError(error) {
    console.error('🚨 Critical error in orchestration:', error);
    
    const errorReport = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context: this.currentRequest
    };
    
    await fs.writeFile(
      path.join(__dirname, `error-${this.requestId}.json`),
      JSON.stringify(errorReport, null, 2)
    );
  }
}

// CLI execution
if (require.main === module) {
  const userRequest = process.argv.slice(2).join(' ');
  
  if (!userRequest) {
    console.log('Usage: node change-request.js "your change request"');
    process.exit(1);
  }
  
  const orchestrator = new ChangeRequestOrchestrator();
  
  orchestrator.initialize()
    .then(() => orchestrator.orchestrate(userRequest))
    .then(() => {
      console.log('\n🎭 Orchestration complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = ChangeRequestOrchestrator;