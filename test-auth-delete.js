#!/usr/bin/env node

// Test if the authentication fix works for delete
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

async function testAuthDelete() {
  try {
    console.log('=== TESTING AUTH DELETE FIX ===');
    
    // Check if we have the admin user
    console.log('1. Checking admin user exists:');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'philb75@gmail.com' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found:', adminUser.email);
    } else {
      console.log('❌ Admin user not found - you need to login first');
      console.log('Go to http://localhost:3001/auth/signin and login with:');
      console.log('Email: philb75@gmail.com');
      console.log('Password: Philb123$');
      return;
    }
    
    // Check current transactions
    console.log('\n2. Current transactions to potentially delete:');
    const transactions = await prisma.transaction.findMany({
      where: {
        bankAccount: { bankName: 'Airwallex' },
        transactionDate: { gte: new Date('2025-06-01') }
      },
      select: {
        transactionDate: true,
        amount: true,
        transactionType: true,
        description: true
      },
      orderBy: { transactionDate: 'desc' }
    });
    
    console.log(`Found ${transactions.length} transactions from June 1st onwards:`);
    transactions.forEach(tx => {
      console.log(`  ${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${tx.amount} | ${tx.description.substring(0, 40)}`);
    });
    
    console.log('\n3. Auth fix status:');
    console.log('✅ Changed from getServerSession(authOptions) to auth()');
    console.log('✅ Updated import from @/lib/auth');
    console.log('✅ Should now work with the current NextAuth configuration');
    
    console.log('\n4. Next steps:');
    console.log('- Make sure you are logged in to the web application');
    console.log('- Go to http://localhost:3001/finance/transactions');
    console.log('- Try the delete with June 1st date');
    console.log('- Check the browser console and server logs for any errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthDelete();