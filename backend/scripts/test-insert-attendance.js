require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testInsertAttendance() {
  try {
    console.log('🔍 Step 1: Finding Ahmed in database...');
    
    // Find Ahmed's actual staff_id
    const staffResult = await pool.query(`
      SELECT staff_id, full_name FROM teachers WHERE LOWER(full_name) LIKE LOWER('%ahmed%')
      UNION ALL
      SELECT staff_id, full_name FROM administrative_staff WHERE LOWER(full_name) LIKE LOWER('%ahmed%')
      UNION ALL
      SELECT staff_id, full_name FROM supportive_staff WHERE LOWER(full_name) LIKE LOWER('%ahmed%')
      LIMIT 1
    `);
    
    if (staffResult.rows.length === 0) {
      console.log('❌ Ahmed not found in database!');
      console.log('');
      console.log('Please check:');
      console.log('1. Is Ahmed registered in the system?');
      console.log('2. Is the name spelled correctly?');
      console.log('3. Which table is Ahmed in? (teachers, administrative_staff, supportive_staff)');
      process.exit(1);
    }
    
    const staffId = staffResult.rows[0].staff_id;
    const staffName = staffResult.rows[0].full_name;
    
    console.log('✅ Found Ahmed:');
    console.log('   Staff ID:', staffId);
    console.log('   Full Name:', staffName);
    console.log('');
    
    console.log('🔍 Step 2: Inserting test attendance record...');
    
    // Insert test attendance for Day 3, Month 6, Year 2018
    const insertResult = await pool.query(`
      INSERT INTO hr_ethiopian_attendance 
      (staff_id, staff_name, ethiopian_year, ethiopian_month, ethiopian_day, status, check_in, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (staff_id, ethiopian_year, ethiopian_month, ethiopian_day)
      DO UPDATE SET 
        check_in = EXCLUDED.check_in,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [
      staffId,
      staffName,
      2018,
      6,
      3,
      'LATE',
      '12:28:12',
      'Test record inserted manually'
    ]);
    
    console.log('✅ Attendance record inserted:');
    console.log('   Staff ID:', insertResult.rows[0].staff_id);
    console.log('   Staff Name:', insertResult.rows[0].staff_name);
    console.log('   Date: Yekatit 3, 2018');
    console.log('   Status:', insertResult.rows[0].status);
    console.log('   Check-in:', insertResult.rows[0].check_in);
    console.log('');
    
    console.log('🔍 Step 3: Verifying record...');
    
    const verifyResult = await pool.query(`
      SELECT * FROM hr_ethiopian_attendance 
      WHERE staff_id = $1 
        AND ethiopian_month = 6 
        AND ethiopian_year = 2018
        AND ethiopian_day = 3
    `, [staffId]);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Record verified in database!');
      console.log('');
      console.log('========================================');
      console.log('   TEST RECORD INSERTED SUCCESSFULLY');
      console.log('========================================');
      console.log('');
      console.log('NOW GO TO FRONTEND:');
      console.log('1. Open Attendance System page');
      console.log('2. Select: Yekatit (Month 6), Year 2018');
      console.log('3. Look at Ahmed\'s row, Day 3 column');
      console.log('4. You should see: Orange "L" badge with time 12:28:12');
      console.log('');
      console.log('IF STILL NOT SHOWING:');
      console.log('- Open browser console (F12)');
      console.log('- Look for logs starting with 📡, ✅, 🔍');
      console.log('- Check if staff_id matches:', staffId);
      console.log('');
    } else {
      console.log('❌ Record not found after insert!');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testInsertAttendance();
