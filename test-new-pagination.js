#!/usr/bin/env node

// Test the new Airwallex pagination with page=0
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

// Create the API client with correct pagination
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
      console.log('API endpoint:', endpoint);
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching balance history:', error);
      throw error;
    }
  }
}

async function testNewPagination() {
  try {
    console.log('=== TESTING NEW AIRWALLEX PAGINATION ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    console.log('1. Testing with page=0 (should bypass 7-day limit):');
    const balanceHistory = await airwallexClient.getBalanceHistory(
      undefined, // currency
      undefined, // fromDate (null for complete search)
      undefined, // toDate (null for complete search)
      0, // page=0 for complete search
      undefined, // pageAfter
      undefined, // pageBefore
      50 // pageSize
    );
    
    console.log(`Found ${balanceHistory.items.length} transactions`);
    console.log('page_after:', balanceHistory.page_after);
    console.log('page_before:', balanceHistory.page_before);
    
    if (balanceHistory.items.length > 0) {
      console.log('\n2. Sample transactions:');
      balanceHistory.items.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. ${item.posted_at} | ${item.amount} ${item.currency} | ${item.description}`);
      });
    }
    
    if (balanceHistory.page_after) {
      console.log('\n3. Testing pagination with page_after:');
      const nextPage = await airwallexClient.getBalanceHistory(
        undefined, // currency
        undefined, // fromDate
        undefined, // toDate
        undefined, // page (don't use page=0 for subsequent pages)
        balanceHistory.page_after, // pageAfter
        undefined, // pageBefore
        50 // pageSize
      );
      
      console.log(`Found ${nextPage.items.length} transactions on next page`);
      console.log('Next page_after:', nextPage.page_after);
      
      if (nextPage.items.length > 0) {
        console.log('Sample from next page:');
        nextPage.items.slice(0, 3).forEach((item, i) => {
          console.log(`${i + 1}. ${item.posted_at} | ${item.amount} ${item.currency} | ${item.description}`);
        });
      }
    }
    
    console.log('\n✅ Pagination test complete!');
    console.log('This should now retrieve ALL transaction history, not just 7 days!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewPagination();