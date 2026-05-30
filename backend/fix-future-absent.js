const pool = require('./config/db');
const { getCurrentEthiopianDate } = require('./utils/ethiopianCalendar');

async function deleteFutureAbsent() {
  try {
    const today = getCurrentEthiopianDate();
    console.log('Today (Ethiopian):', today);

    // Show what will be deleted first
    const preview = await pool.query(`
      SELECT ethiopian_year, ethiopian_month, ethiopian_day, COUNT(*) as cnt
      FROM academic_student_attendance 
      WHERE notes = 'Auto-marked absent by system'
        AND (
          ethiopian_year > $1
          OR (ethiopian_year = $1 AND ethiopian_month > $2)
          OR (ethiopian_year = $1 AND ethiopian_month = $2 AND ethiopian_day > $3)
        )
      GROUP BY ethiopian_year, ethiopian_month, ethiopian_day
      ORDER BY ethiopian_year, ethiopian_month, ethiopian_day
    `, [today.year, today.month, today.day]);

    console.log('Future auto-absent records found:');
    preview.rows.forEach(r => {
      console.log(`  Year ${r.ethiopian_year} Month ${r.ethiopian_month} Day ${r.ethiopian_day}: ${r.cnt} records`);
    });

    if (preview.rows.length === 0) {
      console.log('No future records to delete.');
      process.exit(0);
    }

    // Delete them
    const result = await pool.query(`
      DELETE FROM academic_student_attendance 
      WHERE notes = 'Auto-marked absent by system'
        AND (
          ethiopian_year > $1
          OR (ethiopian_year = $1 AND ethiopian_month > $2)
          OR (ethiopian_year = $1 AND ethiopian_month = $2 AND ethiopian_day > $3)
        )
    `, [today.year, today.month, today.day]);

    console.log('Deleted:', result.rowCount, 'future auto-absent records');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

deleteFutureAbsent();
