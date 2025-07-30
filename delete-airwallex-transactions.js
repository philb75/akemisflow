#!/usr/bin/env node

// Delete all Airwallex transactions
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

async function deleteAirwallexTransactions() {
  try {
    console.log('Checking current Airwallex transactions...');
    
    // First, count existing transactions
    const count = await prisma.transaction.count({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      }
    });
    
    console.log(`Found ${count} Airwallex transactions`);
    
    if (count === 0) {
      console.log('No Airwallex transactions to delete');
      return;
    }
    
    // Show some sample transactions
    const sampleTransactions = await prisma.transaction.findMany({
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
      },
      take: 5
    });
    
    console.log('Sample transactions to delete:');
    sampleTransactions.forEach(tx => {
      console.log(`  ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${tx.amount} | ${tx.source} | ${tx.description.substring(0, 50)}`);
    });
    
    console.log('\nDeleting all Airwallex transactions...');
    
    const deleteResult = await prisma.transaction.deleteMany({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      }
    });
    
    console.log(`✅ Successfully deleted ${deleteResult.count} Airwallex transactions`);
    
  } catch (error) {
    console.error('❌ Error deleting transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAirwallexTransactions();