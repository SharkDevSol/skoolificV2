const pool = require('../config/db');

async function testStudentFetch() {
  try {
    console.log('🔍 Testing student fetch for auto-marker...\n');

    // Get all class tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'classes_schema'
      ORDER BY table_name
    `);

    console.log(`Found ${tablesResult.rows.length} class tables\n`);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Get shift assignment
      const shiftResult = await pool.query(`
        SELECT shift_number 
        FROM academic_class_shift_assignment 
        WHERE class_name = $1
      `, [tableName]);
      
      const shiftNumber = shiftResult.rows.length > 0 ? shiftResult.rows[0].shift_number : 1;
      
      // Fetch students WITHOUT machine ID filter
      const studentsResult = await pool.query(`
        SELECT 
          CAST(school_id AS VARCHAR) as student_id,
          student_name,
          smachine_id,
          '${tableName}' as class_name,
          ${shiftNumber} as shift_number
        FROM classes_schema."${tableName}"
        WHERE (is_active = TRUE OR is_active IS NULL)
        ORDER BY student_name
      `);

      console.log(`📚 Class: ${tableName} (Shift ${shiftNumber})`);
      console.log(`   Students: ${studentsResult.rows.length}`);
      
      // Show students with and without machine IDs
      const withMachineId = studentsResult.rows.filter(s => s.smachine_id);
      const withoutMachineId = studentsResult.rows.filter(s => !s.smachine_id);
      
      console.log(`   ✅ With Machine ID: ${withMachineId.length}`);
      console.log(`   ⚠️  Without Machine ID: ${withoutMachineId.length}`);
      
      if (withoutMachineId.length > 0) {
        console.log(`   Students without Machine ID:`);
        withoutMachineId.forEach(s => {
          console.log(`      - ${s.student_name} (ID: ${s.student_id})`);
        });
      }
      console.log('');
    }

    await pool.end();
    console.log('✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testStudentFetch();
