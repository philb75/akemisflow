#!/usr/bin/env node

// Check if we got all transactions or if there are more pages
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
      
      // Use correct Airwallex pagination parameters
      if (page !== undefined && !pageAfter) {
        params.append('page', page.toString());
      } else if (!pageAfter) {
        params.append('page', '0');
      }
      
      if (pageAfter) params.append('page_after', pageAfter);
      if (pageBefore) params.append('page_before', pageBefore);
      params.append('page_size', pageSize.toString());
      
      const endpoint = `/api/v1/balances/history?${params.toString()}`;
      console.log(`API call: ${endpoint.substring(0, 100)}...`);
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching balance history:', error);
      throw error;
    }
  }
}

async function checkCompleteHistory() {
  try {
    console.log('=== CHECKING IF WE GOT ALL TRANSACTIONS ===');
    
    const airwallexClient = new AirwallexAPIClient();
    
    let allBalanceItems = [];
    let pageAfter;
    let hasMorePages = true;
    let pageCount = 0;
    
    console.log('Fetching ALL pages until exhausted...');
    
    while (hasMorePages && pageCount < 100) { // Increased safety limit
      pageCount++;
      console.log(`\nPage ${pageCount}:`);
      
      const page = pageCount === 1 ? 0 : undefined;
      const balanceHistory = await airwallexClient.getBalanceHistory(
        undefined, // currency
        undefined, // fromDate (null for complete search)
        undefined, // toDate (null for complete search)
        page, // page=0 for first request
        pageAfter, // pageAfter for subsequent pages
        undefined, // pageBefore
        200 // Larger page size
      );
      
      console.log(`  Found ${balanceHistory.items.length} transactions`);
      console.log(`  page_after: ${balanceHistory.page_after ? balanceHistory.page_after.substring(0, 30) + '...' : 'null'}`);
      console.log(`  page_before: ${balanceHistory.page_before ? balanceHistory.page_before.substring(0, 30) + '...' : 'null'}`);
      
      allBalanceItems.push(...balanceHistory.items);
      
      // Show date range for this page
      if (balanceHistory.items.length > 0) {
        const firstDate = balanceHistory.items[0].posted_at || balanceHistory.items[0].created_at;
        const lastDate = balanceHistory.items[balanceHistory.items.length - 1].posted_at || balanceHistory.items[balanceHistory.items.length - 1].created_at;
        console.log(`  Date range: ${new Date(firstDate).toISOString().split('T')[0]} to ${new Date(lastDate).toISOString().split('T')[0]}`);
      }
      
      hasMorePages = !!balanceHistory.page_after;
      pageAfter = balanceHistory.page_after;
      
      if (!hasMorePages) {
        console.log('  ✅ No more pages (page_after is null) - We got everything!');
        break;
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (pageCount >= 100) {
      console.log('⚠️  Stopped at safety limit of 100 pages');
    }
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total pages fetched: ${pageCount}`);
    console.log(`Total transactions: ${allBalanceItems.length}`);
    
    if (allBalanceItems.length > 0) {
      // Calculate date range
      const dates = allBalanceItems.map(item => new Date(item.posted_at || item.created_at));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      console.log(`Complete date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
      console.log(`Time span: ${Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24))} days`);
      
      // Show first and last transactions
      console.log('\nFirst transaction (oldest):');
      const oldest = allBalanceItems[allBalanceItems.length - 1];
      console.log(`  ${oldest.posted_at} | ${oldest.amount} ${oldest.currency} | ${oldest.description}`);
      
      console.log('\nLast transaction (newest):');
      const newest = allBalanceItems[0];
      console.log(`  ${newest.posted_at} | ${newest.amount} ${newest.currency} | ${newest.description}`);
      
      // Check for currency breakdown
      const currencies = {};
      allBalanceItems.forEach(item => {
        currencies[item.currency] = (currencies[item.currency] || 0) + 1;
      });
      
      console.log('\nTransactions by currency:');
      Object.entries(currencies).forEach(([currency, count]) => {
        console.log(`  ${currency}: ${count} transactions`);
      });
      
      if (hasMorePages) {
        console.log('\n⚠️  There might be MORE transactions available (hit page limit)');
      } else {
        console.log('\n✅ This appears to be the COMPLETE transaction history');
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkCompleteHistory();