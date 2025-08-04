// Test script to verify Airwallex pagination fix
const fetch = require('node-fetch');

async function testAirwallexSync() {
  try {
    console.log('🧪 Testing Airwallex sync with pagination...\n');
    
    // Call the sync endpoint
    const response = await fetch('http://localhost:3000/api/contractors/sync-airwallex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sync failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    console.log('✅ Sync completed successfully!\n');
    console.log('📊 Results:');
    console.log(`- Total beneficiaries fetched: ${result.data?.sync_results?.total_beneficiaries || 0}`);
    console.log(`- New Airwallex contractors: ${result.data?.sync_results?.new_airwallex_contractors || 0}`);
    console.log(`- Updated Airwallex contractors: ${result.data?.sync_results?.updated_airwallex_contractors || 0}`);
    console.log(`- New AkemisFlow contractors: ${result.data?.sync_results?.new_akemis_contractors || 0}`);
    console.log(`- Existing AkemisFlow contractors: ${result.data?.sync_results?.existing_akemis_contractors || 0}`);
    console.log(`- Errors: ${result.data?.sync_results?.errors || 0}`);
    
    // Check if we got 27 or more beneficiaries
    const totalFetched = result.data?.sync_results?.total_beneficiaries || 0;
    if (totalFetched >= 27) {
      console.log(`\n✅ SUCCESS: Fetched ${totalFetched} beneficiaries (expected at least 27)`);
    } else {
      console.log(`\n⚠️ WARNING: Only fetched ${totalFetched} beneficiaries (expected at least 27)`);
    }
    
    // Show first few synced contractors
    if (result.data?.synced_airwallex_contractors?.length > 0) {
      console.log('\n📋 First 5 synced contractors:');
      result.data.synced_airwallex_contractors.slice(0, 5).forEach((contractor, index) => {
        console.log(`${index + 1}. ${contractor.firstName} ${contractor.lastName} (${contractor.email || 'no email'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAirwallexSync();