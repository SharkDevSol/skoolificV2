const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupDualModeAttendance() {
  try {
    console.log('🚀 Starting Dual-Mode Attendance System setup...\n');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../database/dual_mode_attendance_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Executing database schema...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully!\n');

    // Verify tables were created
    const tables = [
      'machine_config',
      'user_machine_mapping',
      'sync_log',
      'attendance_conflict',
      'attendance_audit_log'
    ];

    console.log('🔍 Verifying tables...');
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ✗ ${table} - FAILED`);
      }
    }

    // Check if default machine was inserted
    const machineResult = await pool.query(
      "SELECT * FROM machine_config WHERE id = 'machine-001'"
    );

    if (machineResult.rows.length > 0) {
      console.log('\n📱 Default machine configuration:');
      console.log(`  ID: ${machineResult.rows[0].id}`);
      console.log(`  Name: ${machineResult.rows[0].name}`);
      console.log(`  IP: ${machineResult.rows[0].ip_address}`);
      console.log(`  Port: ${machineResult.rows[0].port}`);
      console.log(`  Enabled: ${machineResult.rows[0].enabled}`);
    }

    console.log('\n✨ Dual-Mode Attendance System setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update machine IP address in machine_config table if needed');
    console.log('  2. Map student/staff IDs to machine user IDs');
    console.log('  3. Test connection using POST /api/machine-attendance/test-connection');
    console.log('  4. Sync attendance using POST /api/machine-attendance/sync\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup
setupDualModeAttendance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
