const pool = require('../config/db');

async function renameToSmachineId() {
  try {
    console.log('\n========================================');
    console.log('📋 Renaming machine_id to smachine_id');
    console.log('========================================\n');

    // Get all student tables from classes_schema
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    const studentTables = tablesResult.rows.map(r => r.table_name);
    
    if (studentTables.length === 0) {
      console.log('⚠️  No student tables found in classes_schema');
      process.exit(0);
    }
    
    console.log(`Found ${studentTables.length} student tables:\n`);
    studentTables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    let successCount = 0;
    let skipCount = 0;

    for (const tableName of studentTables) {
      try {
        // Check if machine_id column exists
        const machineIdCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema'
            AND table_name = $1 
            AND column_name = 'machine_id'
        `, [tableName]);

        // Check if smachine_id already exists
        const smachineIdCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema'
            AND table_name = $1 
            AND column_name = 'smachine_id'
        `, [tableName]);

        if (smachineIdCheck.rows.length > 0) {
          console.log(`⏭️  ${tableName}: smachine_id already exists, skipping`);
          skipCount++;
          continue;
        }

        if (machineIdCheck.rows.length === 0) {
          // machine_id doesn't exist, create smachine_id directly
          await pool.query(`
            ALTER TABLE classes_schema."${tableName}" 
            ADD COLUMN smachine_id VARCHAR(50) UNIQUE
          `);
          console.log(`✅ ${tableName}: Added smachine_id column`);
        } else {
          // machine_id exists, rename it to smachine_id
          await pool.query(`
            ALTER TABLE classes_schema."${tableName}" 
            RENAME COLUMN machine_id TO smachine_id
          `);
          console.log(`✅ ${tableName}: Renamed machine_id to smachine_id`);
        }

        successCount++;

      } catch (err) {
        console.error(`❌ ${tableName}: Error - ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Total tables: ${studentTables.length}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Failed: ${studentTables.length - successCount - skipCount}`);
    console.log('========================================\n');

    // Show sample data structure
    if (studentTables.length > 0) {
      console.log('📋 Sample table structure:');
      const sampleTable = studentTables[0];
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'classes_schema'
          AND table_name = $1
        ORDER BY ordinal_position
      `, [sampleTable]);

      console.log(`\nTable: classes_schema."${sampleTable}"`);
      console.log('Columns:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(optional)' : '(required)';
        const highlight = col.column_name === 'smachine_id' ? ' ← STUDENT MACHINE ID' : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${highlight}`);
      });
    }

    console.log('\n✅ Column renamed successfully!');
    console.log('\n📝 Note: smachine_id is for STUDENTS, machine_id is for STAFF');
    console.log('   This prevents conflicts between student and staff IDs.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

renameToSmachineId();
