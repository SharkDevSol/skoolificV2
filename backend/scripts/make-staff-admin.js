const pool = require('../config/db');

async function makeStaffAdmin() {
  const username = process.argv[2];
  
  if (!username) {
    console.log('\n❌ Error: Username is required\n');
    console.log('Usage: node scripts/make-staff-admin.js <username>\n');
    console.log('Example: node scripts/make-staff-admin.js john123\n');
    console.log('To see all staff users, run: node scripts/list-staff-users.js\n');
    process.exit(1);
  }

  try {
    // Check current user
    const current = await pool.query(
      'SELECT * FROM staff_users WHERE username = $1',
      [username]
    );

    if (current.rows.length === 0) {
      console.log(`\n❌ User '${username}' not found\n`);
      console.log('To see all staff users, run: node scripts/list-staff-users.js\n');
      process.exit(1);
    }

    const user = current.rows[0];

    console.log('\n=== Current User Info ===\n');
    console.log(`Username: ${user.username}`);
    console.log(`Staff Type: ${user.staff_type}`);
    console.log(`Class: ${user.class_name}`);
    console.log(`Global Staff ID: ${user.global_staff_id}`);

    // Update to director
    await pool.query(
      'UPDATE staff_users SET staff_type = $1 WHERE username = $2',
      ['director', username]
    );

    console.log('\n✅ User updated successfully!\n');
    console.log('=== Updated User Info ===\n');
    console.log(`Username: ${user.username}`);
    console.log(`New Staff Type: director`);
    console.log('\n✅ This user now has full finance access!\n');
    console.log('Next steps:');
    console.log('1. Logout from the application');
    console.log('2. Login again with this username');
    console.log('3. Navigate to Finance → Fee Management');
    console.log('4. You should now have access!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

makeStaffAdmin();
