#!/usr/bin/env node

// Test the sync with the updated amount logic
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

// Import the sync function
async function testSync() {
  try {
    console.log('Testing Airwallex sync with fixed amount logic...');
    
    // Import the sync service
    const { AirwallexSyncService } = await import('./src/lib/airwallex-sync.js');
    const syncService = new AirwallexSyncService();
    
    // Run sync
    const result = await syncService.syncTransactions(false);
    
    console.log('Sync result:', result);
    
    // Check the imported transactions
    const prisma = new PrismaClient();
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      },
      select: {
        transactionDate: true,
        amount: true,
        transactionType: true,
        description: true
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });
    
    console.log('\nImported transactions with amount signs:');
    transactions.forEach(tx => {
      const sign = tx.amount >= 0 ? '+' : '';
      console.log(`${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${sign}${tx.amount} | ${tx.description.substring(0, 50)}`);
    });
    
    await prisma.$disconnect();
    await syncService.disconnect();
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSync();