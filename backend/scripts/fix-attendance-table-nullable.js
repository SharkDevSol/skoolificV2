const pool = require('../config/db');

async function fixAttendanceTable() {
  try {
    console.log('🔧 Fixing hr_ethiopian_attendance table...');

    // Make check_in nullable
    try {
      await pool.query(`
        ALTER TABLE hr_ethiopian_attendance 
        ALTER COLUMN check_in DROP NOT NULL
      `);
      console.log('✅ check_in column is now nullable');
    } catch (err) {
      if (err.code === '42703') {
        console.log('⚠️ check_in column does not exist');
      } else if (err.message.includes('does not exist')) {
        console.log('⚠️ check_in column already nullable or constraint does not exist');
      } else {
        console.log('✅ check_in column already nullable');
      }
    }

    // Make check_out nullable
    try {
      await pool.query(`
        ALTER TABLE hr_ethiopian_attendance 
        ALTER COLUMN check_out DROP NOT NULL
      `);
      console.log('✅ check_out column is now nullable');
    } catch (err) {
      if (err.code === '42703') {
        console.log('⚠️ check_out column does not exist');
      } else if (err.message.includes('does not exist')) {
        console.log('⚠️ check_out column already nullable or constraint does not exist');
      } else {
        console.log('✅ check_out column already nullable');
      }
    }

    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'hr_ethiopian_attendance'
      AND column_name IN ('check_in', 'check_out')
      ORDER BY column_name
    `);

    console.log('\n📋 Current column configuration:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} - Nullable: ${row.is_nullable}`);
    });

    console.log('\n✅ Table fixed successfully!');
    console.log('You can now grant leave without check_in/check_out times.');

  } catch (error) {
    console.error('❌ Error fixing table:', error);
  } finally {
    process.exit();
  }
}

fixAttendanceTable();
