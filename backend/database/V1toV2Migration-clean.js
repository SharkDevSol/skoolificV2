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
}



module.exports = V1toV2Migration;
