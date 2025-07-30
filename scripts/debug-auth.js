#!/usr/bin/env node

/**
 * Debug Authentication Issues
 * Check how NextAuth queries users vs how we created them
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

class AuthDebugger {
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

  async checkUserTableStructure() {
    this.log('🔍 Checking users table structure...');
    
    try {
      const result = await this.client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      this.log('📊 Users table structure:');
      result.rows.forEach(row => {
        this.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) - default: ${row.column_default || 'none'}`);
      });
      
      return result.rows;
    } catch (error) {
      this.log(`❌ Error checking table structure: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async listAllUsers() {
    this.log('👥 Listing all users in database...');
    
    try {
      const result = await this.client.query(`
        SELECT id, name, email, role, password IS NOT NULL as has_password, 
               created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
      `);
      
      this.log(`📈 Found ${result.rows.length} users:`);
      result.rows.forEach((user, index) => {
        this.log(`   ${index + 1}. ${user.email}`);
        this.log(`      ID: ${user.id}`);
        this.log(`      Name: ${user.name}`);
        this.log(`      Role: ${user.role}`);
        this.log(`      Has Password: ${user.has_password}`);
        this.log(`      Created: ${user.created_at}`);
        this.log('');
      });
      
      return result.rows;
    } catch (error) {
      this.log(`❌ Error listing users: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testSpecificUser(email) {
    this.log(`🧪 Testing specific user: ${email}`);
    
    try {
      // Test exact query that NextAuth would use
      const result = await this.client.query(`
        SELECT id, name, email, password, role, created_at
        FROM users 
        WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        this.log(`❌ User not found with email: ${email}`, 'ERROR');
        return null;
      }
      
      const user = result.rows[0];
      this.log('✅ User found:');
      this.log(`   ID: ${user.id} (type: ${typeof user.id})`);
      this.log(`   Name: ${user.name}`);
      this.log(`   Email: ${user.email}`);
      this.log(`   Role: ${user.role}`);
      this.log(`   Password exists: ${user.password ? 'YES' : 'NO'}`);
      this.log(`   Password length: ${user.password ? user.password.length : 0} chars`);
      this.log(`   Created: ${user.created_at}`);
      
      return user;
    } catch (error) {
      this.log(`❌ Error testing user: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testPasswordHash(email, plainPassword) {
    this.log(`🔐 Testing password hash for: ${email}`);
    
    try {
      const result = await this.client.query(`
        SELECT password FROM users WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        this.log('❌ User not found', 'ERROR');
        return false;
      }
      
      const hashedPassword = result.rows[0].password;
      if (!hashedPassword) {
        this.log('❌ No password set for user', 'ERROR');
        return false;
      }
      
      this.log(`📊 Password hash starts with: ${hashedPassword.substring(0, 10)}...`);
      
      // Test bcrypt comparison
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      
      if (isValid) {
        this.log('✅ Password hash verification PASSED');
      } else {
        this.log('❌ Password hash verification FAILED', 'ERROR');
        
        // Test if it might be a different hash format
        this.log('🔍 Testing different hash formats...');
        
        // Test if it's a plain text password (shouldn't be, but let's check)
        if (hashedPassword === plainPassword) {
          this.log('⚠️ Password appears to be stored as plain text!', 'WARN');
        }
        
        // Check if it's a bcrypt hash format
        if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$')) {
          this.log('✅ Password is in bcrypt format');
        } else {
          this.log('❌ Password is not in bcrypt format', 'ERROR');
        }
      }
      
      return isValid;
    } catch (error) {
      this.log(`❌ Error testing password: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async createWorkingUser(email, password) {
    this.log(`🛠️ Creating a working user: ${email}`);
    
    try {
      // Delete existing user if exists
      await this.client.query('DELETE FROM users WHERE email = $1', [email]);
      this.log('🗑️ Deleted existing user if present');
      
      // Generate proper UUID
      const uuidResult = await this.client.query('SELECT gen_random_uuid() as uuid');
      const userId = uuidResult.rows[0].uuid;
      
      // Hash password with same settings as NextAuth
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user with exact structure NextAuth expects
      const result = await this.client.query(`
        INSERT INTO users (
          id, name, email, password, role, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, email, role, created_at
      `, [
        userId,
        'Philippe Barthelemy',
        email,
        hashedPassword,
        'ADMINISTRATOR',
        new Date(),
        new Date()
      ]);
      
      const user = result.rows[0];
      this.log(`✅ User created: ${user.email} (${user.role})`);
      this.log(`📍 User ID: ${user.id}`);
      
      // Verify the user was created correctly
      const verifyResult = await this.testSpecificUser(email);
      const passwordWorks = await this.testPasswordHash(email, password);
      
      return {
        user,
        verified: !!verifyResult,
        passwordWorks
      };
      
    } catch (error) {
      this.log(`❌ Error creating working user: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async run() {
    const startTime = Date.now();
    const email = 'philippe.barthelemy@akemis.com';
    const password = 'Philb123$';
    
    try {
      this.log('🚀 Starting authentication debugging...');
      
      await this.connect();
      
      // Check table structure
      await this.checkUserTableStructure();
      
      // List all users
      await this.listAllUsers();
      
      // Test specific user
      const user = await this.testSpecificUser(email);
      
      if (user) {
        // Test password
        const passwordWorks = await this.testPasswordHash(email, password);
        
        if (!passwordWorks) {
          this.log('🔧 Password verification failed - recreating user...');
          const newUser = await this.createWorkingUser(email, password);
          
          if (newUser.passwordWorks) {
            this.log('✅ New user created with working authentication');
          }
        }
      } else {
        this.log('👤 User not found - creating new user...');
        const newUser = await this.createWorkingUser(email, password);
        
        if (newUser.passwordWorks) {
          this.log('✅ New user created with working authentication');
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 Authentication debugging completed!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      this.log('');
      this.log('📋 TRY THESE CREDENTIALS:');
      this.log(`   Email: ${email}`);
      this.log(`   Password: ${password}`);
      this.log('');
      this.log('🔗 Login URL: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app');
      
      return {
        success: true,
        duration,
        message: 'Authentication debugging completed'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Debugging failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Authentication debugging failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute debugging
async function main() {
  const authDebugger = new AuthDebugger();
  
  try {
    const result = await authDebugger.run();
    
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

module.exports = AuthDebugger;