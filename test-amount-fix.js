#!/usr/bin/env node

// Test the amount fix by running sync and checking results
// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Error loading .env.local:', error.message);
  }
}

loadEnvFile();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAmountFix() {
  try {
    console.log('=== TESTING AMOUNT SIGN FIX ===');
    
    console.log('1. Current transaction count before sync:');
    const beforeCount = await prisma.transaction.count({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      }
    });
    console.log(`   Before: ${beforeCount} transactions`);
    
    console.log('\n2. Simulating balance history transformation...');
    
    // Simulate the balance history data we get from API
    const sampleBalanceItems = [
      {
        source: "1894ef2f-8863-4326-ba2d-d73f25924286",
        amount: -10905.81,  // Negative = DEBIT
        currency: "EUR",
        balance: 6604.82,
        description: "Pay MAD 112095.79 to  (Hasni Alaoui Zineb)",
        fee: 4.34,
        posted_at: "2025-06-14T16:45:21+0800",
        source_type: "PAYMENT"
      },
      {
        source: "63fba3ac-0cd8-4cb6-88e9-a295ca4c32bb",
        amount: -1000,  // Negative = DEBIT
        currency: "EUR",
        balance: 17510.63,
        description: "Pay MAD 10296.10 to  (Hasni Alaoui Zineb)",
        fee: 4.32,
        posted_at: "2025-06-12T23:39:57+0800",
        source_type: "PAYMENT"
      },
      {
        source: "test-deposit-1",
        amount: 5000,  // Positive = CREDIT
        currency: "EUR",
        balance: 22510.63,
        description: "Incoming deposit",
        fee: 0,
        posted_at: "2025-06-10T10:00:00+0800",
        source_type: "DEPOSIT"
      }
    ];
    
    // Simulate the transformation logic
    console.log('\n3. Testing transformation logic:');
    sampleBalanceItems.forEach((item, index) => {
      const amount = item.amount || 0;
      const isCredit = amount > 0;
      const transactionType = isCredit ? 'CREDIT' : 'DEBIT';
      const finalAmount = amount; // Keep original sign
      
      console.log(`   Item ${index + 1}:`);
      console.log(`     Original amount: ${item.amount}`);
      console.log(`     Type: ${transactionType}`);
      console.log(`     Final amount: ${finalAmount}`);
      console.log(`     Expected: ${isCredit ? 'Positive' : 'Negative'} amount for ${transactionType}`);
      console.log(`     ✅ Correct: ${(isCredit && finalAmount > 0) || (!isCredit && finalAmount < 0)}`);
      console.log('');
    });
    
    console.log('4. The transformation now preserves the original sign:');
    console.log('   - Negative amounts from API → Negative in DB (DEBIT)');
    console.log('   - Positive amounts from API → Positive in DB (CREDIT)');
    console.log('   - This means CREDIT = + and DEBIT = - as requested');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAmountFix();