const pool = require('../config/db');

async function removeSmachineCustomField() {
  try {
    console.log('\n========================================');
    console.log('🗑️  Removing SMACHINE ID Custom Field');
    console.log('========================================\n');

    // Get all student tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    const studentTables = tablesResult.rows.map(r => r.table_name);
    
    if (studentTables.length === 0) {
      console.log('⚠️  No student tables found');
      process.exit(0);
    }

    console.log(`Found ${studentTables.length} student tables\n`);

    let removedCount = 0;

    for (const tableName of studentTables) {
      try {
        // Check if the custom field column exists (usually named something like 'machine_id_custom' or similar)
        // First, let's see all columns
        const columnsResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema'
            AND table_name = $1
            AND column_name LIKE '%machine%'
        `, [tableName]);

        console.log(`${tableName}: Found machine-related columns:`, columnsResult.rows.map(r => r.column_name));

        // Remove any column that's not 'smachine_id' (our fixed field)
        for (const col of columnsResult.rows) {
          if (col.column_name !== 'smachine_id') {
            await pool.query(`
              ALTER TABLE classes_schema."${tableName}" 
              DROP COLUMN IF EXISTS "${col.column_name}"
            `);
            console.log(`  ✅ Removed column: ${col.column_name}`);
            removedCount++;
          }
        }

      } catch (err) {
        console.error(`❌ ${tableName}: Error - ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log(`✅ Removed ${removedCount} custom field columns`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeSmachineCustomField();
