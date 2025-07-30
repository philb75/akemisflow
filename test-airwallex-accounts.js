#!/usr/bin/env node

// Test script to examine Airwallex accounts without requiring web auth
// This runs the same logic as the sync service to see account details

// Since this is a TypeScript project, we'll create the client directly
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

  async getCurrentBalances() {
    try {
      const data = await this.makeRequest('/api/v1/balances/current');
      return data.items || [];
    } catch (error) {
      console.error('Error fetching current balances:', error);
      throw error;
    }
  }

  async getAccounts() {
    try {
      const data = await this.makeRequest('/api/v1/accounts');
      return data.items || [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
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
        console.log('Fetching account-specific balance history for account:', accountId);
      } else {
        endpoint = `/api/v1/balances/history?${params.toString()}`;
        console.log('Fetching global balance history');
      }
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching balance history:', error);
      throw error;
    }
  }
}

// Load environment variables from .env.local manually
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
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Error loading .env.local:', error.message);
  }
}

loadEnvFile();

function getAirwallexClient() {
  return new AirwallexAPIClient();
}

async function testAccounts() {
  try {
    console.log('=== AIRWALLEX ACCOUNT INVESTIGATION ===');
    console.log('Starting account discovery test...');
    
    const airwallexClient = getAirwallexClient();
    
    // Test authentication first
    console.log('\n1. Testing authentication...');
    try {
      const balances = await airwallexClient.getCurrentBalances();
      console.log('✅ Authentication successful');
      console.log('Current balances count:', balances.length);
    } catch (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }
    
    // Get accounts
    console.log('\n2. Fetching accounts...');
    const accounts = await airwallexClient.getAccounts();
    console.log('Total accounts found:', accounts.length);
    
    if (accounts.length === 0) {
      console.log('❌ No accounts found from /api/v1/accounts');
      
      // Try alternative endpoints to see what we can access
      console.log('\n2a. Trying alternative account endpoints...');
      
      try {
        console.log('Trying /api/v1/accounts/current...');
        const currentAccount = await airwallexClient.makeRequest('/api/v1/accounts/current');
        console.log('Current account response:', JSON.stringify(currentAccount, null, 2));
      } catch (error) {
        console.log('❌ /api/v1/accounts/current failed:', error.message);
      }
      
      try {
        console.log('Trying /api/v1/beneficiaries...');
        const beneficiaries = await airwallexClient.makeRequest('/api/v1/beneficiaries');
        console.log('Beneficiaries response:', JSON.stringify(beneficiaries, null, 2));
      } catch (error) {
        console.log('❌ /api/v1/beneficiaries failed:', error.message);
      }
      
      try {
        console.log('Trying /api/v1/wallets...');
        const wallets = await airwallexClient.makeRequest('/api/v1/wallets');
        console.log('Wallets response:', JSON.stringify(wallets, null, 2));
      } catch (error) {
        console.log('❌ /api/v1/wallets failed:', error.message);
      }
      
      try {
        console.log('Trying /api/v1/connected_accounts...');
        const connectedAccounts = await airwallexClient.makeRequest('/api/v1/connected_accounts');
        console.log('Connected accounts response:', JSON.stringify(connectedAccounts, null, 2));
      } catch (error) {
        console.log('❌ /api/v1/connected_accounts failed:', error.message);
      }
    }
    
    console.log('\n3. Account details:');
    accounts.forEach((account, index) => {
      console.log(`\nAccount ${index + 1}:`);
      console.log('  ID:', account.id);
      console.log('  Name:', account.name);
      console.log('  Account Name:', account.accountName);
      console.log('  Legal Entity:', account.legal_entity?.name);
      console.log('  Currency:', account.currency);
      console.log('  Status:', account.status);
      console.log('  Full object:', JSON.stringify(account, null, 4));
    });
    
    // Find Akemis Limited account
    console.log('\n4. Looking for Akemis Limited account...');
    const akemisAccount = accounts.find(account => 
      account.name?.includes('Akemis Limited') || 
      account.accountName?.includes('Akemis Limited') ||
      account.legal_entity?.name?.includes('Akemis Limited')
    );
    
    if (akemisAccount) {
      console.log('✅ Found Akemis Limited account:', akemisAccount.id);
      console.log('   Name:', akemisAccount.name || akemisAccount.accountName);
      console.log('   Legal Entity:', akemisAccount.legal_entity?.name);
    } else {
      console.log('❌ Akemis Limited account not found');
      console.log('Available account names:');
      accounts.forEach(acc => {
        console.log('  -', acc.name || acc.accountName || 'Unknown name');
        if (acc.legal_entity?.name) {
          console.log('    Legal Entity:', acc.legal_entity.name);
        }
      });
    }
    
    // Test balance history regardless of account count
    console.log('\n5. Testing balance history...');
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Try last 30 days
    
    // First try global balance history
    console.log('\n   a) Global balance history (last 30 days):');
    try {
      const globalHistory = await airwallexClient.getBalanceHistory(undefined, lastMonth, now, undefined, 50);
      console.log('      ✅ Global balance history items:', globalHistory.items.length);
      console.log('      Has more pages:', globalHistory.has_more);
      if (globalHistory.items.length > 0) {
        console.log('      First 3 items:');
        globalHistory.items.slice(0, 3).forEach((item, i) => {
          console.log(`      Item ${i + 1}:`, JSON.stringify(item, null, 8));
        });
      }
    } catch (error) {
      console.log('      ❌ Global balance history failed:', error.message);
    }
    
    // Then try account-specific balance history
    for (const account of accounts) {
      if (!account.id) continue;
      
      console.log(`\n   b) Account-specific balance history for ${account.id}:`);
      try {
        const accountHistory = await airwallexClient.getBalanceHistory(undefined, lastWeek, now, undefined, 10, account.id);
        console.log(`      ✅ Account ${account.id} balance history items:`, accountHistory.items.length);
        if (accountHistory.items.length > 0) {
          console.log('      Sample item:', JSON.stringify(accountHistory.items[0], null, 6));
        }
      } catch (error) {
        console.log(`      ❌ Account ${account.id} balance history failed:`, error.message);
      }
    }
    
    console.log('\n=== ACCOUNT INVESTIGATION COMPLETE ===');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testAccounts();