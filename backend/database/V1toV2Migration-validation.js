/**
 * V1 to V2 Migration Validation Methods
 * Add these methods to the V1toV2Migration class
 */

/**
 * Validate migration by comparing record counts
 */
async validateMigration() {
  console.log('\n=== Validating Migration ===\n');
  
  const validationResults = {
    timestamp: new Date().toISOString(),
    entities: {},
    overall: { passed: 0, failed: 0, warnings: 0 }
  };
  
  try {
    // Validate school config
    const schoolConfigResult = await this.validateEntity(
      'school_config',
      'school_config',
      'SchoolConfig'
    );
    validationResults.entities.schoolConfig = schoolConfigResult;
    
    // Validate classes
    const classesResult = await this.validateEntity(
      'classes',
      'classes',
      'Classes'
    );
    validationResults.entities.classes = classesResult;
    
    // Validate students
    const studentsResult = await this.validateEntity(
      'students',
      'students',
      'Students',
      'student_id'
    );
    validationResults.entities.students = studentsResult;
    
    // Validate staff
    const staffResult = await this.validateEntity(
      'staff',
      'staff',
      'Staff',
      'staff_id'
    );
    validationResults.entities.staff = staffResult;
    
    // Validate guardians
    const guardiansResult = await this.validateEntity(
      'guardians',
      'guardians',
      'Guardians',
      'guardian_id'
    );
    validationResults.entities.guardians = guardiansResult;
    
    // Validate subjects
    const subjectsResult = await this.validateEntity(
      'subjects',
      'subjects',
      'Subjects',
      'subject_name'
    );
    validationResults.entities.subjects = subjectsResult;
    
    // Validate attendance
    const attendanceResult = await this.validateEntity(
      'student_attendance',
      'student_attendance',
      'Attendance'
    );
    validationResults.entities.attendance = attendanceResult;
    
    // Validate marks
    const marksResult = await this.validateEntity(
      'student_marks',
      'student_marks',
      'Marks'
    );
    validationResults.entities.marks = marksResult;
    
    // Validate financial records
    const feeStructuresResult = await this.validateEntity(
      'fee_structures',
      'fee_structures',
      'FeeStructures'
    );
    validationResults.entities.feeStructures = feeStructuresResult;
    
    const invoicesResult = await this.validateEntity(
      'invoices',
      'invoices',
      'Invoices',
      'invoice_number'
    );
    validationResults.entities.invoices = invoicesResult;
    
    const paymentsResult = await this.validateEntity(
      'payments',
      'payments',
      'Payments',
      'payment_number'
    );
    validationResults.entities.payments = paymentsResult;
    
    // Calculate overall results
    for (const result of Object.values(validationResults.entities)) {
      if (result.status === 'PASS') {
        validationResults.overall.passed++;
      } else if (result.status === 'FAIL') {
        validationResults.overall.failed++;
      } else if (result.status === 'WARNING') {
        validationResults.overall.warnings++;
      }
    }
    
    // Print summary
    console.log('\n=== Validation Summary ===\n');
    console.log(`Passed: ${validationResults.overall.passed}`);
    console.log(`Failed: ${validationResults.overall.failed}`);
    console.log(`Warnings: ${validationResults.overall.warnings}`);
    
    if (validationResults.overall.failed === 0) {
      console.log('\n✓ All validations passed!\n');
    } else {
      console.log('\n✗ Some validations failed. Check details above.\n');
    }
    
    // Save validation report
    await this.saveValidationReport(validationResults);
    
    return validationResults;
    
  } catch (error) {
    console.error('✗ Validation error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Validate a single entity by comparing V1 and V2 counts
 */
async validateEntity(v1Table, v2Table, entityName, uniqueKey = 'id') {
  try {
    // Get V1 count
    const v1Result = await this.pool.query(`SELECT COUNT(*) as count FROM ${v1Table}`);
    const v1Count = parseInt(v1Result.rows[0].count);
    
    // Get V2 count
    const v2Result = await this.pool.query(`SELECT COUNT(*) as count FROM ${v2Table}`);
    const v2Count = parseInt(v2Result.rows[0].count);
    
    // Compare counts
    const match = v1Count === v2Count;
    const difference = v2Count - v1Count;
    
    let status = 'PASS';
    let message = `Counts match: ${v1Count} records`;
    
    if (!match) {
      if (v1Count === 0 && v2Count === 0) {
        status = 'PASS';
        message = 'Both tables empty (no data to migrate)';
      } else if (difference > 0) {
        status = 'WARNING';
        message = `V2 has ${difference} more records than V1 (possible duplicates or pre-existing data)`;
      } else {
        status = 'FAIL';
        message = `V2 has ${Math.abs(difference)} fewer records than V1 (data loss detected!)`;
      }
    }
    
    // Log result
    const icon = status === 'PASS' ? '✓' : status === 'WARNING' ? '⚠' : '✗';
    console.log(`${icon} ${entityName}: ${message}`);
    console.log(`   V1: ${v1Count} | V2: ${v2Count}`);
    
    // Additional validation: check for duplicates in V2
    if (uniqueKey !== 'id') {
      const duplicatesResult = await this.pool.query(`
        SELECT ${uniqueKey}, COUNT(*) as count
        FROM ${v2Table}
        GROUP BY ${uniqueKey}
        HAVING COUNT(*) > 1
      `);
      
      if (duplicatesResult.rows.length > 0) {
        console.log(`   ⚠ Found ${duplicatesResult.rows.length} duplicate ${uniqueKey} values in V2`);
        status = 'WARNING';
      }
    }
    
    return {
      entity: entityName,
      v1Table,
      v2Table,
      v1Count,
      v2Count,
      difference,
      match,
      status,
      message
    };
    
  } catch (error) {
    console.log(`✗ ${entityName}: Validation error - ${error.message}`);
    return {
      entity: entityName,
      v1Table,
      v2Table,
      status: 'ERROR',
      message: error.message
    };
  }
}

/**
 * Validate data integrity (foreign keys, relationships)
 */
async validateDataIntegrity() {
  console.log('\n=== Validating Data Integrity ===\n');
  
  const integrityResults = {
    timestamp: new Date().toISOString(),
    checks: [],
    passed: 0,
    failed: 0
  };
  
  try {
    // Check 1: Students with invalid class_id
    const invalidClassResult = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.class_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id)
    `);
    
    const invalidClassCount = parseInt(invalidClassResult.rows[0].count);
    const classCheck = {
      name: 'Students with invalid class_id',
      passed: invalidClassCount === 0,
      count: invalidClassCount,
      message: invalidClassCount === 0 
        ? 'All students have valid class references' 
        : `${invalidClassCount} students have invalid class_id`
    };
    integrityResults.checks.push(classCheck);
    if (classCheck.passed) integrityResults.passed++; else integrityResults.failed++;
    console.log(`${classCheck.passed ? '✓' : '✗'} ${classCheck.message}`);
    
    // Check 2: Students with invalid guardian_id
    const invalidGuardianResult = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.guardian_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM guardians g WHERE g.id = s.guardian_id)
    `);
    
    const invalidGuardianCount = parseInt(invalidGuardianResult.rows[0].count);
    const guardianCheck = {
      name: 'Students with invalid guardian_id',
      passed: invalidGuardianCount === 0,
      count: invalidGuardianCount,
      message: invalidGuardianCount === 0 
        ? 'All students have valid guardian references' 
        : `${invalidGuardianCount} students have invalid guardian_id`
    };
    integrityResults.checks.push(guardianCheck);
    if (guardianCheck.passed) integrityResults.passed++; else integrityResults.failed++;
    console.log(`${guardianCheck.passed ? '✓' : '✗'} ${guardianCheck.message}`);
    
    // Check 3: Attendance with invalid student_id
    const invalidAttendanceResult = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM student_attendance a
      WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = a.student_id)
    `);
    
    const invalidAttendanceCount = parseInt(invalidAttendanceResult.rows[0].count);
    const attendanceCheck = {
      name: 'Attendance with invalid student_id',
      passed: invalidAttendanceCount === 0,
      count: invalidAttendanceCount,
      message: invalidAttendanceCount === 0 
        ? 'All attendance records have valid student references' 
        : `${invalidAttendanceCount} attendance records have invalid student_id`
    };
    integrityResults.checks.push(attendanceCheck);
    if (attendanceCheck.passed) integrityResults.passed++; else integrityResults.failed++;
    console.log(`${attendanceCheck.passed ? '✓' : '✗'} ${attendanceCheck.message}`);
    
    // Check 4: Marks with invalid student_id
    const invalidMarksResult = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM student_marks m
      WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = m.student_id)
    `);
    
    const invalidMarksCount = parseInt(invalidMarksResult.rows[0].count);
    const marksCheck = {
      name: 'Marks with invalid student_id',
      passed: invalidMarksCount === 0,
      count: invalidMarksCount,
      message: invalidMarksCount === 0 
        ? 'All marks have valid student references' 
        : `${invalidMarksCount} marks have invalid student_id`
    };
    integrityResults.checks.push(marksCheck);
    if (marksCheck.passed) integrityResults.passed++; else integrityResults.failed++;
    console.log(`${marksCheck.passed ? '✓' : '✗'} ${marksCheck.message}`);
    
    // Check 5: Payments with invalid student_id
    const invalidPaymentsResult = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM payments p
      WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = p.student_id)
    `);
    
    const invalidPaymentsCount = parseInt(invalidPaymentsResult.rows[0].count);
    const paymentsCheck = {
      name: 'Payments with invalid student_id',
      passed: invalidPaymentsCount === 0,
      count: invalidPaymentsCount,
      message: invalidPaymentsCount === 0 
        ? 'All payments have valid student references' 
        : `${invalidPaymentsCount} payments have invalid student_id`
    };
    integrityResults.checks.push(paymentsCheck);
    if (paymentsCheck.passed) integrityResults.passed++; else integrityResults.failed++;
    console.log(`${paymentsCheck.passed ? '✓' : '✗'} ${paymentsCheck.message}`);
    
    // Print summary
    console.log('\n=== Integrity Check Summary ===\n');
    console.log(`Passed: ${integrityResults.passed}`);
    console.log(`Failed: ${integrityResults.failed}`);
    
    if (integrityResults.failed === 0) {
      console.log('\n✓ All integrity checks passed!\n');
    } else {
      console.log('\n✗ Some integrity checks failed. Data relationships may be broken.\n');
    }
    
    return integrityResults;
    
  } catch (error) {
    console.error('✗ Integrity validation error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Save validation report to file
 */
async saveValidationReport(validationResults, filename = 'validation-report.json') {
  const logPath = path.join(__dirname, 'logs', filename);
  
  try {
    // Ensure logs directory exists
    await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });
    
    await fs.writeFile(logPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n✓ Validation report saved to: ${logPath}`);
    
  } catch (error) {
    console.error('Failed to save validation report:', error.message);
  }
}

/**
 * Generate sample V1 data for testing
 */
async generateSampleData() {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n=== Generating Sample V1 Data ===\n');
    
    // Generate school config
    await client.query(`
      INSERT INTO school_config (
        school_name, academic_year, current_term, term_count,
        periods_per_shift, period_duration_minutes, short_break_duration,
        shift_count, shift_rotation_enabled, school_days, teaching_days_per_week,
        has_kg, has_evening_class
      ) VALUES (
        'Test School', '2016', 1, 3,
        8, 45, 15,
        1, false, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', 5,
        false, false
      )
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✓ Generated school config');
    
    // Generate classes
    const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    for (const className of classes) {
      await client.query(`
        INSERT INTO classes (class_name, class_type, capacity)
        VALUES ($1, 'regular', 50)
        ON CONFLICT (class_name) DO NOTHING
      `, [className]);
    }
    console.log(`✓ Generated ${classes.length} classes`);
    
    // Generate guardians
    for (let i = 1; i <= 10; i++) {
      await client.query(`
        INSERT INTO guardians (
          guardian_id, first_name, last_name, relationship, phone_number
        ) VALUES ($1, $2, $3, 'Father', $4)
        ON CONFLICT (guardian_id) DO NOTHING
      `, [`GRD${String(i).padStart(3, '0')}`, `Guardian${i}`, `LastName${i}`, `+251911${String(i).padStart(6, '0')}`]);
    }
    console.log('✓ Generated 10 guardians');
    
    // Generate students
    const classIds = await client.query('SELECT id FROM classes LIMIT 5');
    const guardianIds = await client.query('SELECT id FROM guardians LIMIT 10');
    
    for (let i = 1; i <= 50; i++) {
      const classId = classIds.rows[i % classIds.rows.length].id;
      const guardianId = guardianIds.rows[i % guardianIds.rows.length].id;
      
      await client.query(`
        INSERT INTO students (
          student_id, first_name, last_name, class_id, guardian_id,
          gender, status, academic_year, enrollment_date
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', '2016', CURRENT_DATE)
        ON CONFLICT (student_id) DO NOTHING
      `, [
        `STU${String(i).padStart(4, '0')}`,
        `Student${i}`,
        `LastName${i}`,
        classId,
        guardianId,
        i % 2 === 0 ? 'Male' : 'Female'
      ]);
    }
    console.log('✓ Generated 50 students');
    
    // Generate staff
    for (let i = 1; i <= 10; i++) {
      await client.query(`
        INSERT INTO staff (
          staff_id, first_name, last_name, staff_type, status, hire_date
        ) VALUES ($1, $2, $3, 'teacher', 'active', CURRENT_DATE)
        ON CONFLICT (staff_id) DO NOTHING
      `, [`STF${String(i).padStart(3, '0')}`, `Teacher${i}`, `LastName${i}`]);
    }
    console.log('✓ Generated 10 staff members');
    
    // Generate subjects
    const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography'];
    for (const subject of subjects) {
      await client.query(`
        INSERT INTO subjects (subject_name, subject_code, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (subject_name) DO NOTHING
      `, [subject, subject.substring(0, 3).toUpperCase()]);
    }
    console.log(`✓ Generated ${subjects.length} subjects`);
    
    await client.query('COMMIT');
    
    console.log('\n✓ Sample data generation completed\n');
    
    return { success: true };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Sample data generation failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
