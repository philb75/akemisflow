#!/usr/bin/env node

/**
 * Add User Password
 * Add a hashed password to the admin user for credentials authentication
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

class UserPasswordAdder {
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

  async checkUserTable() {
    this.log('🔍 Checking users table structure...');
    
    try {
      const result = await this.client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map(row => row.column_name);
      this.log(`📊 Users table columns: ${columns.join(', ')}`);
      
      const hasPassword = columns.includes('password');
      if (!hasPassword) {
        this.log('⚠️ Password column missing - adding it...', 'WARN');
        await this.addPasswordColumn();
      } else {
        this.log('✅ Password column exists');
      }
      
      return hasPassword;
    } catch (error) {
      this.log(`❌ Error checking table: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async addPasswordColumn() {
    try {
      await this.client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT');
      this.log('✅ Added password column to users table');
    } catch (error) {
      this.log(`❌ Error adding password column: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async addUserPassword(email, password) {
    this.log(`🔐 Adding password for user: ${email}`);
    
    try {
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Update the user with the hashed password
      const result = await this.client.query(
        'UPDATE users SET password = $1, updated_at = $2 WHERE email = $3 RETURNING id, email, role',
        [hashedPassword, new Date(), email]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }
      
      const user = result.rows[0];
      this.log(`✅ Password added for user: ${user.email} (${user.role})`);
      this.log(`📍 User ID: ${user.id}`);
      
      return user;
    } catch (error) {
      this.log(`❌ Error adding password: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async verifyUserAuth(email, password) {
    this.log(`🧪 Testing authentication for: ${email}`);
    
    try {
      const result = await this.client.query(
        'SELECT id, email, password, role FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        this.log('❌ User not found', 'ERROR');
        return false;
      }
      
      const user = result.rows[0];
      if (!user.password) {
        this.log('❌ User has no password', 'ERROR');
        return false;
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        this.log('✅ Password verification successful');
        this.log(`👤 User: ${user.email} (${user.role})`);
        return true;
      } else {
        this.log('❌ Password verification failed', 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error verifying auth: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async run() {
    const startTime = Date.now();
    const email = 'philb75@gmail.com';
    const password = 'Philb123$';
    
    try {
      this.log('🚀 Starting user password addition...');
      
      await this.connect();
      
      // Check and fix table structure
      await this.checkUserTable();
      
      // Add password to user
      const user = await this.addUserPassword(email, password);
      
      // Verify the authentication works
      const authWorks = await this.verifyUserAuth(email, password);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 User password setup completed!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      
      if (authWorks) {
        this.log('📋 LOGIN CREDENTIALS:');
        this.log(`   Email: ${email}`);
        this.log(`   Password: ${password}`);
        this.log('');
        this.log('🔗 Login URL: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app');
        this.log('');
        this.log('✅ You can now login with email and password!');
      }
      
      return {
        success: true,
        duration,
        userId: user.id,
        email: user.email,
        role: user.role,
        authenticationTested: authWorks,
        message: 'User password added successfully'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Password setup failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'User password setup failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute password addition
async function main() {
  const adder = new UserPasswordAdder();
  
  try {
    const result = await adder.run();
    
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

module.exports = UserPasswordAdder;