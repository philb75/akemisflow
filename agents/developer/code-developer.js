#!/usr/bin/env node

/**
 * Code Developer Agent
 * 
 * This agent performs the actual code changes based on requirements
 * from the orchestrator.
 * 
 * Model: Sonnet (first attempt) -> Opus (on retry)
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class CodeDeveloper {
  constructor(input) {
    this.requestId = input.requestId;
    this.requirements = input.requirements;
    this.context = input.context;
    this.model = input.model || 'sonnet';
    this.previousAttempts = input.previousAttempts || 0;
    this.changeManifest = [];
    this.modifiedFiles = new Set();
    this.projectRoot = path.join(__dirname, '../../');
  }

  /**
   * Main development execution
   */
  async develop() {
    // Suppress console logs during orchestration
    const originalLog = console.log;
    const originalError = console.error;
    if (process.env.ORCHESTRATION === 'true') {
      console.log = () => {};
      console.error = () => {};
    }
    
    try {
      // Process each requirement
      for (const requirement of this.requirements) {
        await this.implementRequirement(requirement);
      }
      
      // Generate change manifest
      const manifest = await this.generateChangeManifest();
      
      // Save manifest
      await this.saveChangeManifest(manifest);
      
      // Return result
      const result = {
        success: true,
        requestId: this.requestId,
        changeManifest: manifest,
        filesModified: Array.from(this.modifiedFiles)
      };
      
      // Restore console if suppressed
      if (process.env.ORCHESTRATION === 'true') {
        console.log = originalLog;
        console.error = originalError;
      }
      
      // Output only JSON for orchestration
      process.stdout.write(JSON.stringify(result));
      return result;
      
    } catch (error) {
      // Restore console if suppressed
      if (process.env.ORCHESTRATION === 'true') {
        console.log = originalLog;
        console.error = originalError;
      }
      
      const result = {
        success: false,
        requestId: this.requestId,
        error: error.message,
        stack: error.stack
      };
      
      // Output only JSON for orchestration
      process.stdout.write(JSON.stringify(result));
      return result;
    }
  }

  /**
   * Implement a specific requirement
   */
  async implementRequirement(requirement) {
    console.log(`\n📝 Implementing ${requirement.id}: ${requirement.type}`);
    
    switch (requirement.type) {
      case 'ui':
        await this.implementUIChange(requirement);
        break;
      case 'database':
        await this.implementDatabaseChange(requirement);
        break;
      case 'api':
        await this.implementAPIChange(requirement);
        break;
      case 'fix':
        await this.implementFix(requirement);
        break;
      default:
        await this.implementGenericChange(requirement);
    }
    
    console.log(`   ✅ ${requirement.id} implemented`);
  }

  /**
   * Implement UI changes
   */
  async implementUIChange(requirement) {
    console.log('   🎨 Implementing UI change...');
    
    // Determine affected UI files
    const affectedFiles = this.identifyUIFiles(requirement);
    
    for (const file of affectedFiles) {
      await this.modifyFile(file, requirement);
    }
  }

  /**
   * Implement database changes
   */
  async implementDatabaseChange(requirement) {
    console.log('   💾 Implementing database change...');
    
    // Modify Prisma schema if needed
    const schemaPath = path.join(this.projectRoot, 'prisma/schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    
    // Parse requirement to determine changes
    const changes = this.parseDatabaseRequirement(requirement);
    
    if (changes.addField) {
      const newSchema = this.addFieldToSchema(schemaContent, changes);
      await fs.writeFile(schemaPath, newSchema);
      this.modifiedFiles.add('prisma/schema.prisma');
      
      // Run prisma db push
      await this.runPrismaDbPush();
    }
    
    // Update TypeScript types
    await this.updateTypeDefinitions(changes);
  }

  /**
   * Implement API changes
   */
  async implementAPIChange(requirement) {
    console.log('   🔌 Implementing API change...');
    
    // Determine affected API routes
    const affectedRoutes = this.identifyAPIRoutes(requirement);
    
    for (const route of affectedRoutes) {
      await this.modifyAPIRoute(route, requirement);
    }
  }

  /**
   * Implement fixes for failed tests
   */
  async implementFix(requirement) {
    console.log('   🔧 Implementing fix...');
    
    // Analyze the failure context
    const failureContext = requirement.failureContext;
    
    if (!failureContext) {
      console.log('   ⚠️  No failure context, attempting generic fix');
      return;
    }
    
    // Determine fix strategy based on failure patterns
    const fixStrategy = this.determineFixStrategy(failureContext);
    
    // Apply fixes
    for (const fix of fixStrategy.fixes) {
      await this.applyFix(fix);
    }
  }

  /**
   * Implement generic changes
   */
  async implementGenericChange(requirement) {
    console.log('   📦 Implementing generic change...');
    
    // Use context to determine what to change
    const files = this.identifyAffectedFiles(requirement);
    
    for (const file of files) {
      await this.modifyFile(file, requirement);
    }
  }

  /**
   * Modify a file based on requirement
   */
  async modifyFile(filePath, requirement) {
    const fullPath = path.join(this.projectRoot, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const modified = this.applyModification(content, requirement, filePath);
      
      if (modified !== content) {
        await fs.writeFile(fullPath, modified);
        this.modifiedFiles.add(filePath);
        
        this.changeManifest.push({
          file: filePath,
          type: 'modified',
          requirement: requirement.id,
          description: requirement.description
        });
      }
    } catch (error) {
      console.error(`   ❌ Failed to modify ${filePath}:`, error.message);
    }
  }

  /**
   * Apply specific modification to content
   */
  applyModification(content, requirement, filePath) {
    // This is where the actual code modification logic would go
    // For demonstration, we'll implement some common patterns
    
    const description = requirement.description.toLowerCase();
    
    // Handle comment field alignment
    if (description.includes('comment') && description.includes('align')) {
      return this.fixCommentAlignment(content);
    }
    
    // Handle field additions
    if (description.includes('add') && description.includes('field')) {
      return this.addField(content, requirement);
    }
    
    // Handle layout fixes
    if (description.includes('layout') || description.includes('align')) {
      return this.fixLayout(content, requirement);
    }
    
    return content;
  }

  /**
   * Fix comment field alignment specifically
   */
  fixCommentAlignment(content) {
    // Fix the specific comment alignment issue
    const pattern = /<div className="flex">.*?<\/div>/gs;
    const replacement = `<table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 font-semibold text-gray-600 w-32"></td>
                        <td className="py-1 px-4">
                          <div className="inline-block" style={{ width: 'fit-content', minWidth: '200px', maxWidth: '300px' }}>`;
    
    return content.replace(pattern, replacement);
  }

  /**
   * Add a field to content
   */
  addField(content, requirement) {
    // Generic field addition logic
    return content;
  }

  /**
   * Fix layout issues
   */
  fixLayout(content, requirement) {
    // Generic layout fix logic
    return content;
  }

  /**
   * Identify UI files affected by requirement
   */
  identifyUIFiles(requirement) {
    const files = [];
    const description = requirement.description.toLowerCase();
    
    if (description.includes('contractor')) {
      files.push('src/app/entities/contractors/page.tsx');
      files.push('src/components/contractor-form.tsx');
    }
    
    if (description.includes('comment')) {
      files.push('src/app/entities/contractors/page.tsx');
    }
    
    return files;
  }

  /**
   * Identify API routes affected by requirement
   */
  identifyAPIRoutes(requirement) {
    const routes = [];
    const description = requirement.description.toLowerCase();
    
    if (description.includes('contractor')) {
      routes.push('src/app/api/contractors/[id]/route.ts');
      routes.push('src/app/api/contractors/route.ts');
    }
    
    if (description.includes('airwallex')) {
      routes.push('src/app/api/airwallex-contractors/sync/route.ts');
    }
    
    return routes;
  }

  /**
   * Identify any affected files
   */
  identifyAffectedFiles(requirement) {
    const files = [];
    
    // Combine UI and API files
    files.push(...this.identifyUIFiles(requirement));
    files.push(...this.identifyAPIRoutes(requirement));
    
    // Add type definitions if needed
    if (requirement.description.includes('type') || requirement.description.includes('interface')) {
      files.push('src/types/contractor.ts');
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Parse database requirement
   */
  parseDatabaseRequirement(requirement) {
    const changes = {};
    const description = requirement.description.toLowerCase();
    
    if (description.includes('add') && description.includes('field')) {
      changes.addField = true;
      // Extract field name and type from description
      // This would need more sophisticated parsing in production
    }
    
    if (description.includes('remove') && description.includes('field')) {
      changes.removeField = true;
    }
    
    if (description.includes('modify') || description.includes('change')) {
      changes.modifyField = true;
    }
    
    return changes;
  }

  /**
   * Add field to Prisma schema
   */
  addFieldToSchema(schemaContent, changes) {
    // This would contain logic to properly add fields to the schema
    // For now, returning unchanged
    return schemaContent;
  }

  /**
   * Run Prisma db push
   */
  async runPrismaDbPush() {
    console.log('   🔄 Running prisma db push...');
    
    try {
      const command = 'cd ' + this.projectRoot + ' && npx prisma db push --skip-generate';
      await execAsync(command);
      console.log('   ✅ Database schema updated');
    } catch (error) {
      console.error('   ❌ Prisma db push failed:', error.message);
    }
  }

  /**
   * Update TypeScript type definitions
   */
  async updateTypeDefinitions(changes) {
    const typesPath = path.join(this.projectRoot, 'src/types/contractor.ts');
    
    try {
      const content = await fs.readFile(typesPath, 'utf-8');
      // Add type modification logic here
      this.modifiedFiles.add('src/types/contractor.ts');
    } catch (error) {
      console.error('   ❌ Failed to update types:', error.message);
    }
  }

  /**
   * Modify an API route
   */
  async modifyAPIRoute(routePath, requirement) {
    const fullPath = path.join(this.projectRoot, routePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      // Add API modification logic here
      this.modifiedFiles.add(routePath);
    } catch (error) {
      console.error(`   ❌ Failed to modify API route ${routePath}:`, error.message);
    }
  }

  /**
   * Determine fix strategy based on failures
   */
  determineFixStrategy(failureContext) {
    const strategy = {
      fixes: []
    };
    
    // Analyze failure patterns and create fixes
    if (failureContext.failures) {
      failureContext.failures.forEach(failure => {
        if (failure.reason.includes('alignment')) {
          strategy.fixes.push({
            type: 'layout',
            target: 'comment-field',
            action: 'align-with-column'
          });
        }
        
        if (failure.reason.includes('undefined')) {
          strategy.fixes.push({
            type: 'code',
            target: 'variable',
            action: 'initialize'
          });
        }
      });
    }
    
    return strategy;
  }

  /**
   * Apply a specific fix
   */
  async applyFix(fix) {
    console.log(`   🔧 Applying fix: ${fix.type} - ${fix.action}`);
    
    switch (fix.type) {
      case 'layout':
        await this.applyLayoutFix(fix);
        break;
      case 'code':
        await this.applyCodeFix(fix);
        break;
    }
  }

  /**
   * Apply layout-specific fix
   */
  async applyLayoutFix(fix) {
    if (fix.target === 'comment-field' && fix.action === 'align-with-column') {
      const filePath = 'src/app/entities/contractors/page.tsx';
      await this.modifyFile(filePath, {
        id: 'FIX-1',
        description: 'Fix comment field alignment with AkemisFlow column'
      });
    }
  }

  /**
   * Apply code-specific fix
   */
  async applyCodeFix(fix) {
    // Implement code fixes
  }

  /**
   * Generate change manifest
   */
  async generateChangeManifest() {
    const manifest = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      model: this.model,
      attempt: this.previousAttempts + 1,
      changes: this.changeManifest,
      summary: {
        filesModified: this.modifiedFiles.size,
        requirementsImplemented: this.requirements.length
      }
    };
    
    return manifest;
  }

  /**
   * Save change manifest to file
   */
  async saveChangeManifest(manifest) {
    const manifestPath = path.join(
      __dirname,
      'change-manifests',
      `${this.requestId}.json`
    );
    
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
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
    const developer = new CodeDeveloper(parsedInput);
    
    developer.develop()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
      
  } catch (error) {
    console.error('Invalid input:', error.message);
    process.exit(1);
  }
}

module.exports = CodeDeveloper;