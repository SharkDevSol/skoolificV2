const pool = require('../config/db');

async function checkStaff() {
  try {
    console.log('Checking staff data for salary system...\n');
    
    // Check staff_users table
    console.log('1. Checking staff_users table:');
    const usersResult = await pool.query(`
      SELECT global_staff_id, username, staff_type, class_name
      FROM staff_users
      WHERE global_staff_id IS NOT NULL
      ORDER BY staff_type, username
      LIMIT 10
    `);
    
    console.log(`   Found ${usersResult.rows.length} staff users`);
    usersResult.rows.forEach(row => {
      console.log(`   - ${row.staff_type}: ${row.username} (ID: ${row.global_staff_id}, Class: ${row.class_name})`);
    });
    
    if (usersResult.rows.length === 0) {
      console.log('\n❌ No staff found in staff_users table!');
      console.log('   You need to add staff first before using salary management.');
      process.exit(0);
    }
    
    // Check staff details for first user
    console.log('\n2. Checking staff details:');
    const firstUser = usersResult.rows[0];
    
    const schema = firstUser.staff_type.toLowerCase() === 'teacher' ? 'teachers' :
                   firstUser.staff_type.toLowerCase() === 'supportive' ? 'supportive_staff' :
                   'administrative_staff';
    
    try {
      const detailsResult = await pool.query(
        `SELECT name, email, phone, gender
         FROM "${schema}"."${firstUser.class_name}"
         WHERE global_staff_id = $1`,
        [firstUser.global_staff_id]
      );
      
      if (detailsResult.rows.length > 0) {
        const details = detailsResult.rows[0];
        console.log(`   ✅ Found details for ${firstUser.username}:`);
        console.log(`      Name: ${details.name}`);
        console.log(`      Email: ${details.email}`);
        console.log(`      Phone: ${details.phone}`);
        console.log(`      Schema: ${schema}`);
        console.log(`      Table: ${firstUser.class_name}`);
      } else {
        console.log(`   ❌ No details found in ${schema}.${firstUser.class_name}`);
      }
    } catch (err) {
      console.log(`   ❌ Error querying ${schema}.${firstUser.class_name}:`, err.message);
    }
    
    // Check staff types
    console.log('\n3. Available staff types:');
    const typesResult = await pool.query(`
      SELECT DISTINCT staff_type, COUNT(*) as count
      FROM staff_users
      WHERE global_staff_id IS NOT NULL
      GROUP BY staff_type
      ORDER BY staff_type
    `);
    
    typesResult.rows.forEach(row => {
      console.log(`   - ${row.staff_type}: ${row.count} staff members`);
    });
    
    console.log('\n✅ Staff data check complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkStaff();
