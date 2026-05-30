/**
 * V1 to V2 Migration Class
 * Handles data migration from Skoolific V1 to V2 database schema
 * 
 * Features:
 * - Entity-by-entity migration with error logging
 * - Transaction-based operations for data integrity
 * - Rollback functionality for failed migrations
 * - Progress tracking and reporting
 * - Data validation and transformation
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

class V1toV2Migration {
  constructor(dbConfig) {
    this.pool = new Pool(dbConfig);
    this.errors = [];
    this.migrationLog = [];
    this.stats = {
      schoolConfig: { attempted: 0, success: 0, failed: 0 },
      classes: { attempted: 0, success: 0, failed: 0 },
      students: { attempted: 0, success: 0, failed: 0 },
      staff: { attempted: 0, success: 0, failed: 0 },
      guardians: { attempted: 0, success: 0, failed: 0 },
      subjects: { attempted: 0, success: 0, failed: 0 },
      attendance: { attempted: 0, success: 0, failed: 0 },
      marks: { attempted: 0, success: 0, failed: 0 },
      financialRecords: { attempted: 0, success: 0, failed: 0 }
    };
  }

  /**
   * Log migration event
   */
  log(level, entity, message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      entity,
      message,
      data
    };
    
    this.migrationLog.push(logEntry);
    
    const prefix = level === 'ERROR' ? '✗' : level === 'SUCCESS' ? '✓' : '→';
    console.log(`${prefix} [${entity}] ${message}`);
    
    if (data && level === 'ERROR') {
      console.error('   Error details:', data);
    }
  }

  /**
   * Log error
   */
  logError(entity, operation, error, recordData = null) {
    const errorEntry = {
      entity,
      operation,
      error: error.message,
      stack: error.stack,
      recordData,
      timestamp: new Date().toISOString()
    };
    
    this.errors.push(errorEntry);
    this.log('ERROR', entity, `${operation} failed: ${error.message}`, recordData);
  }

  /**
   * Migrate school configuration
   */
  async migrateSchoolConfig() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', 'SchoolConfig', 'Starting school configuration migration...');
      
      // Get V1 school config
      const v1Result = await client.query('SELECT * FROM school_config LIMIT 1');
      
      if (v1Result.rows.length === 0) {
        this.log('INFO', 'SchoolConfig', 'No school config found in V1, skipping...');
        await client.query('COMMIT');
        return { success: true, migrated: 0 };
      }
      
      const v1Config = v1Result.rows[0];
      this.stats.schoolConfig.attempted++;
      
      // Transform V1 to V2 schema
      const v2Config = {
        academic_year: v1Config.academic_year || v1Config.current_year || '2016',
        current_term: v1Config.current_term || 1,
        term_count: v1Config.term_count || v1Config.number_of_terms || 3,
        periods_per_shift: v1Config.periods_per_shift || 8,
        period_duration_minutes: v1Config.period_duration_minutes || v1Config.period_duration || 45,
        short_break_duration: v1Config.short_break_duration || 15,
        shift_count: v1Config.shift_count || v1Config.total_shifts || 1,
        shift_rotation_enabled: v1Config.shift_rotation_enabled || false,
        school_days: v1Config.school_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        teaching_days_per_week: v1Config.teaching_days_per_week || 5,
        has_kg: v1Config.has_kg || false,
        has_evening_class: v1Config.has_evening_class || false,
        additional_languages: v1Config.additional_languages || []
      };
      
      // Insert into V2 schema
      await client.query(`
        INSERT INTO school_config (
          academic_year, current_term, term_count,
          periods_per_shift, period_duration_minutes, short_break_duration,
          shift_count, shift_rotation_enabled, school_days, teaching_days_per_week,
          has_kg, has_evening_class, additional_languages
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          academic_year = EXCLUDED.academic_year,
          current_term = EXCLUDED.current_term,
          term_count = EXCLUDED.term_count,
          periods_per_shift = EXCLUDED.periods_per_shift,
          period_duration_minutes = EXCLUDED.period_duration_minutes,
          short_break_duration = EXCLUDED.short_break_duration,
          shift_count = EXCLUDED.shift_count,
          shift_rotation_enabled = EXCLUDED.shift_rotation_enabled,
          school_days = EXCLUDED.school_days,
          teaching_days_per_week = EXCLUDED.teaching_days_per_week,
          has_kg = EXCLUDED.has_kg,
          has_evening_class = EXCLUDED.has_evening_class,
          additional_languages = EXCLUDED.additional_languages,
          updated_at = CURRENT_TIMESTAMP
      `, [
        v2Config.academic_year,
        v2Config.current_term,
        v2Config.term_count,
        v2Config.periods_per_shift,
        v2Config.period_duration_minutes,
        v2Config.short_break_duration,
        v2Config.shift_count,
        v2Config.shift_rotation_enabled,
        JSON.stringify(v2Config.school_days),
        v2Config.teaching_days_per_week,
        v2Config.has_kg,
        v2Config.has_evening_class,
        JSON.stringify(v2Config.additional_languages)
      ]);
      
      await client.query('COMMIT');
      
      this.stats.schoolConfig.success++;
      this.log('SUCCESS', 'SchoolConfig', 'School configuration migrated successfully');
      
      return { success: true, migrated: 1 };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.stats.schoolConfig.failed++;
      this.logError('SchoolConfig', 'migrateSchoolConfig', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Migrate classes
   */
  async migrateClasses() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', 'Classes', 'Starting classes migration...');
      
      // Get V1 classes
      const v1Result = await client.query('SELECT * FROM classes ORDER BY id');
      
      if (v1Result.rows.length === 0) {
        this.log('INFO', 'Classes', 'No classes found in V1, skipping...');
        await client.query('COMMIT');
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const v1Class of v1Result.rows) {
        try {
          this.stats.classes.attempted++;
          
          // Transform V1 to V2 schema
          const v2Class = {
            class_name: v1Class.class_name,
            class_type: v1Class.class_type || 'regular',
            shift_id: v1Class.shift_id || null,
            grade_level: v1Class.grade_level || null,
            capacity: v1Class.capacity || 50,
            section: v1Class.section || null
          };
          
          // Insert into V2 schema
          await client.query(`
            INSERT INTO classes (
              class_name, class_type, shift_id, grade_level, capacity, section
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (class_name) DO UPDATE SET
              class_type = EXCLUDED.class_type,
              shift_id = EXCLUDED.shift_id,
              grade_level = EXCLUDED.grade_level,
              capacity = EXCLUDED.capacity,
              section = EXCLUDED.section,
              updated_at = CURRENT_TIMESTAMP
          `, [
            v2Class.class_name,
            v2Class.class_type,
            v2Class.shift_id,
            v2Class.grade_level,
            v2Class.capacity,
            v2Class.section
          ]);
          
          migrated++;
          this.stats.classes.success++;
          
        } catch (error) {
          this.stats.classes.failed++;
          this.logError('Classes', 'migrateClass', error, v1Class);
        }
      }
      
      await client.query('COMMIT');
      
      this.log('SUCCESS', 'Classes', `Migrated ${migrated}/${v1Result.rows.length} classes`);
      
      return { success: true, migrated, total: v1Result.rows.length };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logError('Classes', 'migrateClasses', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Save migration log to file
   */
  async saveMigrationLog(filename = 'migration-log.json') {
    const logPath = path.join(__dirname, 'logs', filename);
    
    try {
      // Ensure logs directory exists
      await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });
      
      const logData = {
        timestamp: new Date().toISOString(),
        stats: this.stats,
        errors: this.errors,
        log: this.migrationLog
      };
      
      await fs.writeFile(logPath, JSON.stringify(logData, null, 2));
      console.log(`\n✓ Migration log saved to: ${logPath}`);
      
    } catch (error) {
      console.error('Failed to save migration log:', error.message);
    }
  }

  /**
   * Generate migration report
   */
  generateReport() {
    console.log('\n=== Migration Report ===\n');
    
    let totalAttempted = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const [entity, stats] of Object.entries(this.stats)) {
      if (stats.attempted > 0) {
        console.log(`${entity}:`);
        console.log(`  Attempted: ${stats.attempted}`);
        console.log(`  Success: ${stats.success}`);
        console.log(`  Failed: ${stats.failed}`);
        console.log('');
        
        totalAttempted += stats.attempted;
        totalSuccess += stats.success;
        totalFailed += stats.failed;
      }
    }
    
    console.log('Total:');
    console.log(`  Attempted: ${totalAttempted}`);
    console.log(`  Success: ${totalSuccess}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log(`  Success Rate: ${totalAttempted > 0 ? ((totalSuccess / totalAttempted) * 100).toFixed(2) : 0}%`);
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️  ${this.errors.length} error(s) occurred during migration`);
      console.log('Check migration log for details');
    }
    
    console.log('');
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
          academic_year, current_year, number_of_terms, school_days,
          shift_count, shift_rotation_enabled, periods_per_shift,
          period_duration_minutes, has_kg, has_evening_class, additional_languages
        ) VALUES (
          '2016/2017', 2016, 3, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
          1, false, 8,
          45, false, false, '[]'::jsonb
        )
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✓ Generated school config');
      
      // Generate classes
      const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
      for (const className of classes) {
        // Check if class already exists
        const existing = await client.query(
          'SELECT id FROM classes WHERE class_name = $1',
          [className]
        );
        
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO classes (class_name, class_type, capacity)
            VALUES ($1, 'regular', 50)
          `, [className]);
        }
      }
      console.log(`✓ Generated ${classes.length} classes`);
      
      // Generate guardians
      for (let i = 1; i <= 10; i++) {
        const guardianId = `GRD${String(i).padStart(3, '0')}`;
        
        // Check if guardian already exists
        const existing = await client.query(
          'SELECT id FROM guardians WHERE guardian_id = $1',
          [guardianId]
        );
        
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO guardians (
              guardian_id, first_name, last_name, relationship, phone_number
            ) VALUES ($1, $2, $3, 'Father', $4)
          `, [guardianId, `Guardian${i}`, `LastName${i}`, `+251911${String(i).padStart(6, '0')}`]);
        }
      }
      console.log('✓ Generated 10 guardians');
      
      // Generate students
      const classIds = await client.query('SELECT id FROM classes LIMIT 5');
      const guardianIds = await client.query('SELECT id FROM guardians LIMIT 10');
      
      if (classIds.rows.length > 0 && guardianIds.rows.length > 0) {
        for (let i = 1; i <= 50; i++) {
          const studentId = `STU${String(i).padStart(4, '0')}`;
          const classId = classIds.rows[i % classIds.rows.length].id;
          const guardianId = guardianIds.rows[i % guardianIds.rows.length].id;
          
          // Check if student already exists
          const existing = await client.query(
            'SELECT id FROM students WHERE student_id = $1',
            [studentId]
          );
          
          if (existing.rows.length === 0) {
            await client.query(`
              INSERT INTO students (
                student_id, first_name, last_name, class_id, guardian_id,
                gender, status, academic_year, enrollment_date
              ) VALUES ($1, $2, $3, $4, $5, $6, 'active', '2016', CURRENT_DATE)
            `, [
              studentId,
              `Student${i}`,
              `LastName${i}`,
              classId,
              guardianId,
              i % 2 === 0 ? 'Male' : 'Female'
            ]);
          }
        }
        console.log('✓ Generated 50 students');
      }
      
      // Generate staff
      for (let i = 1; i <= 10; i++) {
        const staffId = `STF${String(i).padStart(3, '0')}`;
        
        // Check if staff already exists
        const existing = await client.query(
          'SELECT id FROM staff WHERE staff_id = $1',
          [staffId]
        );
        
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO staff (
              staff_id, first_name, last_name, phone_number, staff_type, status, hire_date
            ) VALUES ($1, $2, $3, $4, 'Teacher', 'active', CURRENT_DATE)
          `, [staffId, `Teacher${i}`, `LastName${i}`, `+251922${String(i).padStart(6, '0')}`]);
        }
      }
      console.log('✓ Generated 10 staff members');
      
      // Generate subjects
      const subjects = ['Mathematics', 'English', 'Science', 'History', 'Geography'];
      for (const subject of subjects) {
        // Check if subject already exists
        const existing = await client.query(
          'SELECT id FROM subjects WHERE subject_name = $1',
          [subject]
        );
        
        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO subjects (subject_name, subject_code, is_active)
            VALUES ($1, $2, true)
          `, [subject, subject.substring(0, 3).toUpperCase()]);
        }
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

  /**
   * Migrate students
   */
  async migrateStudents() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', 'Students', 'Starting students migration...');
      
      // Get V1 students
      const v1Result = await client.query('SELECT * FROM students ORDER BY id');
      
      if (v1Result.rows.length === 0) {
        this.log('INFO', 'Students', 'No students found in V1, skipping...');
        await client.query('COMMIT');
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const v1Student of v1Result.rows) {
        try {
          this.stats.students.attempted++;
          
          // Transform V1 to V2 schema
          const v2Student = {
            student_id: v1Student.student_id,
            first_name: v1Student.first_name,
            middle_name: v1Student.middle_name,
            last_name: v1Student.last_name,
            class_id: v1Student.class_id,
            date_of_birth: v1Student.date_of_birth,
            date_of_birth_ethiopian: v1Student.date_of_birth_ethiopian,
            gender: v1Student.gender,
            phone_number: v1Student.phone_number,
            email: v1Student.email,
            guardian_id: v1Student.guardian_id,
            enrollment_date: v1Student.enrollment_date,
            enrollment_date_ethiopian: v1Student.enrollment_date_ethiopian,
            status: v1Student.status || 'active',
            academic_year: v1Student.academic_year,
            address: v1Student.address,
            emergency_contact_name: v1Student.emergency_contact_name,
            emergency_contact_phone: v1Student.emergency_contact_phone,
            medical_conditions: v1Student.medical_conditions,
            photo_url: v1Student.photo_url
          };
          
          // Insert into V2 schema
          await client.query(`
            INSERT INTO students (
              student_id, first_name, middle_name, last_name, class_id,
              date_of_birth, date_of_birth_ethiopian, gender, phone_number, email,
              guardian_id, enrollment_date, enrollment_date_ethiopian, status,
              academic_year, address, emergency_contact_name, emergency_contact_phone,
              medical_conditions, photo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (student_id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              middle_name = EXCLUDED.middle_name,
              last_name = EXCLUDED.last_name,
              class_id = EXCLUDED.class_id,
              date_of_birth = EXCLUDED.date_of_birth,
              date_of_birth_ethiopian = EXCLUDED.date_of_birth_ethiopian,
              gender = EXCLUDED.gender,
              phone_number = EXCLUDED.phone_number,
              email = EXCLUDED.email,
              guardian_id = EXCLUDED.guardian_id,
              enrollment_date = EXCLUDED.enrollment_date,
              enrollment_date_ethiopian = EXCLUDED.enrollment_date_ethiopian,
              status = EXCLUDED.status,
              academic_year = EXCLUDED.academic_year,
              address = EXCLUDED.address,
              emergency_contact_name = EXCLUDED.emergency_contact_name,
              emergency_contact_phone = EXCLUDED.emergency_contact_phone,
              medical_conditions = EXCLUDED.medical_conditions,
              photo_url = EXCLUDED.photo_url,
              updated_at = CURRENT_TIMESTAMP
          `, [
            v2Student.student_id,
            v2Student.first_name,
            v2Student.middle_name,
            v2Student.last_name,
            v2Student.class_id,
            v2Student.date_of_birth,
            v2Student.date_of_birth_ethiopian,
            v2Student.gender,
            v2Student.phone_number,
            v2Student.email,
            v2Student.guardian_id,
            v2Student.enrollment_date,
            v2Student.enrollment_date_ethiopian,
            v2Student.status,
            v2Student.academic_year,
            v2Student.address,
            v2Student.emergency_contact_name,
            v2Student.emergency_contact_phone,
            v2Student.medical_conditions,
            v2Student.photo_url
          ]);
          
          migrated++;
          this.stats.students.success++;
          
        } catch (error) {
          this.stats.students.failed++;
          this.logError('Students', 'migrateStudent', error, v1Student);
        }
      }
      
      await client.query('COMMIT');
      
      this.log('SUCCESS', 'Students', `Migrated ${migrated}/${v1Result.rows.length} students`);
      
      return { success: true, migrated, total: v1Result.rows.length };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logError('Students', 'migrateStudents', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
  
  /**
   * Migrate staff
   */
  async migrateStaff() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', 'Staff', 'Starting staff migration...');
      
      // Get V1 staff
      const v1Result = await client.query('SELECT * FROM staff ORDER BY id');
      
      if (v1Result.rows.length === 0) {
        this.log('INFO', 'Staff', 'No staff found in V1, skipping...');
        await client.query('COMMIT');
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const v1Staff of v1Result.rows) {
        try {
          this.stats.staff.attempted++;
          
          // Transform V1 to V2 schema
          const v2Staff = {
            staff_id: v1Staff.staff_id,
            first_name: v1Staff.first_name,
            middle_name: v1Staff.middle_name,
            last_name: v1Staff.last_name,
            staff_type: v1Staff.staff_type || 'teacher',
            email: v1Staff.email,
            phone_number: v1Staff.phone_number,
            date_of_birth: v1Staff.date_of_birth,
            date_of_birth_ethiopian: v1Staff.date_of_birth_ethiopian,
            gender: v1Staff.gender,
            hire_date: v1Staff.hire_date,
            hire_date_ethiopian: v1Staff.hire_date_ethiopian,
            status: v1Staff.status || 'active',
            address: v1Staff.address,
            emergency_contact_name: v1Staff.emergency_contact_name,
            emergency_contact_phone: v1Staff.emergency_contact_phone,
            qualification: v1Staff.qualification,
            specialization: v1Staff.specialization,
            salary: v1Staff.salary,
            photo_url: v1Staff.photo_url
          };
          
          // Insert into V2 schema
          await client.query(`
            INSERT INTO staff (
              staff_id, first_name, middle_name, last_name, staff_type,
              email, phone_number, date_of_birth, date_of_birth_ethiopian, gender,
              hire_date, hire_date_ethiopian, status, address,
              emergency_contact_name, emergency_contact_phone, qualification,
              specialization, salary, photo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (staff_id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              middle_name = EXCLUDED.middle_name,
              last_name = EXCLUDED.last_name,
              staff_type = EXCLUDED.staff_type,
              email = EXCLUDED.email,
              phone_number = EXCLUDED.phone_number,
              date_of_birth = EXCLUDED.date_of_birth,
              date_of_birth_ethiopian = EXCLUDED.date_of_birth_ethiopian,
              gender = EXCLUDED.gender,
              hire_date = EXCLUDED.hire_date,
              hire_date_ethiopian = EXCLUDED.hire_date_ethiopian,
              status = EXCLUDED.status,
              address = EXCLUDED.address,
              emergency_contact_name = EXCLUDED.emergency_contact_name,
              emergency_contact_phone = EXCLUDED.emergency_contact_phone,
              qualification = EXCLUDED.qualification,
              specialization = EXCLUDED.specialization,
              salary = EXCLUDED.salary,
              photo_url = EXCLUDED.photo_url,
              updated_at = CURRENT_TIMESTAMP
          `, [
            v2Staff.staff_id,
            v2Staff.first_name,
            v2Staff.middle_name,
            v2Staff.last_name,
            v2Staff.staff_type,
            v2Staff.email,
            v2Staff.phone_number,
            v2Staff.date_of_birth,
            v2Staff.date_of_birth_ethiopian,
            v2Staff.gender,
            v2Staff.hire_date,
            v2Staff.hire_date_ethiopian,
            v2Staff.status,
            v2Staff.address,
            v2Staff.emergency_contact_name,
            v2Staff.emergency_contact_phone,
            v2Staff.qualification,
            v2Staff.specialization,
            v2Staff.salary,
            v2Staff.photo_url
          ]);
          
          migrated++;
          this.stats.staff.success++;
          
        } catch (error) {
          this.stats.staff.failed++;
          this.logError('Staff', 'migrateStaff', error, v1Staff);
        }
      }
      
      await client.query('COMMIT');
      
      this.log('SUCCESS', 'Staff', `Migrated ${migrated}/${v1Result.rows.length} staff members`);
      
      return { success: true, migrated, total: v1Result.rows.length };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logError('Staff', 'migrateStaff', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
  
  /**
   * Migrate guardians
   */
  async migrateGuardians() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      this.log('INFO', 'Guardians', 'Starting guardians migration...');
      
      // Get V1 guardians
      const v1Result = await client.query('SELECT * FROM guardians ORDER BY id');
      
      if (v1Result.rows.length === 0) {
        this.log('INFO', 'Guardians', 'No guardians found in V1, skipping...');
        await client.query('COMMIT');
        return { success: true, migrated: 0 };
      }
      
      let migrated = 0;
      
      for (const v1Guardian of v1Result.rows) {
        try {
          this.stats.guardians.attempted++;
          
          // Transform V1 to V2 schema
          const v2Guardian = {
            guardian_id: v1Guardian.guardian_id,
            first_name: v1Guardian.first_name,
            middle_name: v1Guardian.middle_name,
            last_name: v1Guardian.last_name,
            relationship: v1Guardian.relationship,
            phone_number: v1Guardian.phone_number,
            email: v1Guardian.email,
            address: v1Guardian.address,
            occupation: v1Guardian.occupation,
            workplace: v1Guardian.workplace,
            telegram_chat_id: v1Guardian.telegram_chat_id,
            fcm_token: v1Guardian.fcm_token
          };
          
          // Insert into V2 schema
          await client.query(`
            INSERT INTO guardians (
              guardian_id, first_name, middle_name, last_name, relationship,
              phone_number, email, address, occupation, workplace,
              telegram_chat_id, fcm_token
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (guardian_id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              middle_name = EXCLUDED.middle_name,
              last_name = EXCLUDED.last_name,
              relationship = EXCLUDED.relationship,
              phone_number = EXCLUDED.phone_number,
              email = EXCLUDED.email,
              address = EXCLUDED.address,
              occupation = EXCLUDED.occupation,
              workplace = EXCLUDED.workplace,
              telegram_chat_id = EXCLUDED.telegram_chat_id,
              fcm_token = EXCLUDED.fcm_token,
              updated_at = CURRENT_TIMESTAMP
          `, [
            v2Guardian.guardian_id,
            v2Guardian.first_name,
            v2Guardian.middle_name,
            v2Guardian.last_name,
            v2Guardian.relationship,
            v2Guardian.phone_number,
            v2Guardian.email,
            v2Guardian.address,
            v2Guardian.occupation,
            v2Guardian.workplace,
            v2Guardian.telegram_chat_id,
            v2Guardian.fcm_token
          ]);
          
          migrated++;
          this.stats.guardians.success++;
          
        } catch (error) {
          this.stats.guardians.failed++;
          this.logError('Guardians', 'migrateGuardian', error, v1Guardian);
        }
      }
      
      await client.query('COMMIT');
      
      this.log('SUCCESS', 'Guardians', `Migrated ${migrated}/${v1Result.rows.length} guardians`);
      
      return { success: true, migrated, total: v1Result.rows.length };
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logError('Guardians', 'migrateGuardians', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

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
}



module.exports = V1toV2Migration;
