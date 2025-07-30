#!/usr/bin/env node

/**
 * Fix User Authentication
 * Check and fix user credentials in production database
 */

const { Client } = require('pg');

class UserAuthFixer {
  constructor() {
    this.client = new Client({
      user: 'postgres.wflcaapznpczlxjaeyfd',
      password: 'Philb921056$',
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
  }

  async connect() {
    await this.client.connect();
    this.log('✅ Connected to database');
  }

  async disconnect() {
    await this.client.end();
    this.log('🔌 Disconnected from database');
  }

  async checkCurrentUsers() {
    this.log('👥 Checking current users...');
    
    try {
      const result = await this.client.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at');
      
      this.log(`📊 Found ${result.rows.length} users:`);
      result.rows.forEach(user => {
        this.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
      });
      
      return result.rows;
    } catch (error) {
      this.log(`❌ Error checking users: ${error.message}`, 'ERROR');
      return [];
    }
  }

  async checkAuthTables() {
    this.log('🔍 Checking authentication tables...');
    
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const table of tables) {
      try {
        const result = await this.client.query(`SELECT COUNT(*) as count FROM ${table}`);
        this.log(`   ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        this.log(`   ${table}: ERROR - ${error.message}`, 'ERROR');
      }
    }
  }

  async createTestUser() {
    this.log('👤 Creating test user with proper UUID...');
    
    try {
      // Generate a proper UUID
      const result = await this.client.query('SELECT gen_random_uuid() as uuid');
      const userId = result.rows[0].uuid;
      
      // Insert user with proper UUID
      await this.client.query(`
        INSERT INTO users (id, name, email, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          id = EXCLUDED.id,
          role = EXCLUDED.role,
          updated_at = EXCLUDED.updated_at
      `, [
        userId,
        'Philippe Barthelemy',
        'philb75@gmail.com',
        'ADMINISTRATOR',
        new Date(),
        new Date()
      ]);
      
      this.log(`✅ Created/updated admin user with ID: ${userId}`);
      return userId;
    } catch (error) {
      this.log(`❌ Error creating user: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async checkNextAuthConfiguration() {
    this.log('🔧 Checking NextAuth configuration...');
    
    // Check if we need to create a sample account for OAuth/email auth
    try {
      const accountCount = await this.client.query('SELECT COUNT(*) as count FROM accounts');
      this.log(`📊 Accounts table has ${accountCount.rows[0].count} records`);
      
      if (accountCount.rows[0].count === 0) {
        this.log('⚠️ No accounts found - NextAuth might need OAuth or email verification', 'WARN');
        this.log('💡 Recommendation: Use "Sign in with Email" on the login page');
      }
    } catch (error) {
      this.log(`❌ Error checking accounts: ${error.message}`, 'ERROR');
    }
  }

  async testDatabaseAuth() {
    this.log('🧪 Testing database authentication methods...');
    
    try {
      // Check if we can create a session
      const sessionResult = await this.client.query('SELECT gen_random_uuid() as session_token');
      const sessionToken = sessionResult.rows[0].session_token;
      
      this.log(`✅ Database can generate session tokens: ${sessionToken.substring(0, 8)}...`);
      
      // Check password hashing capability (if bcrypt functions exist)
      try {
        await this.client.query("SELECT crypt('test', gen_salt('bf'))");
        this.log('✅ Database has password hashing capabilities');
      } catch (error) {
        this.log('⚠️ Database does not have bcrypt extension - passwords handled by NextAuth', 'WARN');
      }
      
    } catch (error) {
      this.log(`❌ Database auth test failed: ${error.message}`, 'ERROR');
    }
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting user authentication fix...');
      
      await this.connect();
      
      // Check current state
      await this.checkAuthTables();
      const currentUsers = await this.checkCurrentUsers();
      
      // Create/fix admin user
      const adminUserId = await this.createTestUser();
      
      // Check NextAuth setup
      await this.checkNextAuthConfiguration();
      
      // Test auth capabilities
      await this.testDatabaseAuth();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 User authentication check completed!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      
      // Provide login instructions
      this.log('📋 LOGIN INSTRUCTIONS:');
      this.log('1. Go to: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app');
      this.log('2. Click "Sign in with Email" (not password login)');
      this.log('3. Enter email: philb75@gmail.com');
      this.log('4. Check your email for the magic link');
      this.log('5. Click the magic link to authenticate');
      this.log('');
      this.log('💡 The app uses NextAuth with email-based authentication');
      this.log('💡 Traditional password login may not be configured');
      
      return {
        success: true,
        duration,
        adminUserId,
        userCount: currentUsers.length + 1,
        authMethod: 'email-magic-link',
        message: 'User authentication fixed - use email magic link'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Auth fix failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'User authentication fix failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute fix
async function main() {
  const fixer = new UserAuthFixer();
  
  try {
    const result = await fixer.run();
    
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = UserAuthFixer;