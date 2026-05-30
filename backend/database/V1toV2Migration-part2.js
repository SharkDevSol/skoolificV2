/**
 * V1 to V2 Migration Class - Additional Methods (Part 2)
 * These methods should be added to the V1toV2Migration class
 */

// Add these methods to the V1toV2Migration class:

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
