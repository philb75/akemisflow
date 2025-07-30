#!/usr/bin/env node

// Run the actual sync to test the fixed amount logic
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

// Create the sync service manually (similar to what's in the API route)
const { PrismaClient } = require('@prisma/client');

// Define the AirwallexAPIClient class locally
class AirwallexAPIClient {
  constructor() {
    this.clientId = process.env.AIRWALLEX_CLIENT_ID || '';
    this.apiKey = process.env.AIRWALLEX_API_KEY || '';
    this.baseUrl = process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com';

    if (!this.clientId || !this.apiKey) {
      throw new Error('Airwallex API credentials not configured');
    }
  }

  async authenticate() {
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2020-09-22',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      this.authToken = data.token;
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

      return this.authToken;
    } catch (error) {
      console.error('Airwallex authentication error:', error);
      throw error;
    }
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-version': '2020-09-22',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getBalanceHistory(currency, fromDate, toDate, cursor, limit = 100, accountId) {
    try {
      const params = new URLSearchParams();
      if (currency) params.append('currency', currency);
      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());
      if (cursor) params.append('cursor', cursor);
      params.append('limit', limit.toString());
      
      let endpoint;
      if (accountId) {
        endpoint = `/api/v1/accounts/${accountId}/balances/history?${params.toString()}`;
      } else {
        endpoint = `/api/v1/balances/history?${params.toString()}`;
      }
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching balance history:', error);
      throw error;
    }
  }

  transformBalanceHistoryToTransaction(balanceItem) {
    const dateStr = balanceItem.posted_at || balanceItem.created_at || balanceItem.timestamp || balanceItem.date;
    let transactionDate;
    
    if (dateStr) {
      transactionDate = new Date(dateStr);
      if (isNaN(transactionDate.getTime())) {
        console.warn('Invalid date detected:', dateStr, 'for item:', balanceItem);
        transactionDate = new Date();
      }
    } else {
      console.warn('No date field found in balance item:', balanceItem);
      transactionDate = new Date();
    }
    
    const amount = balanceItem.amount || 0;
    const isCredit = amount > 0;
    
    return {
      bank: 'Airwallex',
      date: transactionDate,
      transactionType: isCredit ? 'CREDIT' : 'DEBIT',
      financialTransactionType: balanceItem.source_type || 'UNKNOWN',
      transactionId: balanceItem.source || balanceItem.transaction_id || balanceItem.id || `bal_${Date.now()}_${Math.random()}`,
      description: balanceItem.description || `${balanceItem.source_type || 'Unknown'} transaction`,
      currency: balanceItem.currency,
      conversionRate: null,
      amount: amount, // Keep original sign: positive for credits, negative for debits
      balance: balanceItem.balance || balanceItem.total_balance || balanceItem.available_balance || 0,
      reference: '',
      note: '',
      feeAmount: balanceItem.fee || 0,
      feeCurrency: balanceItem.currency,
      source: 'API'
    };
  }
}

async function runSync() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== RUNNING AIRWALLEX SYNC WITH FIXED AMOUNT LOGIC ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    // Get last sync time - use 30 days ago as default
    const lastSyncTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log('Syncing from:', lastSyncTime.toISOString());
    
    // Get balance history
    const balanceHistory = await airwallexClient.getBalanceHistory(undefined, lastSyncTime, new Date(), undefined, 50);
    console.log(`Found ${balanceHistory.items.length} balance history items`);
    
    if (balanceHistory.items.length === 0) {
      console.log('No transactions to import');
      return;
    }
    
    // Transform and import
    const apiTransactions = balanceHistory.items.map(item => 
      airwallexClient.transformBalanceHistoryToTransaction(item)
    );
    
    console.log('\nTransformed transactions:');
    apiTransactions.forEach((tx, i) => {
      const sign = tx.amount >= 0 ? '+' : '';
      console.log(`${i + 1}. ${tx.transactionType} | ${sign}${tx.amount} ${tx.currency} | ${tx.description.substring(0, 50)}`);
    });
    
    let imported = 0;
    let skipped = 0;
    
    // Get or create bank account
    let bankAccount = await prisma.bankAccount.findFirst({
      where: { bankName: 'Airwallex' },
    });

    if (!bankAccount) {
      bankAccount = await prisma.bankAccount.create({
        data: {
          accountName: 'Airwallex API Account',
          bankName: 'Airwallex',
          currency: 'EUR',
          accountType: 'BUSINESS',
          status: 'ACTIVE',
        },
      });
    }
    
    // Import transactions
    for (const transactionData of apiTransactions) {
      try {
        const existing = await prisma.transaction.findFirst({
          where: {
            airwallexTransactionId: transactionData.transactionId,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.transaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: transactionData.transactionType,
            amount: transactionData.amount,
            currency: transactionData.currency,
            description: transactionData.description,
            category: 'OTHER',
            status: 'COMPLETED',
            exchangeRate: transactionData.conversionRate,
            airwallexTransactionId: transactionData.transactionId,
            source: 'API',
            transactionDate: transactionData.date,
            referenceNumber: transactionData.reference || undefined,
            feeAmount: transactionData.feeAmount,
            feeCurrency: transactionData.feeCurrency,
            rawData: transactionData,
          },
        });

        imported++;
      } catch (error) {
        console.error(`Error importing transaction ${transactionData.transactionId}:`, error.message);
      }
    }
    
    console.log(`\n✅ Sync completed: ${imported} imported, ${skipped} skipped`);
    
    // Verify the results
    console.log('\n=== VERIFICATION ===');
    const finalTransactions = await prisma.transaction.findMany({
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
    
    console.log('Final imported transactions with correct signs:');
    finalTransactions.forEach(tx => {
      const sign = tx.amount >= 0 ? '+' : '';
      const signCorrect = (tx.transactionType === 'CREDIT' && tx.amount >= 0) || (tx.transactionType === 'DEBIT' && tx.amount < 0);
      console.log(`${tx.transactionDate.toISOString().split('T')[0]} | ${tx.transactionType} | ${sign}${tx.amount} | ${signCorrect ? '✅' : '❌'} | ${tx.description.substring(0, 40)}`);
    });
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runSync();