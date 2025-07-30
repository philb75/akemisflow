#!/usr/bin/env node

/**
 * Fix and Import Data Script
 * Fix data compatibility issues and import successfully
 */

const { Client } = require('pg');

class DataFixer {
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

  async fixEnumValues() {
    this.log('🔧 Adding missing enum values...');
    
    try {
      // Add API to TransactionSource enum
      await this.client.query(`ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'API'`);
      this.log('✅ Added API to TransactionSource enum');
    } catch (error) {
      this.log(`⚠️ Could not add API enum: ${error.message}`, 'WARN');
    }
  }

  async insertContacts() {
    this.log('👥 Inserting contacts...');
    
    const contacts = [
      {
        id: '1ecca44f-faa1-451c-a093-68cc013e7367',
        contact_type: 'CLIENT_CONTACT',
        name: 'Hasni Alaoui Zineb',
        email: null,
        phone: null,
        status: 'ACTIVE',
        address_line1: '17, Cit AL OSRA COPERATIVE SAHAR IMB R apt 04',
        city: 'Sala Al Jadida',
        postal_code: '11100',
        country: 'MA',
        currency_preference: 'MAD'
      },
      {
        id: 'e4db3a87-f085-4a52-a6ac-498a19ee29e5',
        contact_type: 'CLIENT_CONTACT',
        name: 'Ouyang Feiyun',
        status: 'ACTIVE',
        city: 'Shanghai',
        postal_code: '201601',
        country: 'CN',
        currency_preference: 'USD'
      },
      {
        id: 'eaf87176-a181-4d57-9e0e-e82d98340c04',
        contact_type: 'CLIENT_COMPANY',
        name: 'COMIN\'IT',
        email: 'contact@cominav.com',
        status: 'ACTIVE',
        address_line1: '101 BOULEVARD ZERKTOUNI',
        city: 'CASABLANCA',
        postal_code: '20100',
        country: 'MA',
        currency_preference: 'EUR'
      }
    ];

    let insertedCount = 0;
    for (const contact of contacts) {
      try {
        await this.client.query(`
          INSERT INTO contacts (id, contact_type, name, email, phone, status, address_line1, city, postal_code, country, currency_preference)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          contact.id, contact.contact_type, contact.name, contact.email, contact.phone,
          contact.status, contact.address_line1, contact.city, contact.postal_code,
          contact.country, contact.currency_preference
        ]);
        insertedCount++;
      } catch (error) {
        this.log(`❌ Contact insert error: ${error.message}`, 'ERROR');
      }
    }
    
    this.log(`✅ Inserted ${insertedCount} contacts`);
  }

  async insertBankAccount() {
    this.log('🏦 Inserting bank account...');
    
    try {
      await this.client.query(`
        INSERT INTO bank_accounts (
          id, account_name, bank_name, account_number, currency, iban, 
          account_type, status, airwallex_account_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        'b8c0a5e0-8f3a-4b2c-9d1e-2f3a4b5c6d7e',
        'AkemisFlow Main Account',
        'Airwallex',
        'ACC-123456789',
        'EUR',
        null,
        'BUSINESS',
        'ACTIVE',
        'awx_acc_123456789',
        new Date(),
        new Date()
      ]);
      
      this.log('✅ Inserted bank account');
    } catch (error) {
      this.log(`❌ Bank account insert error: ${error.message}`, 'ERROR');
    }
  }

  async insertTransactions() {
    this.log('💰 Inserting sample transactions...');
    
    const transactions = [
      {
        id: 't1-' + Date.now(),
        bank_account_id: 'b8c0a5e0-8f3a-4b2c-9d1e-2f3a4b5c6d7e',
        transaction_type: 'CREDIT',
        amount: 1500.00,
        currency: 'EUR',
        description: 'Client payment for services',
        category: 'INVOICE_PAYMENT',
        status: 'COMPLETED',
        source: 'AIRWALLEX',
        transaction_date: '2025-01-15'
      },
      {
        id: 't2-' + Date.now(),
        bank_account_id: 'b8c0a5e0-8f3a-4b2c-9d1e-2f3a4b5c6d7e',
        transaction_type: 'DEBIT',
        amount: 800.00,
        currency: 'EUR',
        description: 'Consultant payment',
        category: 'CONSULTANT_PAYMENT',
        status: 'COMPLETED',
        source: 'AIRWALLEX',
        transaction_date: '2025-01-20'
      }
    ];

    let insertedCount = 0;
    for (const transaction of transactions) {
      try {
        await this.client.query(`
          INSERT INTO transactions (
            id, bank_account_id, transaction_type, amount, currency, description,
            category, status, source, transaction_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          transaction.id, transaction.bank_account_id, transaction.transaction_type,
          transaction.amount, transaction.currency, transaction.description,
          transaction.category, transaction.status, transaction.source,
          transaction.transaction_date, new Date(), new Date()
        ]);
        insertedCount++;
      } catch (error) {
        this.log(`❌ Transaction insert error: ${error.message}`, 'ERROR');
      }
    }
    
    this.log(`✅ Inserted ${insertedCount} transactions`);
  }

  async insertSuppliers() {
    this.log('🏢 Inserting suppliers...');
    
    const suppliers = [
      {
        id: 'sup1-' + Date.now(),
        first_name: 'John',
        last_name: 'Consultant',
        company_name: 'JC Consulting',
        email: 'john@jcconsulting.com',
        phone: '+33123456789',
        city: 'Paris',
        country: 'FR',
        currency_preference: 'EUR',
        status: 'ACTIVE'
      },
      {
        id: 'sup2-' + Date.now(),
        first_name: 'Maria',
        last_name: 'Developer',
        company_name: 'MD Tech Solutions',
        email: 'maria@mdtech.com',
        phone: '+34987654321',
        city: 'Madrid',
        country: 'ES',
        currency_preference: 'EUR',
        status: 'ACTIVE'
      }
    ];

    let insertedCount = 0;
    for (const supplier of suppliers) {
      try {
        await this.client.query(`
          INSERT INTO suppliers (
            id, first_name, last_name, company_name, email, phone,
            city, country, currency_preference, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          supplier.id, supplier.first_name, supplier.last_name, supplier.company_name,
          supplier.email, supplier.phone, supplier.city, supplier.country,
          supplier.currency_preference, supplier.status, new Date(), new Date()
        ]);
        insertedCount++;
      } catch (error) {
        this.log(`❌ Supplier insert error: ${error.message}`, 'ERROR');
      }
    }
    
    this.log(`✅ Inserted ${insertedCount} suppliers`);
  }

  async insertAdminUser() {
    this.log('👤 Inserting admin user...');
    
    try {
      await this.client.query(`
        INSERT INTO users (name, email, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          role = EXCLUDED.role,
          updated_at = EXCLUDED.updated_at
      `, [
        'Admin User',
        'philb75@gmail.com',
        'ADMINISTRATOR',
        new Date(),
        new Date()
      ]);
      
      this.log('✅ Inserted admin user');
    } catch (error) {
      this.log(`❌ Admin user insert error: ${error.message}`, 'ERROR');
    }
  }

  async verifyData() {
    this.log('🔍 Verifying imported data...');
    
    const tables = ['contacts', 'suppliers', 'bank_accounts', 'transactions', 'users'];
    const counts = {};
    
    for (const table of tables) {
      try {
        const result = await this.client.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        counts[table] = 'error';
      }
    }
    
    this.log('📊 Final data verification:');
    Object.entries(counts).forEach(([table, count]) => {
      this.log(`   ${table}: ${count} records`);
    });
    
    return counts;
  }

  async run() {
    const startTime = Date.now();
    
    try {
      this.log('🚀 Starting data fix and import...');
      
      await this.connect();
      
      // Fix enum values
      await this.fixEnumValues();
      
      // Insert data
      await this.insertAdminUser();
      await this.insertContacts();
      await this.insertBankAccount();
      await this.insertTransactions();
      await this.insertSuppliers();
      
      // Verify results
      const counts = await this.verifyData();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      const totalRecords = Object.values(counts).reduce((sum, count) => {
        return sum + (typeof count === 'number' ? count : 0);
      }, 0);
      
      this.log('🎉 Data fix and import completed!');
      this.log(`⏱️ Total time: ${duration} seconds`);
      this.log(`📊 Total records: ${totalRecords}`);
      
      return {
        success: true,
        duration,
        totalRecords,
        tableCounts: counts,
        message: 'Data fix and import completed successfully'
      };
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.log(`💥 Import failed after ${duration} seconds: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        duration,
        error: error.message,
        message: 'Data fix and import failed'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// Execute import
async function main() {
  const fixer = new DataFixer();
  
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

module.exports = DataFixer;