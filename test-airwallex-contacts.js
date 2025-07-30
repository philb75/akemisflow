#!/usr/bin/env node

// Test script to check Airwallex contact API access and report findings
// This will test both beneficiaries and counterparties endpoints

const fs = require('fs');
const path = require('path');

// Simple Airwallex API client for testing
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

  async getBeneficiaries(limit = 50) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const endpoint = `/api/v1/beneficiaries?${params.toString()}`;
      console.log('Testing endpoint:', endpoint);
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      throw error;
    }
  }

  async getCounterparties(limit = 50) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const endpoint = `/api/v1/counterparties?${params.toString()}`;
      console.log('Testing endpoint:', endpoint);
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching counterparties:', error);
      throw error;
    }
  }

  async getContacts(limit = 50) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      const endpoint = `/api/v1/contacts?${params.toString()}`;
      console.log('Testing endpoint:', endpoint);
      
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }
}

// Load environment variables from .env.local
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

function analyzeContactData(contacts, source) {
  console.log(`\n📊 ANALYZING ${source.toUpperCase()} DATA:`);
  
  if (!contacts || contacts.length === 0) {
    console.log('❌ No contacts found');
    return {
      count: 0,
      fields: [],
      sampleData: null
    };
  }

  console.log(`✅ Found ${contacts.length} ${source}`);
  
  // Analyze first contact to understand data structure
  const sampleContact = contacts[0];
  console.log('\n📝 Sample contact structure:');
  console.log(JSON.stringify(sampleContact, null, 2));

  // Extract all unique fields across all contacts
  const allFields = new Set();
  contacts.forEach(contact => {
    function extractFields(obj, prefix = '') {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        allFields.add(fullKey);
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          extractFields(obj[key], fullKey);
        }
      });
    }
    extractFields(contact);
  });

  const fieldsList = Array.from(allFields).sort();
  console.log('\n🏷️  Available fields:');
  fieldsList.forEach(field => console.log(`   - ${field}`));

  // Analyze contact types and statuses
  const entityTypes = new Set();
  const statuses = new Set();
  const countries = new Set();
  
  contacts.forEach(contact => {
    if (contact.entity_type) entityTypes.add(contact.entity_type);
    if (contact.status) statuses.add(contact.status);
    if (contact.address?.country_code) countries.add(contact.address.country_code);
  });

  console.log('\n📋 Data analysis:');
  console.log('   Entity types:', Array.from(entityTypes).join(', ') || 'None');
  console.log('   Statuses:', Array.from(statuses).join(', ') || 'None');
  console.log('   Countries:', Array.from(countries).join(', ') || 'None');

  return {
    count: contacts.length,
    fields: fieldsList,
    sampleData: sampleContact,
    entityTypes: Array.from(entityTypes),
    statuses: Array.from(statuses),
    countries: Array.from(countries)
  };
}

async function testContactAPIs() {
  try {
    console.log('🔍 AIRWALLEX CONTACT API INVESTIGATION');
    console.log('=====================================');
    
    loadEnvFile();
    
    const client = new AirwallexAPIClient();
    console.log('✅ API client initialized');
    
    // Test authentication
    console.log('\n🔐 Testing authentication...');
    await client.authenticate();
    console.log('✅ Authentication successful');
    
    const results = {
      beneficiaries: null,
      counterparties: null,
      contacts: null,
      totalContactsFound: 0,
      availableEndpoints: [],
      errors: []
    };

    // Test beneficiaries endpoint
    console.log('\n🧪 Testing /api/v1/beneficiaries...');
    try {
      const beneficiariesResponse = await client.getBeneficiaries();
      console.log('✅ Beneficiaries endpoint accessible');
      
      const beneficiaries = beneficiariesResponse.items || beneficiariesResponse;
      results.beneficiaries = analyzeContactData(beneficiaries, 'beneficiaries');
      results.totalContactsFound += results.beneficiaries.count;
      results.availableEndpoints.push('beneficiaries');
      
    } catch (error) {
      console.log('❌ Beneficiaries endpoint failed:', error.message);
      results.errors.push(`Beneficiaries: ${error.message}`);
    }

    // Test counterparties endpoint
    console.log('\n🧪 Testing /api/v1/counterparties...');
    try {
      const counterpartiesResponse = await client.getCounterparties();
      console.log('✅ Counterparties endpoint accessible');
      
      const counterparties = counterpartiesResponse.items || counterpartiesResponse;
      results.counterparties = analyzeContactData(counterparties, 'counterparties');
      results.totalContactsFound += results.counterparties.count;
      results.availableEndpoints.push('counterparties');
      
    } catch (error) {
      console.log('❌ Counterparties endpoint failed:', error.message);
      results.errors.push(`Counterparties: ${error.message}`);
    }

    // Test contacts endpoint (alternative)
    console.log('\n🧪 Testing /api/v1/contacts...');
    try {
      const contactsResponse = await client.getContacts();
      console.log('✅ Contacts endpoint accessible');
      
      const contacts = contactsResponse.items || contactsResponse;
      results.contacts = analyzeContactData(contacts, 'contacts');
      results.totalContactsFound += results.contacts.count;
      results.availableEndpoints.push('contacts');
      
    } catch (error) {
      console.log('❌ Contacts endpoint failed:', error.message);
      results.errors.push(`Contacts: ${error.message}`);
    }

    // Final summary
    console.log('\n🎯 FINAL SUMMARY');
    console.log('================');
    console.log(`📞 Total contacts found: ${results.totalContactsFound}`);
    console.log(`🔌 Available endpoints: ${results.availableEndpoints.join(', ') || 'None'}`);
    console.log(`❌ Errors encountered: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Error details:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (results.totalContactsFound > 0) {
      console.log('\n✅ CONTACT INTEGRATION FEASIBLE');
      console.log('   Airwallex contact data is available and can be integrated');
    } else {
      console.log('\n❌ NO CONTACT DATA AVAILABLE');
      console.log('   Either no contacts exist or API access is restricted');
    }

    return results;
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testContactAPIs();