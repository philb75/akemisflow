#!/usr/bin/env node

// Check HKD transactions specifically for additional fields
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

async function checkHKDTransactions() {
  try {
    console.log('=== ANALYZING HKD TRANSACTIONS SPECIFICALLY ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    // Get HKD transactions specifically
    console.log('Fetching HKD transactions...');
    
    const hkdBalanceHistory = await airwallexClient.getBalanceHistory(
      'HKD', // currency filter
      undefined, // fromDate
      undefined, // toDate
      0, // page=0 for complete search
      undefined, // pageAfter
      undefined, // pageBefore
      100 // sample size
    );
    
    console.log(`Found ${hkdBalanceHistory.items.length} HKD transactions`);
    
    if (hkdBalanceHistory.items.length === 0) {
      console.log('No HKD transactions found with currency filter. Checking in general history...');
      
      // Get general history and filter for HKD
      const allHistory = await airwallexClient.getBalanceHistory(
        undefined, // currency
        undefined, // fromDate
        undefined, // toDate
        0, // page=0 for complete search
        undefined, // pageAfter
        undefined, // pageBefore
        200 // larger sample
      );
      
      const hkdTransactions = allHistory.items.filter(item => item.currency === 'HKD');
      console.log(`Found ${hkdTransactions.length} HKD transactions in general history`);
      
      if (hkdTransactions.length > 0) {
        console.log('\n=== SAMPLE HKD TRANSACTIONS ===');
        hkdTransactions.slice(0, 3).forEach((transaction, index) => {
          console.log(`\n--- HKD TRANSACTION ${index + 1} ---`);
          console.log('Complete raw data:');
          console.log(JSON.stringify(transaction, null, 2));
          
          console.log('\nParsed data:');
          console.log(`  Date: ${transaction.posted_at}`);
          console.log(`  Amount: ${transaction.amount} ${transaction.currency}`);
          console.log(`  Type: ${transaction.source_type}`);
          console.log(`  Description: ${transaction.description}`);
          console.log(`  Balance after: ${transaction.balance} ${transaction.currency}`);
          console.log(`  Fee: ${transaction.fee} ${transaction.currency}`);
          console.log(`  Source ID: ${transaction.source}`);
        });
        
        // Check if HKD transactions have any unique fields
        console.log('\n=== HKD-SPECIFIC FIELD ANALYSIS ===');
        const hkdFields = new Set();
        hkdTransactions.forEach(tx => {
          Object.keys(tx).forEach(field => hkdFields.add(field));
        });
        
        console.log('Fields in HKD transactions:', Array.from(hkdFields).sort());
        
        // Check if descriptions give more info about HKD transaction types
        console.log('\n=== HKD TRANSACTION TYPES ===');
        const hkdTypes = {};
        hkdTransactions.forEach(tx => {
          const type = tx.source_type;
          if (!hkdTypes[type]) {
            hkdTypes[type] = [];
          }
          hkdTypes[type].push(tx.description);
        });
        
        Object.entries(hkdTypes).forEach(([type, descriptions]) => {
          console.log(`${type}: ${descriptions.length} transactions`);
          console.log(`  Example: ${descriptions[0]}`);
        });
      } else {
        console.log('No HKD transactions found in the data');
      }
    } else {
      // Process HKD transactions from currency filter
      console.log('\n=== HKD TRANSACTIONS FROM CURRENCY FILTER ===');
      hkdBalanceHistory.items.slice(0, 3).forEach((transaction, index) => {
        console.log(`\n--- HKD TRANSACTION ${index + 1} ---`);
        console.log('Complete raw data:');
        console.log(JSON.stringify(transaction, null, 2));
      });
    }
    
  } catch (error) {
    console.error('❌ HKD analysis failed:', error);
  }
}

checkHKDTransactions();