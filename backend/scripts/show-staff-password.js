const pool = require('../config/db');

async function showPassword() {
  const username = process.argv[2] || 'bilal915';
  
  try {
    const result = await pool.query(
      'SELECT username, password_plain, staff_type FROM staff_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`User ${username} not found`);
    } else {
      const user = result.rows[0];
      console.log('\n=== Staff User Info ===');
      console.log('Username:', user.username);
      console.log('Password:', user.password_plain || 'NOT STORED (check password_hash)');
      console.log('Staff Type:', user.staff_type);
      console.log('\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

showPassword();
