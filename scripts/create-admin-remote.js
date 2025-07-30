const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user on production...');
    
    const response = await fetch('https://akemisflow-p9ztbdegi-philippe-barthelemys-projects.vercel.app/api/setup-admin?key=admin-setup-2024', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AkemisFlow-Setup/1.0'
      },
      body: JSON.stringify({
        email: 'philb75@gmail.com',
        password: 'Philb123$',
        firstName: 'Philippe',
        lastName: 'Barthelemy'
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response body (first 500 chars):', responseText.substring(0, 500));

    if (response.status === 200 || response.status === 201) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Success:', data);
      } catch (e) {
        console.log('⚠️  Success but non-JSON response');
      }
    } else {
      console.log('❌ Failed with status:', response.status);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

createAdminUser();