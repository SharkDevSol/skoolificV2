/**
 * V1 to V2 Migration Class - Additional Methods (Part 3)
 * These methods should be added to the V1toV2Migration class
 */

// Add these methods to the V1toV2Migration class:

/**
 * Migrate subjects
 */
async migrateSubjects() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    this.log('INFO', 'Subjects', 'Starting subjects migration...');
    
    // Get V1 subjects
    const v1Result = await client.query('SELECT DISTINCT ON (subject_name) * FROM subjects ORDER BY subject_name, id');
    
    if (v1Result.rows.length === 0) {
      this.log('INFO', 'Subjects', 'No subjects found in V1, skipping...');
      await client.query('COMMIT');
      return { success: true, migrated: 0 };
    }
    
    let migrated = 0;
    
    for (const v1Subject of v1Result.rows) {
      try {
        this.stats.subjects.attempted++;
        
        // Transform V1 to V2 schema
        const v2Subject = {
          subject_name: v1Subject.subject_name,
          subject_code: v1Subject.subject_code || v1Subject.subject_name.substring(0, 3).toUpperCase(),
          grade_level: v1Subject.grade_level || null,
          is_active: v1Subject.is_active !== undefined ? v1Subject.is_active : true
        };
        
        // Insert into V2 schema
        await client.query(`
          INSERT INTO subjects (
            subject_name, subject_code, grade_level, is_active
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (subject_name) DO UPDATE SET
            subject_code = EXCLUDED.subject_code,
            grade_level = EXCLUDED.grade_level,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v2Subject.subject_name,
          v2Subject.subject_code,
          v2Subject.grade_level,
          v2Subject.is_active
        ]);
        
        migrated++;
        this.stats.subjects.success++;
        
      } catch (error) {
        this.stats.subjects.failed++;
        this.logError('Subjects', 'migrateSubject', error, v1Subject);
      }
    }
    
    await client.query('COMMIT');
    
    this.log('SUCCESS', 'Subjects', `Migrated ${migrated}/${v1Result.rows.length} subjects`);
    
    return { success: true, migrated, total: v1Result.rows.length };
    
  } catch (error) {
    await client.query('ROLLBACK');
    this.logError('Subjects', 'migrateSubjects', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Migrate attendance records
 */
async migrateAttendance() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    this.log('INFO', 'Attendance', 'Starting attendance migration...');
    
    // Get V1 attendance (from student_attendance table)
    const v1Result = await client.query('SELECT * FROM student_attendance ORDER BY id');
    
    if (v1Result.rows.length === 0) {
      this.log('INFO', 'Attendance', 'No attendance records found in V1, skipping...');
      await client.query('COMMIT');
      return { success: true, migrated: 0 };
    }
    
    let migrated = 0;
    
    for (const v1Attendance of v1Result.rows) {
      try {
        this.stats.attendance.attempted++;
        
        // Transform V1 to V2 schema
        const v2Attendance = {
          student_id: v1Attendance.student_id,
          class_id: v1Attendance.class_id,
          attendance_date: v1Attendance.attendance_date || v1Attendance.date,
          attendance_date_ethiopian: v1Attendance.attendance_date_ethiopian,
          status: v1Attendance.status || 'present',
          marked_by: v1Attendance.marked_by,
          marked_at: v1Attendance.marked_at,
          notes: v1Attendance.notes,
          sync_status: v1Attendance.sync_status || 'synced'
        };
        
        // Insert into V2 schema
        await client.query(`
          INSERT INTO student_attendance (
            student_id, class_id, attendance_date, attendance_date_ethiopian,
            status, marked_by, marked_at, notes, sync_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (student_id, attendance_date) DO UPDATE SET
            class_id = EXCLUDED.class_id,
            attendance_date_ethiopian = EXCLUDED.attendance_date_ethiopian,
            status = EXCLUDED.status,
            marked_by = EXCLUDED.marked_by,
            marked_at = EXCLUDED.marked_at,
            notes = EXCLUDED.notes,
            sync_status = EXCLUDED.sync_status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v2Attendance.student_id,
          v2Attendance.class_id,
          v2Attendance.attendance_date,
          v2Attendance.attendance_date_ethiopian,
          v2Attendance.status,
          v2Attendance.marked_by,
          v2Attendance.marked_at,
          v2Attendance.notes,
          v2Attendance.sync_status
        ]);
        
        migrated++;
        this.stats.attendance.success++;
        
      } catch (error) {
        this.stats.attendance.failed++;
        this.logError('Attendance', 'migrateAttendance', error, v1Attendance);
      }
    }
    
    await client.query('COMMIT');
    
    this.log('SUCCESS', 'Attendance', `Migrated ${migrated}/${v1Result.rows.length} attendance records`);
    
    return { success: true, migrated, total: v1Result.rows.length };
    
  } catch (error) {
    await client.query('ROLLBACK');
    this.logError('Attendance', 'migrateAttendance', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Migrate marks/grades
 */
async migrateMarks() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    this.log('INFO', 'Marks', 'Starting marks migration...');
    
    // Get V1 marks (from student_marks table)
    const v1Result = await client.query('SELECT * FROM student_marks ORDER BY id');
    
    if (v1Result.rows.length === 0) {
      this.log('INFO', 'Marks', 'No marks found in V1, skipping...');
      await client.query('COMMIT');
      return { success: true, migrated: 0 };
    }
    
    let migrated = 0;
    
    for (const v1Mark of v1Result.rows) {
      try {
        this.stats.marks.attempted++;
        
        // Transform V1 to V2 schema
        const v2Mark = {
          mark_list_id: v1Mark.mark_list_id,
          student_id: v1Mark.student_id,
          marks_obtained: v1Mark.marks_obtained,
          percentage: v1Mark.percentage,
          grade: v1Mark.grade,
          remarks: v1Mark.remarks,
          marked_by: v1Mark.marked_by,
          marked_at: v1Mark.marked_at,
          sync_status: v1Mark.sync_status || 'synced'
        };
        
        // Insert into V2 schema
        await client.query(`
          INSERT INTO student_marks (
            mark_list_id, student_id, marks_obtained, percentage, grade,
            remarks, marked_by, marked_at, sync_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (mark_list_id, student_id) DO UPDATE SET
            marks_obtained = EXCLUDED.marks_obtained,
            percentage = EXCLUDED.percentage,
            grade = EXCLUDED.grade,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            marked_at = EXCLUDED.marked_at,
            sync_status = EXCLUDED.sync_status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v2Mark.mark_list_id,
          v2Mark.student_id,
          v2Mark.marks_obtained,
          v2Mark.percentage,
          v2Mark.grade,
          v2Mark.remarks,
          v2Mark.marked_by,
          v2Mark.marked_at,
          v2Mark.sync_status
        ]);
        
        migrated++;
        this.stats.marks.success++;
        
      } catch (error) {
        this.stats.marks.failed++;
        this.logError('Marks', 'migrateMark', error, v1Mark);
      }
    }
    
    await client.query('COMMIT');
    
    this.log('SUCCESS', 'Marks', `Migrated ${migrated}/${v1Result.rows.length} marks`);
    
    return { success: true, migrated, total: v1Result.rows.length };
    
  } catch (error) {
    await client.query('ROLLBACK');
    this.logError('Marks', 'migrateMarks', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Migrate financial records (invoices, payments, fee structures)
 */
async migrateFinancialRecords() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    this.log('INFO', 'FinancialRecords', 'Starting financial records migration...');
    
    let totalMigrated = 0;
    
    // Migrate fee structures
    const feeStructuresResult = await client.query('SELECT * FROM fee_structures ORDER BY id');
    for (const v1Fee of feeStructuresResult.rows) {
      try {
        this.stats.financialRecords.attempted++;
        
        await client.query(`
          INSERT INTO fee_structures (
            name, academic_year, grade_level, class_id, fee_type, amount,
            is_recurring, recurrence_pattern, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            academic_year = EXCLUDED.academic_year,
            grade_level = EXCLUDED.grade_level,
            class_id = EXCLUDED.class_id,
            fee_type = EXCLUDED.fee_type,
            amount = EXCLUDED.amount,
            is_recurring = EXCLUDED.is_recurring,
            recurrence_pattern = EXCLUDED.recurrence_pattern,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v1Fee.name,
          v1Fee.academic_year,
          v1Fee.grade_level,
          v1Fee.class_id,
          v1Fee.fee_type,
          v1Fee.amount,
          v1Fee.is_recurring,
          v1Fee.recurrence_pattern,
          v1Fee.is_active
        ]);
        
        totalMigrated++;
        this.stats.financialRecords.success++;
      } catch (error) {
        this.stats.financialRecords.failed++;
        this.logError('FinancialRecords', 'migrateFeeStructure', error, v1Fee);
      }
    }
    
    // Migrate invoices
    const invoicesResult = await client.query('SELECT * FROM invoices ORDER BY id');
    for (const v1Invoice of invoicesResult.rows) {
      try {
        this.stats.financialRecords.attempted++;
        
        await client.query(`
          INSERT INTO invoices (
            invoice_number, student_id, academic_year, term, total_amount,
            discount_amount, net_amount, paid_amount, outstanding_amount,
            status, due_date, due_date_ethiopian, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (invoice_number) DO UPDATE SET
            student_id = EXCLUDED.student_id,
            academic_year = EXCLUDED.academic_year,
            term = EXCLUDED.term,
            total_amount = EXCLUDED.total_amount,
            discount_amount = EXCLUDED.discount_amount,
            net_amount = EXCLUDED.net_amount,
            paid_amount = EXCLUDED.paid_amount,
            outstanding_amount = EXCLUDED.outstanding_amount,
            status = EXCLUDED.status,
            due_date = EXCLUDED.due_date,
            due_date_ethiopian = EXCLUDED.due_date_ethiopian,
            created_by = EXCLUDED.created_by,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v1Invoice.invoice_number,
          v1Invoice.student_id,
          v1Invoice.academic_year,
          v1Invoice.term,
          v1Invoice.total_amount,
          v1Invoice.discount_amount,
          v1Invoice.net_amount,
          v1Invoice.paid_amount,
          v1Invoice.outstanding_amount,
          v1Invoice.status,
          v1Invoice.due_date,
          v1Invoice.due_date_ethiopian,
          v1Invoice.created_by
        ]);
        
        totalMigrated++;
        this.stats.financialRecords.success++;
      } catch (error) {
        this.stats.financialRecords.failed++;
        this.logError('FinancialRecords', 'migrateInvoice', error, v1Invoice);
      }
    }
    
    // Migrate payments
    const paymentsResult = await client.query('SELECT * FROM payments ORDER BY id');
    for (const v1Payment of paymentsResult.rows) {
      try {
        this.stats.financialRecords.attempted++;
        
        await client.query(`
          INSERT INTO payments (
            payment_number, invoice_id, student_id, amount, payment_method,
            payment_date, payment_date_ethiopian, reference_number, notes,
            received_by, sync_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (payment_number) DO UPDATE SET
            invoice_id = EXCLUDED.invoice_id,
            student_id = EXCLUDED.student_id,
            amount = EXCLUDED.amount,
            payment_method = EXCLUDED.payment_method,
            payment_date = EXCLUDED.payment_date,
            payment_date_ethiopian = EXCLUDED.payment_date_ethiopian,
            reference_number = EXCLUDED.reference_number,
            notes = EXCLUDED.notes,
            received_by = EXCLUDED.received_by,
            sync_status = EXCLUDED.sync_status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v1Payment.payment_number,
          v1Payment.invoice_id,
          v1Payment.student_id,
          v1Payment.amount,
          v1Payment.payment_method,
          v1Payment.payment_date,
          v1Payment.payment_date_ethiopian,
          v1Payment.reference_number,
          v1Payment.notes,
          v1Payment.received_by,
          v1Payment.sync_status
        ]);
        
        totalMigrated++;
        this.stats.financialRecords.success++;
      } catch (error) {
        this.stats.financialRecords.failed++;
        this.logError('FinancialRecords', 'migratePayment', error, v1Payment);
      }
    }
    
    await client.query('COMMIT');
    
    this.log('SUCCESS', 'FinancialRecords', `Migrated ${totalMigrated} financial records`);
    
    return { success: true, migrated: totalMigrated };
    
  } catch (error) {
    await client.query('ROLLBACK');
    this.logError('FinancialRecords', 'migrateFinancialRecords', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Run all migrations in sequence
 */
async runAllMigrations() {
  console.log('\n=== Starting V1 to V2 Migration ===\n');
  
  const startTime = Date.now();
  
  try {
    // Run migrations in order
    await this.migrateSchoolConfig();
    await this.migrateClasses();
    await this.migrateGuardians();
    await this.migrateStudents();
    await this.migrateStaff();
    await this.migrateSubjects();
    await this.migrateAttendance();
    await this.migrateMarks();
    await this.migrateFinancialRecords();
    
    const duration = Date.now() - startTime;
    
    console.log(`\n=== Migration Completed in ${duration}ms ===\n`);
    
    // Generate report
    this.generateReport();
    
    // Save log
    await this.saveMigrationLog();
    
    return { success: true, duration };
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Rollback migration (delete all migrated data)
 */
async rollback() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n⚠️  Rolling back migration...\n');
    
    // Delete in reverse order of dependencies
    await client.query('DELETE FROM student_marks');
    console.log('✓ Deleted marks');
    
    await client.query('DELETE FROM student_attendance');
    console.log('✓ Deleted attendance');
    
    await client.query('DELETE FROM payments');
    console.log('✓ Deleted payments');
    
    await client.query('DELETE FROM invoices');
    console.log('✓ Deleted invoices');
    
    await client.query('DELETE FROM fee_structures');
    console.log('✓ Deleted fee structures');
    
    await client.query('DELETE FROM students');
    console.log('✓ Deleted students');
    
    await client.query('DELETE FROM staff');
    console.log('✓ Deleted staff');
    
    await client.query('DELETE FROM guardians');
    console.log('✓ Deleted guardians');
    
    await client.query('DELETE FROM subjects');
    console.log('✓ Deleted subjects');
    
    await client.query('DELETE FROM classes');
    console.log('✓ Deleted classes');
    
    await client.query('DELETE FROM school_config');
    console.log('✓ Deleted school config');
    
    await client.query('COMMIT');
    
    console.log('\n✓ Rollback completed successfully\n');
    
    return { success: true };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n✗ Rollback failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
