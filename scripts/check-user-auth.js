const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function checkUserAuth() {
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
    console.log('✅ Connected to production database');

    // Check user exists
    const userResult = await client.query(
      'SELECT id, email, password, role FROM users WHERE email = $1',
      ['philb75@gmail.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found: philb75@gmail.com');
      return;
    }

    const user = userResult.rows[0];
    console.log('\n📧 User found:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Has password:', !!user.password);

    if (user.password) {
      // Test current password
      const testPassword = 'Philb123$';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log('  Password "Philb123$" valid:', isValid);

      if (!isValid) {
        console.log('\n🔧 Updating password...');
        const newHash = await bcrypt.hash(testPassword, 10);
        
        await client.query(
          'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
          [newHash, new Date(), user.id]
        );
        
        console.log('✅ Password updated successfully');
        
        // Verify update
        const verifyResult = await client.query(
          'SELECT password FROM users WHERE id = $1',
          [user.id]
        );
        
        const updatedHash = verifyResult.rows[0].password;
        const verifyValid = await bcrypt.compare(testPassword, updatedHash);
        console.log('✅ Verification:', verifyValid ? 'Password updated correctly' : 'Update failed');
      }
    } else {
      console.log('\n❌ User has no password set');
      console.log('🔧 Setting password...');
      
      const newHash = await bcrypt.hash('Philb123$', 10);
      await client.query(
        'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
        [newHash, new Date(), user.id]
      );
      
      console.log('✅ Password set successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

checkUserAuth();