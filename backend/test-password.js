const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'skoolific',
  password: '12345678',
  port: 5432
});

async function testPasswords() {
  try {
    const result = await pool.query(
      'SELECT password_hash FROM admin_users WHERE username = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('Admin user not found');
      return;
    }

    const hash = result.rows[0].password_hash;
    console.log('Testing passwords against admin user:');
    
    const passwords = ['admin123', 'admin', '123456', 'password', '12345678'];
    
    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, hash);
      console.log(`  '${pwd}': ${match ? '✅ MATCH' : '❌ no match'}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testPasswords();
