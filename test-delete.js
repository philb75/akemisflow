#!/usr/bin/env node

// Test the delete functionality with June 1st date
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

async function testDelete() {
  try {
    console.log('=== TESTING DELETE WITH JUNE 1ST ===');
    
    // Check current transactions
    console.log('1. Current Airwallex transactions:');
    const allTransactions = await prisma.transaction.findMany({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      },
      select: {
        id: true,
        transactionDate: true,
        amount: true,
        transactionType: true,
        description: true,
        source: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });
    
    console.log(`Found ${allTransactions.length} total Airwallex transactions:`);
    allTransactions.forEach(tx => {
      console.log(`  ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${tx.amount} | ${tx.source} | ${tx.description.substring(0, 40)}`);
    });
    
    // Test the delete criteria
    const fromDate = '2025-06-01'; // June 1st
    console.log(`\n2. Testing delete from ${fromDate}:`);
    
    const whereClause = {
      transactionDate: {
        gte: new Date(fromDate)
      },
      bankAccount: {
        bankName: 'Airwallex'  // Let's be specific about Airwallex
      }
    };
    
    console.log('Where clause:', JSON.stringify(whereClause, null, 2));
    
    // Count transactions that would be deleted
    const countResult = await prisma.transaction.count({
      where: whereClause
    });
    
    console.log(`Transactions that would be deleted: ${countResult}`);
    
    if (countResult > 0) {
      // Show which transactions would be deleted
      const toDelete = await prisma.transaction.findMany({
        where: whereClause,
        select: {
          id: true,
          transactionDate: true,
          amount: true,
          transactionType: true,
          description: true,
          source: true
        },
        orderBy: {
          transactionDate: 'desc'
        }
      });
      
      console.log('\nTransactions that would be deleted:');
      toDelete.forEach(tx => {
        console.log(`  ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${tx.amount} | ${tx.source} | ${tx.description.substring(0, 40)}`);
      });
      
      // Simulate the delete (but don't actually delete)
      console.log('\n3. Simulating delete operation...');
      console.log(`Would delete ${countResult} transactions from June 1st onwards`);
      console.log('✅ Delete criteria is working correctly');
      
    } else {
      console.log('\n❌ No transactions would be deleted - this might be the issue');
      
      // Check dates more carefully
      console.log('\n4. Checking date comparison:');
      const june1st = new Date(fromDate);
      console.log(`June 1st parsed as: ${june1st.toISOString()}`);
      
      allTransactions.forEach(tx => {
        const txDate = new Date(tx.transactionDate);
        const isAfterJune1 = txDate >= june1st;
        console.log(`  ${tx.transactionDate.toISOString().split('T')[0]} >= ${fromDate}: ${isAfterJune1}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();