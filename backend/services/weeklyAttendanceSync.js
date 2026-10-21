/**
 * weeklyAttendanceSync.js
 *
 * Mirrors an attendance record from the academic store
 * (academic_student_attendance) into the class teacher's weekly grid
 * (class_<class>_weekly_attendance.week_<YYYY_MM_DD>).
 *
 * Why: two different screens store the same attendance.
 *   - /student-attendance-system  -> academic_student_attendance
 *   - staff app weekly grid       -> class_<class>_weekly_attendance
 * The class-teacher route already writes through to the academic table, so
 * without this helper a mark made on one screen never appeared on the other.
 *
 * The helper is intentionally defensive: it never throws, because failing to
 * mirror one row must never fail the attendance write that triggered it.
 */

const { toGregorian } = require('../utils/ethiopianCalendar');

// Attendance status -> short code used by the weekly attendance grid
const STATUS_TO_SHORT_CODE = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  LEAVE: 'E',
};

const DAY_COLUMNS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * Write one student's status for one day into the weekly grid.
 *
 * @param {object} db                 pg pool (must be the branch pool)
 * @param {object} params
 * @param {string} params.className   e.g. "G6"
 * @param {string|number} params.studentId  school_id of the student
 * @param {number} params.ethYear     Ethiopian year of the day
 * @param {number} params.ethMonth    Ethiopian month of the day
 * @param {number} params.ethDay      Ethiopian day of the month
 * @param {string} params.status      PRESENT | ABSENT | LATE | LEAVE
 * @returns {Promise<boolean>}        true when the grid was written
 */
const syncWeeklyGrid = async (db, { className, studentId, ethYear, ethMonth, ethDay, status }) => {
  try {
    if (!db) return false;
    const code = STATUS_TO_SHORT_CODE[String(status || '').toUpperCase()];
    if (!code || !className || !studentId) return false;

    const gregDate = toGregorian(Number(ethYear), Number(ethMonth), Number(ethDay));
    if (!gregDate || isNaN(gregDate.getTime())) return false;

    // Monday of that Gregorian week + which weekday column to write
    const monday = new Date(gregDate);
    monday.setDate(gregDate.getDate() - ((gregDate.getDay() + 6) % 7));
    const tableName = `week_${monday.getFullYear()}_${String(monday.getMonth() + 1).padStart(2, '0')}_${String(monday.getDate()).padStart(2, '0')}`;
    const schemaName = `class_${className}_weekly_attendance`;
    const dayColumn = DAY_COLUMNS[(gregDate.getDay() + 6) % 7];

    // The weekly grid is keyed by school_id
    const studentRes = await db.query(
      `SELECT school_id::text AS school_id, class_id::text AS class_id, student_name
       FROM classes_schema."${className}"
       WHERE school_id::text = $1
         AND (is_active = TRUE OR is_active IS NULL)
       LIMIT 1`,
      [String(studentId)]
    );
    if (studentRes.rows.length === 0) return false;
    const student = studentRes.rows[0];
    const classIdValue = student.class_id || student.school_id;

    // Same table shape the class-teacher route creates
    await db.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        student_name VARCHAR(100) NOT NULL,
        monday VARCHAR(1), tuesday VARCHAR(1), wednesday VARCHAR(1),
        thursday VARCHAR(1), friday VARCHAR(1), saturday VARCHAR(1), sunday VARCHAR(1),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_${tableName} UNIQUE (school_id, class_id)
      )
    `);

    // Write the day on the student's row
    const updated = await db.query(
      `UPDATE "${schemaName}"."${tableName}"
       SET "${dayColumn}" = $1, updated_at = CURRENT_TIMESTAMP
       WHERE school_id::text = $2`,
      [code, student.school_id]
    );

    if (updated.rowCount === 0) {
      try {
        await db.query(
          `INSERT INTO "${schemaName}"."${tableName}" (school_id, class_id, student_name, "${dayColumn}", created_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (school_id, class_id) DO UPDATE
           SET "${dayColumn}" = EXCLUDED."${dayColumn}", updated_at = CURRENT_TIMESTAMP`,
          [student.school_id, classIdValue, student.student_name, code, 'student-attendance-system']
        );
      } catch (insertErr) {
        // Older week tables may not carry the unique constraint — insert plain.
        await db.query(
          `INSERT INTO "${schemaName}"."${tableName}" (school_id, class_id, student_name, "${dayColumn}", created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [student.school_id, classIdValue, student.student_name, code, 'student-attendance-system']
        );
      }
    }

    return true;
  } catch (err) {
    console.warn('Weekly grid sync failed:', err.message);
    return false;
  }
};

module.exports = { syncWeeklyGrid, STATUS_TO_SHORT_CODE };
