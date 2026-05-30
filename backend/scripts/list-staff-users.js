const pool = require('../config/db');

async function listStaffUsers() {
  try {
    console.log('\n=== Staff Users ===\n');
    
    const result = await pool.query(`
      SELECT 
        username, 
        staff_type, 
        class_name, 
        global_staff_id,
        created_at
      FROM staff_users 
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('No staff users found.\n');
      console.log('Staff users are created when staff members are added to the system.\n');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} staff users:\n`);
    
    result.rows.forEach((user, index) => {
      const hasFinanceAccess = ['director', 'admin', 'vice_director', 'accountant', 'finance_officer'].includes(user.staff_type.toLowerCase());
      const accessStatus = hasFinanceAccess ? '✅ HAS FINANCE ACCESS' : '❌ NO FINANCE ACCESS';
      
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   Staff Type: ${user.staff_type}`);
      console.log(`   Class: ${user.class_name}`);
      console.log(`   Finance Access: ${accessStatus}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });

    console.log('\n=== Finance Access Summary ===\n');
    console.log('Staff Types with Finance Access:');
    console.log('  ✅ director');
    console.log('  ✅ admin');
    console.log('  ✅ vice_director');
    console.log('  ✅ accountant');
    console.log('  ✅ finance_officer');
    console.log('\nStaff Types without Finance Access:');
    console.log('  ❌ teacher');
    console.log('  ❌ staff');
    console.log('  ❌ other types');
    
    console.log('\n=== To Grant Finance Access ===\n');
    console.log('Run: node scripts/make-staff-admin.js <username>\n');
    console.log('Example: node scripts/make-staff-admin.js john123\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

listStaffUsers();
