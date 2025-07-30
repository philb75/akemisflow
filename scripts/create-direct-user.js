#!/usr/bin/env node

/**
 * Create User Directly via API
 * Create a user account bypassing the problematic Prisma layer
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

class DirectUserCreator {
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

  async createUser(userData) {
    const { email, password, name, firstName, lastName } = userData;
    
    this.log(`👤 Creating user: ${email}`);
    
    try {
      // Check if user already exists
      const existingUser = await this.client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        this.log(`⚠️ User already exists: ${email}`, 'WARN');
        return existingUser.rows[0];
      }
      
      // Generate UUID and hash password
      const uuidResult = await this.client.query('SELECT gen_random_uuid() as uuid');
      const userId = uuidResult.rows[0].uuid;
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user with all required fields
      const result = await this.client.query(`
        INSERT INTO users (
          id, name, email, password, role, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, email, role, created_at
      `, [
        userId,
        name,
        email,
        hashedPassword,
        'ADMINISTRATOR', // Give admin role
        new Date(),
        new Date()
      ]);
      
      const user = result.rows[0];
      this.log(`✅ User created successfully: ${user.email} (${user.role})`);
      this.log(`📍 User ID: ${user.id}`);
      
      return user;
    } catch (error) {
      this.log(`❌ Error creating user: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async verifyLogin(email, password) {
    this.log(`🧪 Testing login for: ${email}`);
    
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
      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        this.log('✅ Login verification successful');
        this.log(`👤 User: ${user.email} (${user.role})`);
        return true;
      } else {
        this.log('❌ Password verification failed', 'ERROR');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error verifying login: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async run() {
    const startTime = Date.now();
    
    // Use the same data from the signup form
    const userData = {
      email: 'philippe.barthelemy@akemis.com',
      password: 'Philb123$',
      name: 'Philippe Barthelemy',
      firstName: 'Philippe',
      lastName: 'BARTHELEMY'
    };
    
    try {
      this.log('🚀 Starting direct user creation...');
      
      await this.connect();
      
      // Create the user
      const user = await this.createUser(userData);
      
      // Verify login works
      const loginWorks = await this.verifyLogin(userData.email, userData.password);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      this.log('🎉 Direct user creation completed!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      
      if (loginWorks) {
        this.log('📋 LOGIN CREDENTIALS:');
        this.log(`   Email: ${userData.email}`);
        this.log(`   Password: ${userData.password}`);
        this.log('');
        this.log('🔗 Login URL: https://akemisflow-g0doyamax-philippe-barthelemys-projects.vercel.app');
        this.log('');
        this.log('✅ You can now login directly without signup!');
      }
      
      return {
        success: true,
        duration,
        user,
        loginVerified: loginWorks,
        message: 'User created successfully via direct database access'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 User creation failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Direct user creation failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute user creation
async function main() {
  const creator = new DirectUserCreator();
  
  try {
    const result = await creator.run();
    
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

module.exports = DirectUserCreator;