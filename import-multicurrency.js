#!/usr/bin/env node

// Import transactions with multiple currencies using updated pagination
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

// Updated API client with correct pagination
class AirwallexAPIClient {
  constructor() {
    this.clientId = process.env.AIRWALLEX_CLIENT_ID || '';
    this.apiKey = process.env.AIRWALLEX_API_KEY || '';
    this.baseUrl = process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com';
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

  async getBalanceHistory(currency, fromDate, toDate, page, pageAfter, pageBefore, pageSize = 100) {
    try {
      const params = new URLSearchParams();
      if (currency) params.append('currency', currency);
      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());
      
      if (page !== undefined && !pageAfter) {
        params.append('page', page.toString());
      } else if (!pageAfter) {
        params.append('page', '0');
      }
      
      if (pageAfter) params.append('page_after', pageAfter);
      if (pageBefore) params.append('page_before', pageBefore);
      params.append('page_size', pageSize.toString());
      
      const endpoint = `/api/v1/balances/history?${params.toString()}`;
      
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
        transactionDate = new Date();
      }
    } else {
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
      amount: amount,
      balance: balanceItem.balance || balanceItem.total_balance || balanceItem.available_balance || 0,
      reference: '',
      note: '',
      feeAmount: balanceItem.fee || 0,
      feeCurrency: balanceItem.currency,
      source: 'API'
    };
  }
}

async function importMultiCurrency() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== IMPORTING MULTI-CURRENCY TRANSACTIONS ===');
    
    // Delete existing transactions first
    console.log('1. Clearing existing transactions...');
    const deleteResult = await prisma.transaction.deleteMany({
      where: {
        bankAccount: {
          bankName: 'Airwallex'
        }
      }
    });
    console.log(`Deleted ${deleteResult.count} existing transactions`);
    
    const airwallexClient = new AirwallexAPIClient();
    
    // Get ALL balance history using correct pagination
    let allBalanceItems = [];
    let pageAfter;
    let hasMorePages = true;
    let pageCount = 0;
    
    console.log('2. Fetching complete transaction history...');
    
    while (hasMorePages && pageCount < 10) {
      pageCount++;
      console.log(`   Page ${pageCount}${pageAfter ? ` (continuing...)` : ' (page=0)'}`);
      
      const page = pageCount === 1 ? 0 : undefined;
      const balanceHistory = await airwallexClient.getBalanceHistory(
        undefined,
        undefined,
        undefined,
        page,
        pageAfter,
        undefined,
        200
      );
      
      console.log(`   Found ${balanceHistory.items.length} transactions`);
      allBalanceItems.push(...balanceHistory.items);
      
      hasMorePages = !!balanceHistory.page_after;
      pageAfter = balanceHistory.page_after;
      
      if (!hasMorePages) {
        console.log('   Complete!');
      }
    }
    
    console.log(`3. Retrieved ${allBalanceItems.length} total transactions`);
    
    // Show currency breakdown
    const currencyBreakdown = {};
    allBalanceItems.forEach(item => {
      currencyBreakdown[item.currency] = (currencyBreakdown[item.currency] || 0) + 1;
    });
    
    console.log('Currency breakdown:');
    Object.entries(currencyBreakdown).forEach(([currency, count]) => {
      console.log(`   ${currency}: ${count} transactions`);
    });
    
    // Transform and import
    console.log('4. Transforming and importing...');
    const apiTransactions = allBalanceItems.map(item => 
      airwallexClient.transformBalanceHistoryToTransaction(item)
    );
    
    let imported = 0;
    
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
        console.error(`Error importing transaction:`, error.message);
      }
    }
    
    console.log(`5. ✅ Imported ${imported} transactions successfully!`);
    
    // Verify currencies in database
    const dbCurrencies = await prisma.transaction.findMany({
      where: {
        bankAccount: { bankName: 'Airwallex' }
      },
      select: {
        currency: true
      },
      distinct: ['currency']
    });
    
    console.log('Currencies in database:', dbCurrencies.map(c => c.currency).sort());
    
    console.log('\n🎉 Multi-currency import complete!');
    console.log('You can now test the currency filter in the web interface.');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importMultiCurrency();