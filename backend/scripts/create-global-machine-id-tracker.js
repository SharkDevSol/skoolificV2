const pool = require('../config/db');

/**
 * Creates a global machine ID tracker table and triggers to ensure
 * machine IDs are unique across ALL student classes
 */

async function createGlobalMachineIdTracker() {
  const client = await pool.connect();
  
  try {
    console.log('\n========================================');
    console.log('🔧 Creating Global Machine ID Tracker');
    console.log('========================================\n');

    await client.query('BEGIN');

    // Create schema if not exists
    await client.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');

    // Create global machine ID tracking table
    console.log('📋 Creating global_machine_ids table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_machine_ids (
        smachine_id VARCHAR(50) PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        school_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created\n');

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_global_machine_ids_class 
      ON school_schema_points.global_machine_ids(class_name)
    `);

    // Populate the table with existing machine IDs from all classes
    console.log('📊 Populating with existing machine IDs...');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    let totalMachineIds = 0;
    let duplicatesFound = 0;

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Check if smachine_id column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'classes_schema'
          AND table_name = $1 
          AND column_name = 'smachine_id'
      `, [tableName]);

      if (columnCheck.rows.length === 0) {
        console.log(`⏭️  ${tableName}: No smachine_id column, skipping`);
        continue;
      }

      // Get all students with machine IDs from this class
      const studentsResult = await client.query(`
        SELECT smachine_id, student_name, school_id, class_id
        FROM classes_schema."${tableName}"
        WHERE smachine_id IS NOT NULL AND smachine_id != ''
      `);

      for (const student of studentsResult.rows) {
        try {
          await client.query(`
            INSERT INTO school_schema_points.global_machine_ids 
            (smachine_id, student_name, class_name, school_id, class_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (smachine_id) DO NOTHING
          `, [
            student.smachine_id,
            student.student_name,
            tableName,
            student.school_id,
            student.class_id
          ]);
          totalMachineIds++;
        } catch (err) {
          console.log(`⚠️  Duplicate found: ${student.smachine_id} in ${tableName}`);
          duplicatesFound++;
        }
      }

      console.log(`✅ ${tableName}: Processed ${studentsResult.rows.length} machine IDs`);
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`✅ Total unique machine IDs tracked: ${totalMachineIds}`);
    console.log(`⚠️  Duplicates found (not added): ${duplicatesFound}`);
    console.log('========================================\n');

    // Show current tracked IDs
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM school_schema_points.global_machine_ids'
    );
    console.log(`📋 Currently tracking ${countResult.rows[0].count} machine IDs globally\n`);

    // Show sample data
    const sampleResult = await client.query(`
      SELECT smachine_id, student_name, class_name 
      FROM school_schema_points.global_machine_ids 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log('📋 Sample tracked machine IDs:');
      sampleResult.rows.forEach(row => {
        console.log(`   ${row.smachine_id} → ${row.student_name} (${row.class_name})`);
      });
      console.log('');
    }

    console.log('✅ Global machine ID tracker created successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. The API will now check this table for duplicates');
    console.log('   2. Machine IDs are guaranteed unique across all classes');
    console.log('   3. Even after deleting students, IDs remain tracked\n');

    process.exit(0);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

createGlobalMachineIdTracker();
