const pool = require('../config/db');

async function addMachineIdToStudentTables() {
  try {
    console.log('\n========================================');
    console.log('📋 Adding machine_id to Student Tables');
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
      console.log('   This is normal if you haven\'t created any classes yet.');
      console.log('   The machine_id column will be added automatically when you create classes.\n');
      process.exit(0);
    }
    
    console.log(`Found ${studentTables.length} student tables:\n`);
    studentTables.forEach(table => console.log(`  - ${table}`));
    console.log('');

    let successCount = 0;
    let skipCount = 0;

    for (const tableName of studentTables) {
      try {
        // Check if machine_id column already exists
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'classes_schema'
            AND table_name = $1 
            AND column_name = 'machine_id'
        `, [tableName]);

        if (columnCheck.rows.length > 0) {
          console.log(`⏭️  ${tableName}: machine_id already exists, skipping`);
          skipCount++;
          continue;
        }

        // Add machine_id column
        await pool.query(`
          ALTER TABLE classes_schema."${tableName}" 
          ADD COLUMN machine_id VARCHAR(50) UNIQUE
        `);

        console.log(`✅ ${tableName}: Added machine_id column`);
        successCount++;

      } catch (err) {
        console.error(`❌ ${tableName}: Error - ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Total tables: ${studentTables.length}`);
    console.log(`✅ Successfully added: ${successCount}`);
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
        const highlight = col.column_name === 'machine_id' ? ' ← NEW' : '';
        console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${highlight}`);
      });
    }

    console.log('\n✅ Machine ID column added successfully!');
    console.log('Next steps:');
    console.log('1. Update student registration form to include machine_id field');
    console.log('2. Update student API endpoints to handle machine_id');
    console.log('3. Test student registration with machine_id\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addMachineIdToStudentTables();
