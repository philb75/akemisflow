const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function testDirectAuth() {
  const credentials = {
    email: 'philb75@gmail.com',
    password: 'Philb123$'
  };

  console.log('🔐 Testing direct authentication...');
  console.log('  Email:', credentials.email);
  console.log('  Password:', credentials.password);

  const client = new Client({
    user: 'postgres.wflcaapznpczlxjaeyfd',
    password: 'Philb921056$',
    host: 'aws-0-eu-west-3.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('\n✅ Connected to database');

    // Find user by email
    const result = await client.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [credentials.email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('\n📧 User found:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Has password:', !!user.password);

    if (!user.password) {
      console.log('❌ User has no password');
      return;
    }

    // Test bcrypt comparison with exact same logic as auth-direct.ts
    console.log('\n🔑 Testing password comparison...');
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    console.log('  Result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    if (isPasswordValid) {
      console.log('\n✅ Authentication would succeed');
      console.log('  Returned user object:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected');
  }
}

testDirectAuth();