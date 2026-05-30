require('dotenv').config();
const pool = require('../config/db');

/**
 * Create sample user mappings for testing
 * Maps machine Staff Codes to database person IDs
 */

async function createSampleMappings() {
  console.log('🔧 Creating Sample User Mappings\n');
  console.log('='.repeat(50));

  try {
    // Sample mappings (adjust person_ids to match your database)
    const mappings = [
      { personId: 'staff-001', personType: 'staff', machineUserId: 1, name: 'khalid' },
      { personId: 'staff-002', personType: 'staff', machineUserId: 2, name: 'Ahmed' },
      { personId: 'staff-003', personType: 'staff', machineUserId: 3, name: 'Sara' },
    ];

    console.log('\n📝 Creating mappings:\n');

    for (const mapping of mappings) {
      try {
        await pool.query(
          `INSERT INTO user_machine_mapping (person_id, person_type, machine_user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (person_id, person_type) 
           DO UPDATE SET machine_user_id = $3, updated_at = NOW()`,
          [mapping.personId, mapping.personType, mapping.machineUserId]
        );

        console.log(`✅ ${mapping.name}: ${mapping.personId} → Machine ID ${mapping.machineUserId}`);
      } catch (error) {
        if (error.code === '23505') {
          console.log(`⚠️  ${mapping.name}: Machine ID ${mapping.machineUserId} already in use`);
        } else {
          throw error;
        }
      }
    }

    // Verify mappings
    console.log('\n' + '='.repeat(50));
    console.log('📊 Current Mappings:\n');

    const result = await pool.query(
      'SELECT * FROM user_machine_mapping ORDER BY machine_user_id'
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No mappings found');
    } else {
      result.rows.forEach(row => {
        console.log(`   ${row.person_id} (${row.person_type}) → Machine ID ${row.machine_user_id}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Sample mappings created successfully!');
    console.log('='.repeat(50));

    console.log('\n📌 NEXT STEPS:');
    console.log('1. Run: npm run test:csv-import');
    console.log('2. Verify records are now saved (not just processed)');
    console.log('3. Check dual_mode_attendance table for new records');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run
createSampleMappings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
