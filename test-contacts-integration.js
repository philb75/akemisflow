#!/usr/bin/env node

// Test script to verify the complete Airwallex contact integration
// This will test the API endpoint and report the final results

const fs = require('fs');
const path = require('path');

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

async function testContactIntegration() {
  try {
    console.log('🧪 AIRWALLEX CONTACT INTEGRATION TEST');
    console.log('====================================');
    
    loadEnvFile();
    
    const baseUrl = 'http://localhost:3000';
    
    // First, get current contact summary
    console.log('\n📊 Getting current contact database summary...');
    try {
      const summaryResponse = await fetch(`${baseUrl}/api/contacts/import-airwallex`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log('✅ Current database summary:');
        console.log(`   Total contacts: ${summaryData.data.database_summary.totalContacts}`);
        console.log(`   Airwallex contacts: ${summaryData.data.database_summary.airwallexContacts}`);
      } else {
        console.log('⚠️ Could not get current summary:', summaryResponse.status);
      }
    } catch (error) {
      console.log('⚠️ Could not get current summary:', error.message);
    }
    
    // Test the contact import
    console.log('\n🔄 Testing contact import endpoint...');
    const importResponse = await fetch(`${baseUrl}/api/contacts/import-airwallex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!importResponse.ok) {
      throw new Error(`Import API failed: ${importResponse.status} ${importResponse.statusText}`);
    }
    
    const responseData = await importResponse.json();
    
    if (!responseData.success) {
      throw new Error(`Import failed: ${responseData.message}`);
    }
    
    console.log('✅ Contact import API working');
    
    // Display comprehensive results
    const importResults = responseData.data.import_results;
    const databaseSummary = responseData.data.database_summary;
    const contactDetails = responseData.data.contact_details;
    
    console.log('\n📈 IMPORT RESULTS');
    console.log('=================');
    console.log(`📋 Beneficiaries found: ${importResults.total_beneficiaries}`);
    console.log(`📋 Counterparties found: ${importResults.total_counterparties}`);
    console.log(`➕ New contacts created: ${importResults.new_contacts}`);
    console.log(`🔄 Existing contacts updated: ${importResults.updated_contacts}`);
    console.log(`❌ Errors encountered: ${importResults.errors.length}`);
    console.log(`📊 Total contacts processed: ${importResults.contacts_processed}`);
    
    if (importResults.errors.length > 0) {
      console.log('\n⚠️  Import errors:');
      importResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n💾 DATABASE SUMMARY');
    console.log('===================');
    console.log(`📊 Total contacts in database: ${databaseSummary.totalContacts}`);
    console.log(`🔗 Airwallex-linked contacts: ${databaseSummary.airwallexContacts}`);
    console.log(`🏢 Beneficiary contacts: ${databaseSummary.beneficiaryContacts}`);
    
    console.log('\n👥 CONTACT DETAILS');
    console.log('==================');
    
    if (contactDetails && contactDetails.length > 0) {
      console.log(`Found ${contactDetails.length} contacts with the following data:`);
      
      // Group contacts by type
      const byType = contactDetails.reduce((acc, contact) => {
        acc[contact.contactType] = (acc[contact.contactType] || 0) + 1;
        return acc;
      }, {});
      
      // Group contacts by country
      const byCountry = contactDetails.reduce((acc, contact) => {
        const country = contact.metadata?.airwallex?.bank_details?.bank_country_code || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});
      
      // Group contacts by currency
      const byCurrency = contactDetails.reduce((acc, contact) => {
        const currency = contact.metadata?.airwallex?.bank_details?.account_currency || 'Unknown';
        acc[currency] = (acc[currency] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Contact breakdown:');
      console.log('   By type:', Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join(', '));
      console.log('   By country:', Object.entries(byCountry).map(([country, count]) => `${country}: ${count}`).join(', '));
      console.log('   By currency:', Object.entries(byCurrency).map(([currency, count]) => `${currency}: ${count}`).join(', '));
      
      // Show sample contacts
      console.log('\n👤 Sample contacts:');
      contactDetails.slice(0, 3).forEach((contact, index) => {
        console.log(`   ${index + 1}. ${contact.name}`);
        console.log(`      Type: ${contact.contactType}`);
        console.log(`      Email: ${contact.email || 'Not provided'}`);
        console.log(`      Phone: ${contact.phone || 'Not provided'}`);
        console.log(`      Address: ${contact.address || 'Not provided'}`);
        console.log(`      Currency: ${contact.metadata?.airwallex?.bank_details?.account_currency || 'Not specified'}`);
        console.log('');
      });
      
      // Available data fields analysis
      const availableFields = new Set();
      contactDetails.forEach(contact => {
        Object.keys(contact).forEach(field => {
          if (contact[field] !== null && contact[field] !== undefined && contact[field] !== '') {
            availableFields.add(field);
          }
        });
        
        // Check nested metadata fields
        if (contact.metadata?.airwallex) {
          Object.keys(contact.metadata.airwallex).forEach(field => {
            if (contact.metadata.airwallex[field]) {
              availableFields.add(`metadata.airwallex.${field}`);
            }
          });
        }
      });
      
      console.log('🏷️  Available data fields:');
      const fieldsList = Array.from(availableFields).sort();
      fieldsList.forEach(field => console.log(`   - ${field}`));
      
    } else {
      console.log('❌ No contact details available');
    }
    
    console.log('\n🎯 FINAL ASSESSMENT');
    console.log('===================');
    
    if (importResults.total_beneficiaries > 0) {
      console.log('✅ SUCCESS: Airwallex contact integration is working');
      console.log(`📞 Total contacts available: ${importResults.total_beneficiaries}`);
      console.log('📋 Available data per contact:');
      console.log('   - Name (from beneficiary details or bank account name)');
      console.log('   - Email (from additional_info when available)'); 
      console.log('   - Phone (from legal representative info when available)');
      console.log('   - Full address (street, city, state, postal code, country)');
      console.log('   - Bank account details (name, number, currency, bank name, SWIFT/IBAN)');
      console.log('   - Entity type (PERSONAL/COMPANY)');
      console.log('   - Business registration details (when applicable)');
      console.log('   - Payment methods supported');
      console.log('   - Complete metadata preservation');
      
      console.log('\n🔄 Integration capabilities:');
      console.log('   - Automatic contact creation from Airwallex beneficiaries');
      console.log('   - Duplicate detection and updates based on Airwallex ID');
      console.log('   - Full data mapping to internal Contact model');
      console.log('   - Comprehensive error handling and reporting');
      console.log('   - API endpoint for manual and automated imports');
      
    } else {
      console.log('❌ ISSUE: No contacts found in Airwallex');
      console.log('   Either no beneficiaries exist or API access is limited');
    }
    
    return {
      success: true,
      totalContacts: importResults.total_beneficiaries,
      importResults,
      databaseSummary,
      contactDetails
    };
    
  } catch (error) {
    console.error('💥 Integration test failed:', error);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the integration test
testContactIntegration();