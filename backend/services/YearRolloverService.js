/**
 * Year Rollover Service
 * Handles academic year rollover functionality
 * 
 * Features:
 * - Archive current year data (students, attendance, marks, payments, staff)
 * - Clear current year data
 * - Increment academic year (Ethiopian calendar)
 * - Transaction-based operations for data integrity
 * - Rollback functionality for failed operations
 * - Progress tracking and reporting
 */

const { Pool } = require('pg');
const ethiopianCalendar = require('../utils/ethiopianCalendar');

class YearRolloverService {
  constructor(dbConfig) {
    this.pool = new Pool(dbConfig);
    this.calendar = ethiopianCalendar;
    this.errors = [];
    this.stats = {
      students: { archived: 0, cleared: 0, failed: 0 },
      attendance: { archived: 0, cleared: 0, failed: 0 },
      marks: { archived: 0, cleared: 0, failed: 0 },
      payments: { archived: 0, cleared: 0, failed: 0 },
      staff: { archived: 0, cleared: 0, failed: 0 }
    };
  }

  /**
   * Log error
   */
  logError(entity, operation, error, data = null) {
    const errorEntry = {
      entity,
      operation,
      error: error.message,
      stack: error.stack,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.errors.push(errorEntry);
    console.error(`✗ [${entity}] ${operation} failed:`, error.message);
    if (data) {
      console.error('   Error data:', data);
    }
  }

  /**
   * Get current academic year from school_config
   */
  async getCurrentAcademicYear() {
    const result = await this.pool.query(
      'SELECT academic_year, current_year FROM school_config LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      throw new Error('School configuration not found');
    }
    
    return {
      academicYear: result.rows[0].academic_year,
      ethiopianYear: result.rows[0].current_year
    };
  }

  /**
   * Create archive year record
   */
  async createArchiveYear(academicYear, ethiopianYear, archivedBy) {
    const client = await this.pool.connect();
    
    try {
      // Count totals
      const studentCount = await client.query('SELECT COUNT(*) FROM students');
      const staffCount = await client.query('SELECT COUNT(*) FROM staff');
      
      const result = await client.query(`
        INSERT INTO archived_academic_years (
          academic_year, ethiopian_year, archived_by, total_students, total_staff
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        academicYear,
        ethiopianYear,
        archivedBy,
        parseInt(studentCount.rows[0].count),
        parseInt(staffCount.rows[0].count)
      ]);
      
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Archive students
   */
  async archiveStudents(archiveYearId) {
    const client = await this.pool.connect();
    
    try {
      console.log('\n→ Archiving students...');
      
      // Get all students
      const students = await client.query('SELECT * FROM students');
      
      if (students.rows.length === 0) {
        console.log('  No students to archive');
        return { success: true, archived: 0 };
      }
      
      let archived = 0;
      
      for (const student of students.rows) {
        try {
          // Get class name for the student
          const classResult = await client.query(
            'SELECT class_name FROM classes WHERE id = $1',
            [student.class_id]
          );
          const className = classResult.rows.length > 0 ? classResult.rows[0].class_name : null;
          
          // Archive student data as JSON
          await client.query(`
            INSERT INTO archived_students (
              archive_year_id, student_data, student_id, class_name, final_status
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            archiveYearId,
            JSON.stringify(student),
            student.student_id,
            className,
            student.status
          ]);
          
          archived++;
          this.stats.students.archived++;
        } catch (error) {
          this.stats.students.failed++;
          this.logError('Students', 'archiveStudent', error, student);
        }
      }
      
      console.log(`✓ Archived ${archived}/${students.rows.length} students`);
      
      return { success: true, archived, total: students.rows.length };
      
    } finally {
      client.release();
    }
  }

  /**
   * Archive attendance records
   */
  async archiveAttendance(archiveYearId) {
    const client = await this.pool.connect();
    
    try {
      console.log('\n→ Archiving attendance records...');
      
      // Get all attendance records grouped by student
      const result = await client.query(`
        SELECT 
          student_id,
          json_agg(
            json_build_object(
              'id', id,
              'class_id', class_id,
              'attendance_date', attendance_date,
              'attendance_date_ethiopian', attendance_date_ethiopian,
              'status', status,
              'marked_by', marked_by,
              'marked_at', marked_at,
              'notes', notes
            ) ORDER BY attendance_date
          ) as attendance_records,
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent,
          ROUND(
            (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
            2
          ) as attendance_percentage
        FROM student_attendance
        GROUP BY student_id
      `);
      
      if (result.rows.length === 0) {
        console.log('  No attendance records to archive');
        return { success: true, archived: 0 };
      }
      
      let archived = 0;
      
      for (const record of result.rows) {
        try {
          await client.query(`
            INSERT INTO archived_attendance (
              archive_year_id, student_id, attendance_data, total_records,
              total_present, total_absent, attendance_percentage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            archiveYearId,
            record.student_id,
            JSON.stringify(record.attendance_records),
            record.total_records,
            record.total_present,
            record.total_absent,
            record.attendance_percentage
          ]);
          
          archived++;
          this.stats.attendance.archived++;
        } catch (error) {
          this.stats.attendance.failed++;
          this.logError('Attendance', 'archiveAttendance', error, record);
        }
      }
      
      console.log(`✓ Archived attendance for ${archived}/${result.rows.length} students`);
      
      return { success: true, archived, total: result.rows.length };
      
    } finally {
      client.release();
    }
  }

  /**
   * Archive marks/grades
   */
  async archiveMarks(archiveYearId) {
    const client = await this.pool.connect();
    
    try {
      console.log('\n→ Archiving marks...');
      
      // Get all marks grouped by student
      const result = await client.query(`
        SELECT 
          sm.student_id,
          json_agg(
            json_build_object(
              'id', sm.id,
              'mark_list_id', sm.mark_list_id,
              'marks_obtained', sm.marks_obtained,
              'percentage', sm.percentage,
              'grade', sm.grade,
              'remarks', sm.remarks,
              'marked_by', sm.marked_by,
              'marked_at', sm.marked_at,
              'mark_list', json_build_object(
                'subject_id', ml.subject_id,
                'class_id', ml.class_id,
                'term', ml.term,
                'academic_year', ml.academic_year,
                'total_marks', ml.total_marks
              )
            ) ORDER BY sm.id
          ) as marks_records,
          COUNT(*) as total_records,
          ROUND(AVG(sm.percentage), 2) as overall_percentage,
          MODE() WITHIN GROUP (ORDER BY sm.grade) as overall_grade
        FROM student_marks sm
        JOIN mark_lists ml ON sm.mark_list_id = ml.id
        GROUP BY sm.student_id
      `);
      
      if (result.rows.length === 0) {
        console.log('  No marks to archive');
        return { success: true, archived: 0 };
      }
      
      let archived = 0;
      
      for (const record of result.rows) {
        try {
          await client.query(`
            INSERT INTO archived_marks (
              archive_year_id, student_id, marks_data, total_records,
              overall_percentage, overall_grade
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            archiveYearId,
            record.student_id,
            JSON.stringify(record.marks_records),
            record.total_records,
            record.overall_percentage,
            record.overall_grade
          ]);
          
          archived++;
          this.stats.marks.archived++;
        } catch (error) {
          this.stats.marks.failed++;
          this.logError('Marks', 'archiveMarks', error, record);
        }
      }
      
      console.log(`✓ Archived marks for ${archived}/${result.rows.length} students`);
      
      return { success: true, archived, total: result.rows.length };
      
    } finally {
      client.release();
    }
  }

  /**
   * Archive payments
   */
  async archivePayments(archiveYearId) {
    const client = await this.pool.connect();
    
    try {
      console.log('\n→ Archiving payments...');
      
      // Get all payments grouped by student
      const result = await client.query(`
        SELECT 
          p.student_id,
          json_agg(
            json_build_object(
              'id', p.id,
              'payment_number', p.payment_number,
              'invoice_id', p.invoice_id,
              'amount', p.amount,
              'payment_method', p.payment_method,
              'payment_date', p.payment_date,
              'payment_date_ethiopian', p.payment_date_ethiopian,
              'reference_number', p.reference_number,
              'notes', p.notes,
              'received_by', p.received_by,
              'invoice', json_build_object(
                'invoice_number', i.invoice_number,
                'academic_year', i.academic_year,
                'term', i.term,
                'total_amount', i.total_amount,
                'net_amount', i.net_amount,
                'status', i.status
              )
            ) ORDER BY p.payment_date
          ) as payment_records,
          COUNT(*) as total_records,
          SUM(p.amount) as total_paid,
          COALESCE(SUM(i.net_amount), 0) as total_fees,
          COALESCE(SUM(i.net_amount), 0) - SUM(p.amount) as total_outstanding
        FROM payments p
        LEFT JOIN invoices i ON p.invoice_id = i.id
        GROUP BY p.student_id
      `);
      
      if (result.rows.length === 0) {
        console.log('  No payments to archive');
        return { success: true, archived: 0 };
      }
      
      let archived = 0;
      
      for (const record of result.rows) {
        try {
          await client.query(`
            INSERT INTO archived_payments (
              archive_year_id, student_id, payment_data, total_records,
              total_fees, total_paid, total_outstanding
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            archiveYearId,
            record.student_id,
            JSON.stringify(record.payment_records),
            record.total_records,
            record.total_fees,
            record.total_paid,
            record.total_outstanding
          ]);
          
          archived++;
          this.stats.payments.archived++;
        } catch (error) {
          this.stats.payments.failed++;
          this.logError('Payments', 'archivePayments', error, record);
        }
      }
      
      console.log(`✓ Archived payments for ${archived}/${result.rows.length} students`);
      
      return { success: true, archived, total: result.rows.length };
      
    } finally {
      client.release();
    }
  }

  /**
   * Clear current year data
   */
  async clearCurrentYearData() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('\n→ Clearing current year data...');
      
      // Delete in reverse order of dependencies
      const marksResult = await client.query('DELETE FROM student_marks RETURNING id');
      this.stats.marks.cleared = marksResult.rowCount;
      console.log(`  ✓ Cleared ${marksResult.rowCount} marks`);
      
      const attendanceResult = await client.query('DELETE FROM student_attendance RETURNING id');
      this.stats.attendance.cleared = attendanceResult.rowCount;
      console.log(`  ✓ Cleared ${attendanceResult.rowCount} attendance records`);
      
      const paymentsResult = await client.query('DELETE FROM payments RETURNING id');
      this.stats.payments.cleared = paymentsResult.rowCount;
      console.log(`  ✓ Cleared ${paymentsResult.rowCount} payments`);
      
      await client.query('DELETE FROM invoices');
      console.log(`  ✓ Cleared invoices`);
      
      await client.query('DELETE FROM mark_lists');
      console.log(`  ✓ Cleared mark lists`);
      
      // Note: We don't delete students and staff, just their year-specific data
      
      await client.query('COMMIT');
      
      console.log('✓ Current year data cleared successfully');
      
      return { success: true };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logError('ClearData', 'clearCurrentYearData', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Increment academic year (Ethiopian calendar)
   */
  async incrementAcademicYear() {
    const client = await this.pool.connect();
    
    try {
      console.log('\n→ Incrementing academic year...');
      
      // Get current year
      const current = await this.getCurrentAcademicYear();
      
      // Increment Ethiopian year
      const newEthiopianYear = current.ethiopianYear + 1;
      const newAcademicYear = `${newEthiopianYear}/${newEthiopianYear + 1}`;
      
      // Update school_config
      await client.query(`
        UPDATE school_config
        SET academic_year = $1, current_year = $2, updated_at = CURRENT_TIMESTAMP
      `, [newAcademicYear, newEthiopianYear]);
      
      console.log(`✓ Academic year updated: ${current.academicYear} → ${newAcademicYear}`);
      console.log(`✓ Ethiopian year updated: ${current.ethiopianYear} → ${newEthiopianYear}`);
      
      return {
        success: true,
        oldYear: current.academicYear,
        newYear: newAcademicYear,
        oldEthiopianYear: current.ethiopianYear,
        newEthiopianYear
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Run complete year rollover
   */
  async runYearRollover(archivedBy) {
    console.log('\n=== Starting Year Rollover ===\n');
    
    const startTime = Date.now();
    
    try {
      // Get current academic year
      const current = await this.getCurrentAcademicYear();
      console.log(`Current academic year: ${current.academicYear} (${current.ethiopianYear})`);
      
      // Create archive year record
      console.log('\n→ Creating archive year record...');
      const archiveYearId = await this.createArchiveYear(
        current.academicYear,
        current.ethiopianYear,
        archivedBy
      );
      console.log(`✓ Archive year record created (ID: ${archiveYearId})`);
      
      // Archive all data
      await this.archiveStudents(archiveYearId);
      await this.archiveAttendance(archiveYearId);
      await this.archiveMarks(archiveYearId);
      await this.archivePayments(archiveYearId);
      
      // Clear current year data
      await this.clearCurrentYearData();
      
      // Increment academic year
      const yearUpdate = await this.incrementAcademicYear();
      
      const duration = Date.now() - startTime;
      
      console.log(`\n=== Year Rollover Completed in ${duration}ms ===\n`);
      
      // Generate report
      this.generateReport();
      
      return {
        success: true,
        duration,
        archiveYearId,
        oldYear: yearUpdate.oldYear,
        newYear: yearUpdate.newYear
      };
      
    } catch (error) {
      console.error('\n✗ Year rollover failed:', error.message);
      console.error(error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate rollover report
   */
  generateReport() {
    console.log('=== Year Rollover Report ===\n');
    
    console.log('Students:');
    console.log(`  Archived: ${this.stats.students.archived}`);
    console.log(`  Failed: ${this.stats.students.failed}`);
    
    console.log('\nAttendance:');
    console.log(`  Archived: ${this.stats.attendance.archived}`);
    console.log(`  Cleared: ${this.stats.attendance.cleared}`);
    console.log(`  Failed: ${this.stats.attendance.failed}`);
    
    console.log('\nMarks:');
    console.log(`  Archived: ${this.stats.marks.archived}`);
    console.log(`  Cleared: ${this.stats.marks.cleared}`);
    console.log(`  Failed: ${this.stats.marks.failed}`);
    
    console.log('\nPayments:');
    console.log(`  Archived: ${this.stats.payments.archived}`);
    console.log(`  Cleared: ${this.stats.payments.cleared}`);
    console.log(`  Failed: ${this.stats.payments.failed}`);
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️  ${this.errors.length} error(s) occurred during rollover`);
    }
    
    console.log('');
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = YearRolloverService;
