#!/usr/bin/env node

// Analyze complete transaction data structure
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
}

function analyzeTransactionFields(transaction, index) {
  console.log(`\n=== TRANSACTION ${index + 1} COMPLETE DATA ===`);
  console.log('Basic Info:');
  console.log(`  Currency: ${transaction.currency}`);
  console.log(`  Amount: ${transaction.amount}`);
  console.log(`  Description: ${transaction.description}`);
  console.log(`  Source Type: ${transaction.source_type}`);
  
  console.log('\nDates:');
  console.log(`  posted_at: ${transaction.posted_at}`);
  console.log(`  created_at: ${transaction.created_at}`);
  
  console.log('\nIdentifiers:');
  console.log(`  source: ${transaction.source}`);
  console.log(`  transaction_id: ${transaction.transaction_id}`);
  
  console.log('\nBalances:');
  console.log(`  balance: ${transaction.balance}`);
  console.log(`  available_balance: ${transaction.available_balance}`);
  console.log(`  total_balance: ${transaction.total_balance}`);
  
  console.log('\nFees:');
  console.log(`  fee: ${transaction.fee}`);
  
  console.log('\nAll Raw Fields:');
  const allFields = Object.keys(transaction).sort();
  allFields.forEach(field => {
    const value = transaction[field];
    const type = typeof value;
    const displayValue = type === 'object' ? JSON.stringify(value) : value;
    console.log(`  ${field} (${type}): ${displayValue}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

async function analyzeTransactionData() {
  try {
    console.log('=== ANALYZING COMPLETE TRANSACTION DATA STRUCTURE ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    // Get a sample of transactions with different currencies and types
    console.log('Fetching sample transactions...');
    
    const balanceHistory = await airwallexClient.getBalanceHistory(
      undefined, // currency
      undefined, // fromDate
      undefined, // toDate
      0, // page=0 for complete search
      undefined, // pageAfter
      undefined, // pageBefore
      50 // sample size
    );
    
    console.log(`Found ${balanceHistory.items.length} transactions to analyze`);
    
    // Group by currency to get samples
    const byCurrency = {};
    const bySourceType = {};
    
    balanceHistory.items.forEach(item => {
      if (!byCurrency[item.currency]) {
        byCurrency[item.currency] = [];
      }
      byCurrency[item.currency].push(item);
      
      if (!bySourceType[item.source_type]) {
        bySourceType[item.source_type] = [];
      }
      bySourceType[item.source_type].push(item);
    });
    
    console.log('\nAvailable currencies:', Object.keys(byCurrency));
    console.log('Available source types:', Object.keys(bySourceType));
    
    // Analyze one transaction from each currency
    console.log('\n' + '='.repeat(80));
    console.log('DETAILED ANALYSIS BY CURRENCY');
    console.log('='.repeat(80));
    
    Object.entries(byCurrency).forEach(([currency, transactions], index) => {
      console.log(`\n--- SAMPLE ${currency} TRANSACTION ---`);
      analyzeTransactionFields(transactions[0], index);
    });
    
    // Analyze different source types
    console.log('\n' + '='.repeat(80));
    console.log('DETAILED ANALYSIS BY SOURCE TYPE');
    console.log('='.repeat(80));
    
    Object.entries(bySourceType).slice(0, 5).forEach(([sourceType, transactions], index) => {
      console.log(`\n--- SAMPLE ${sourceType} TRANSACTION ---`);
      analyzeTransactionFields(transactions[0], index);
    });
    
    // Find unique fields across all transactions
    console.log('\n' + '='.repeat(80));
    console.log('ALL UNIQUE FIELDS ACROSS ALL TRANSACTIONS');
    console.log('='.repeat(80));
    
    const allFields = new Set();
    const fieldTypes = {};
    const fieldExamples = {};
    
    balanceHistory.items.forEach(item => {
      Object.keys(item).forEach(field => {
        allFields.add(field);
        if (!fieldTypes[field]) {
          fieldTypes[field] = typeof item[field];
          fieldExamples[field] = item[field];
        }
      });
    });
    
    console.log('\nComplete field inventory:');
    Array.from(allFields).sort().forEach(field => {
      const type = fieldTypes[field];
      const example = type === 'object' ? JSON.stringify(fieldExamples[field]) : fieldExamples[field];
      console.log(`  ${field.padEnd(20)} (${type.padEnd(8)}) Example: ${example}`);
    });
    
    console.log('\n=== RECOMMENDATION ===');
    console.log('Based on this analysis, consider adding these fields to your import:');
    console.log('1. posted_at vs created_at (for better date handling)');
    console.log('2. source_type (transaction category)');
    console.log('3. available_balance vs total_balance (balance tracking)');
    console.log('4. Multiple currency support');
    console.log('5. Fee tracking per transaction');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeTransactionData();