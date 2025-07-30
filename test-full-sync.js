#!/usr/bin/env node

// Test the full sync with corrected pagination
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

// Use updated API client with correct pagination
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

  async getBalanceHistory(currency, fromDate, toDate, page, pageAfter, pageBefore, pageSize = 100) {
    try {
      const params = new URLSearchParams();
      if (currency) params.append('currency', currency);
      if (fromDate) params.append('from', fromDate.toISOString());
      if (toDate) params.append('to', toDate.toISOString());
      
      // Use correct Airwallex pagination parameters
      // Only use page=0 for the initial request to bypass 7-day limit
      // For subsequent requests with page_after, don't include page parameter
      if (page !== undefined && !pageAfter) {
        params.append('page', page.toString());
      } else if (!pageAfter) {
        // Default to page=0 to bypass 7-day limit for complete search
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

async function testFullSync() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== TESTING FULL SYNC WITH CORRECTED PAGINATION ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    // Get ALL balance history using page=0 and pagination
    let allBalanceItems = [];
    let pageAfter;
    let hasMorePages = true;
    let pageCount = 0;
    
    console.log('Fetching complete balance history...');
    
    while (hasMorePages && pageCount < 10) { // Safety limit
      pageCount++;
      console.log(`Page ${pageCount}${pageAfter ? ` (page_after: ${pageAfter.substring(0, 20)}...)` : ' (page=0)'}`);
      
      const page = pageCount === 1 ? 0 : undefined; // Only use page=0 for first request
      const balanceHistory = await airwallexClient.getBalanceHistory(
        undefined, // currency
        undefined, // fromDate (null for complete search)
        undefined, // toDate (null for complete search)
        page, // page=0 for first request
        pageAfter, // pageAfter for subsequent pages
        undefined, // pageBefore
        100 // pageSize
      );
      
      console.log(`  Found ${balanceHistory.items.length} transactions`);
      allBalanceItems.push(...balanceHistory.items);
      
      hasMorePages = !!balanceHistory.page_after;
      pageAfter = balanceHistory.page_after;
      
      if (!hasMorePages) {
        console.log('  No more pages (page_after is null)');
      }
    }
    
    console.log(`\n✅ Retrieved ${allBalanceItems.length} total transactions!`);
    
    if (allBalanceItems.length > 0) {
      // Show date range
      const dates = allBalanceItems.map(item => new Date(item.posted_at || item.created_at));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      console.log(`Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
      
      // Transform and show sample
      console.log('\nSample transactions:');
      allBalanceItems.slice(0, 5).forEach((item, i) => {
        const transformed = airwallexClient.transformBalanceHistoryToTransaction(item);
        const sign = transformed.amount >= 0 ? '+' : '';
        console.log(`${i + 1}. ${transformed.date.toISOString().split('T')[0]} | ${transformed.transactionType} | ${sign}${transformed.amount} ${transformed.currency} | ${transformed.description.substring(0, 50)}`);
      });
      
      console.log('\n🎉 SUCCESS: We can now retrieve the full transaction history!');
      console.log(`Before: Only 4-5 transactions (7-day limit)`);
      console.log(`After: ${allBalanceItems.length} transactions (complete history)`);
      
      // Optional: Import to database
      console.log('\nWould you like me to import these transactions to the database? (This is just a test)');
    } else {
      console.log('❌ No transactions found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullSync();