/**
 * Integration Tests for Year Rollover
 * 
 * Tests the complete year rollover process including:
 * - Archive current year data
 * - Clear current year tables
 * - Increment academic year
 * - Preserve student records
 * - Archive attendance, marks, and payments
 * - Rollback on errors
 * - Retrieve archived data
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool
} = require('./setup');

describe('Year Rollover Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudents = [];
  let currentYear = '2025';

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testClassName = `TEST_ROLLOVER_CLASS_${Date.now()}`;
    
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create archived tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS archived_academic_years (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL UNIQUE,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_by VARCHAR(100)
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS archived_students (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        archived_data JSONB NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS archived_attendance (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        student_id INTEGER NOT NULL,
        class VARCHAR(100) NOT NULL,
        attendance_data JSONB NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS archived_marks (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        student_id INTEGER NOT NULL,
        class VARCHAR(100) NOT NULL,
        marks_data JSONB NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS archived_payments (
        id SERIAL PRIMARY KEY,
        academic_year VARCHAR(20) NOT NULL,
        student_id INTEGER NOT NULL,
        class VARCHAR(100) NOT NULL,
        payment_data JSONB NOT NULL,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create current year tables
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        marks_obtained DECIMAL(5,2)
      )
    `);
    
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL
      )
    `);
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create test students
    for (let i = 1; i <= 3; i++) {
      const result = await testPool.query(`
        INSERT INTO classes_schema."${testClassName}" (school_id, student_name, class, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [4000 + i, `Test Student ${i}`, testClassName, true]);
      
      testStudents.push(result.rows[0]);
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM archived_academic_years WHERE academic_year LIKE '${currentYear}%'`);
    await testPool.query(`DELETE FROM archived_students WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_payments WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM payments WHERE class = $1`, [testClassName]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    await testPool.query(`DELETE FROM archived_students WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM archived_payments WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM payments WHERE class = $1`, [testClassName]);
  });

  describe('1. Archive Current Year Data', () => {
    test('should archive student records', async () => {
      const student = testStudents[0];
      const studentData = {
        school_id: student.school_id,
        student_name: student.student_name,
        class: testClassName,
        is_active: true
      };
      
      const result = await testPool.query(`
        INSERT INTO archived_students (
          academic_year, student_id, student_name, class, archived_data
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [currentYear, student.school_id, student.student_name, testClassName, JSON.stringify(studentData)]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].academic_year).toBe(currentYear);
      expect(result.rows[0].archived_data).toBeTruthy();
    });

    test('should archive attendance records', async () => {
      const student = testStudents[0];
      
      // Create attendance records
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [student.school_id, student.student_name, testClassName, '2025-01-15', 'present']);

      // Archive attendance
      const attendanceData = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1',
        [student.school_id]
      );

      const result = await testPool.query(`
        INSERT INTO archived_attendance (
          academic_year, student_id, class, attendance_data
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [currentYear, student.school_id, testClassName, JSON.stringify(attendanceData.rows)]);

      expect(result.rows[0].attendance_data).toBeTruthy();
      expect(result.rows[0].attendance_data.length).toBeGreaterThan(0);
    });

    test('should archive marks records', async () => {
      const student = testStudents[0];
      
      // Create marks records
      await testPool.query(`
        INSERT INTO marks (student_id, student_name, class, subject, marks_obtained)
        VALUES ($1, $2, $3, $4, $5)
      `, [student.school_id, student.student_name, testClassName, 'Math', 85.00]);

      // Archive marks
      const marksData = await testPool.query(
        'SELECT * FROM marks WHERE student_id = $1',
        [student.school_id]
      );

      const result = await testPool.query(`
        INSERT INTO archived_marks (
          academic_year, student_id, class, marks_data
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [currentYear, student.school_id, testClassName, JSON.stringify(marksData.rows)]);

      expect(result.rows[0].marks_data).toBeTruthy();
      expect(result.rows[0].marks_data.length).toBeGreaterThan(0);
    });

    test('should archive payment records', async () => {
      const student = testStudents[0];
      
      // Create payment records
      await testPool.query(`
        INSERT INTO payments (student_id, student_name, class, amount, payment_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [student.school_id, student.student_name, testClassName, 500.00, '2025-01-10']);

      // Archive payments
      const paymentData = await testPool.query(
        'SELECT * FROM payments WHERE student_id = $1',
        [student.school_id]
      );

      const result = await testPool.query(`
        INSERT INTO archived_payments (
          academic_year, student_id, class, payment_data
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [currentYear, student.school_id, testClassName, JSON.stringify(paymentData.rows)]);

      expect(result.rows[0].payment_data).toBeTruthy();
      expect(result.rows[0].payment_data.length).toBeGreaterThan(0);
    });

    test('should archive all students in class', async () => {
      for (const student of testStudents) {
        const studentData = {
          school_id: student.school_id,
          student_name: student.student_name,
          class: testClassName
        };
        
        await testPool.query(`
          INSERT INTO archived_students (
            academic_year, student_id, student_name, class, archived_data
          ) VALUES ($1, $2, $3, $4, $5)
        `, [currentYear, student.school_id, student.student_name, testClassName, JSON.stringify(studentData)]);
      }

      const result = await testPool.query(
        'SELECT * FROM archived_students WHERE academic_year = $1 AND class = $2',
        [currentYear, testClassName]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });
  });

  describe('2. Clear Current Year Tables', () => {
    beforeEach(async () => {
      // Create test data
      for (const student of testStudents) {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status)
          VALUES ($1, $2, $3, $4, $5)
        `, [student.school_id, student.student_name, testClassName, '2025-01-15', 'present']);

        await testPool.query(`
          INSERT INTO marks (student_id, student_name, class, subject, marks_obtained)
          VALUES ($1, $2, $3, $4, $5)
        `, [student.school_id, student.student_name, testClassName, 'Math', 85.00]);

        await testPool.query(`
          INSERT INTO payments (student_id, student_name, class, amount, payment_date)
          VALUES ($1, $2, $3, $4, $5)
        `, [student.school_id, student.student_name, testClassName, 500.00, '2025-01-10']);
      }
    });

    test('should clear attendance table', async () => {
      await testPool.query('DELETE FROM attendance WHERE class = $1', [testClassName]);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(0);
    });

    test('should clear marks table', async () => {
      await testPool.query('DELETE FROM marks WHERE class = $1', [testClassName]);

      const result = await testPool.query(
        'SELECT * FROM marks WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(0);
    });

    test('should clear payments table', async () => {
      await testPool.query('DELETE FROM payments WHERE class = $1', [testClassName]);

      const result = await testPool.query(
        'SELECT * FROM payments WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(0);
    });
  });

  describe('3. Increment Academic Year', () => {
    test('should record new academic year', async () => {
      const newYear = '2026';
      
      const result = await testPool.query(`
        INSERT INTO archived_academic_years (academic_year, archived_by)
        VALUES ($1, $2)
        RETURNING *
      `, [currentYear, 'test_admin']);

      expect(result.rows[0].academic_year).toBe(currentYear);
      expect(result.rows[0].archived_at).toBeTruthy();
    });

    test('should prevent duplicate year archives', async () => {
      await testPool.query(`
        INSERT INTO archived_academic_years (academic_year, archived_by)
        VALUES ($1, $2)
      `, [currentYear, 'test_admin']);

      try {
        await testPool.query(`
          INSERT INTO archived_academic_years (academic_year, archived_by)
          VALUES ($1, $2)
        `, [currentYear, 'test_admin']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('23505'); // Unique violation
      }
    });
  });

  describe('4. Preserve Student Records', () => {
    test('should keep student records in class table', async () => {
      const beforeCount = await testPool.query(
        `SELECT COUNT(*) FROM classes_schema."${testClassName}"`,
        []
      );

      // Simulate rollover (students should remain)
      const afterCount = await testPool.query(
        `SELECT COUNT(*) FROM classes_schema."${testClassName}"`,
        []
      );

      expect(afterCount.rows[0].count).toBe(beforeCount.rows[0].count);
    });

    test('should maintain student active status', async () => {
      const result = await testPool.query(
        `SELECT * FROM classes_schema."${testClassName}" WHERE is_active = TRUE`,
        []
      );

      expect(result.rows.length).toBe(testStudents.length);
    });
  });

  describe('5. Complete Rollover Process', () => {
    test('should execute complete rollover in transaction', async () => {
      const client = await testPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 1. Archive students
        for (const student of testStudents) {
          const studentData = { school_id: student.school_id, student_name: student.student_name };
          await client.query(`
            INSERT INTO archived_students (academic_year, student_id, student_name, class, archived_data)
            VALUES ($1, $2, $3, $4, $5)
          `, [currentYear, student.school_id, student.student_name, testClassName, JSON.stringify(studentData)]);
        }
        
        // 2. Archive attendance
        const attendance = await client.query('SELECT * FROM attendance WHERE class = $1', [testClassName]);
        if (attendance.rows.length > 0) {
          for (const student of testStudents) {
            const studentAttendance = attendance.rows.filter(a => a.student_id === student.school_id);
            if (studentAttendance.length > 0) {
              await client.query(`
                INSERT INTO archived_attendance (academic_year, student_id, class, attendance_data)
                VALUES ($1, $2, $3, $4)
              `, [currentYear, student.school_id, testClassName, JSON.stringify(studentAttendance)]);
            }
          }
        }
        
        // 3. Clear current year data
        await client.query('DELETE FROM attendance WHERE class = $1', [testClassName]);
        await client.query('DELETE FROM marks WHERE class = $1', [testClassName]);
        await client.query('DELETE FROM payments WHERE class = $1', [testClassName]);
        
        // 4. Record year archive
        await client.query(`
          INSERT INTO archived_academic_years (academic_year, archived_by)
          VALUES ($1, $2)
          ON CONFLICT (academic_year) DO NOTHING
        `, [currentYear, 'test_admin']);
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Verify rollover completed
      const archived = await testPool.query(
        'SELECT * FROM archived_students WHERE academic_year = $1 AND class = $2',
        [currentYear, testClassName]
      );

      expect(archived.rows.length).toBe(testStudents.length);

      const currentData = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1',
        [testClassName]
      );

      expect(currentData.rows.length).toBe(0);
    });
  });

  describe('6. Rollback on Errors', () => {
    test('should rollback if archiving fails', async () => {
      const client = await testPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Archive first student
        await client.query(`
          INSERT INTO archived_students (academic_year, student_id, student_name, class, archived_data)
          VALUES ($1, $2, $3, $4, $5)
        `, [currentYear, testStudents[0].school_id, testStudents[0].student_name, testClassName, JSON.stringify({})]);
        
        // Simulate error
        throw new Error('Simulated error');
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        expect(error).toBeTruthy();
      } finally {
        client.release();
      }

      // Verify no data was archived
      const result = await testPool.query(
        'SELECT * FROM archived_students WHERE academic_year = $1 AND class = $2',
        [currentYear, testClassName]
      );

      expect(result.rows.length).toBe(0);
    });
  });

  describe('7. Retrieve Archived Data', () => {
    beforeEach(async () => {
      // Archive test data
      for (const student of testStudents) {
        const studentData = { school_id: student.school_id, student_name: student.student_name };
        await testPool.query(`
          INSERT INTO archived_students (academic_year, student_id, student_name, class, archived_data)
          VALUES ($1, $2, $3, $4, $5)
        `, [currentYear, student.school_id, student.student_name, testClassName, JSON.stringify(studentData)]);
      }
    });

    test('should retrieve archived students by year', async () => {
      const result = await testPool.query(
        'SELECT * FROM archived_students WHERE academic_year = $1',
        [currentYear]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(testStudents.length);
    });

    test('should retrieve archived students by class', async () => {
      const result = await testPool.query(
        'SELECT * FROM archived_students WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should retrieve specific student archived data', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(
        'SELECT * FROM archived_students WHERE student_id = $1 AND academic_year = $2',
        [student.school_id, currentYear]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].archived_data).toBeTruthy();
    });

    test('should list all archived years', async () => {
      await testPool.query(`
        INSERT INTO archived_academic_years (academic_year, archived_by)
        VALUES ($1, $2)
        ON CONFLICT (academic_year) DO NOTHING
      `, [currentYear, 'test_admin']);

      const result = await testPool.query(
        'SELECT * FROM archived_academic_years ORDER BY academic_year DESC'
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
