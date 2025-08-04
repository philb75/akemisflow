// Test Airwallex connection directly
async function testAirwallexConnection() {
  console.log('🧪 Testing Airwallex API connection...');
  
  const clientId = process.env.AIRWALLEX_CLIENT_ID;
  const apiKey = process.env.AIRWALLEX_API_KEY;
  
  console.log('Client ID configured:', !!clientId);
  console.log('API Key configured:', !!apiKey);
  
  if (!clientId || !apiKey) {
    console.log('❌ Airwallex credentials not configured');
    return;
  }
  
  try {
    // Test authentication
    console.log('🔐 Testing authentication...');
    const authResponse = await fetch('https://api.airwallex.com/api/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      console.log('❌ Authentication failed:', authResponse.status, error);
      return;
    }
    
    const authData = await authResponse.json();
    console.log('✅ Authentication successful');
    
    // Test beneficiaries endpoint
    console.log('📋 Testing beneficiaries endpoint...');
    const beneficiariesResponse = await fetch('https://api.airwallex.com/api/v1/beneficiaries?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!beneficiariesResponse.ok) {
      const error = await beneficiariesResponse.text();
      console.log('❌ Beneficiaries request failed:', beneficiariesResponse.status, error);
      return;
    }
    
    const beneficiariesData = await beneficiariesResponse.json();
    console.log(`✅ Found ${beneficiariesData.items?.length || 0} beneficiaries`);
    
    if (beneficiariesData.items && beneficiariesData.items.length > 0) {
      console.log('\n📊 Sample beneficiaries:');
      beneficiariesData.items.slice(0, 5).forEach((beneficiary, index) => {
        console.log(`${index + 1}. ${beneficiary.first_name} ${beneficiary.last_name}`);
        console.log(`   Company: ${beneficiary.company_name || 'N/A'}`);
        console.log(`   Entity: ${beneficiary.entity_type}`);
        console.log(`   Email: ${beneficiary.email || beneficiary.beneficiary?.additional_info?.personal_email || 'N/A'}`);
        console.log('');
      });
      
      // Check for Akemis Limited specifically
      const akemisContacts = beneficiariesData.items.filter(b => 
        b.company_name === 'Akemis Limited' || 
        (b.company_name && b.company_name.toLowerCase().includes('akemis'))
      );
      
      console.log(`🎯 Akemis-related beneficiaries: ${akemisContacts.length}`);
      akemisContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.first_name} ${contact.last_name} - ${contact.company_name} (${contact.entity_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Airwallex connection:', error);
  }
}

testAirwallexConnection();