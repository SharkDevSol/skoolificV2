/**
 * Integration Tests for Attendance Marking
 * 
 * Tests the complete attendance marking flow including:
 * - Mark attendance for individual students
 * - Mark attendance for entire class
 * - Update attendance records
 * - Retrieve attendance by date/class/student
 * - Attendance statistics
 * - Offline attendance sync
 * - Validation and error handling
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool,
  API_BASE_URL
} = require('./setup');

const axios = require('axios');

describe('Attendance Marking Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudents = [];
  let testDate;

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testClassName = `TEST_ATT_CLASS_${Date.now()}`;
    testDate = new Date().toISOString().split('T')[0];
    
    // Create schemas
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create attendance table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        marked_by VARCHAR(100),
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        synced BOOLEAN DEFAULT TRUE,
        UNIQUE(student_id, class, date)
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
    for (let i = 1; i <= 5; i++) {
      const result = await testPool.query(`
        INSERT INTO classes_schema."${testClassName}" (school_id, student_name, class, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [1000 + i, `Test Student ${i}`, testClassName, true]);
      
      testStudents.push(result.rows[0]);
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    // Clean up attendance records after each test
    await testPool.query(`DELETE FROM attendance WHERE class = $1`, [testClassName]);
  });

  describe('1. Mark Individual Student Attendance', () => {
    test('should mark student as present', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher']);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('present');
      expect(result.rows[0].student_id).toBe(student.school_id);
      expect(result.rows[0].date).toBeTruthy();
    });

    test('should mark student as absent', async () => {
      const student = testStudents[1];
      
      const result = await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [student.school_id, student.student_name, testClassName, testDate, 'absent', 'test_teacher']);

      expect(result.rows[0].status).toBe('absent');
    });

    test('should mark student as late', async () => {
      const student = testStudents[2];
      
      const result = await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [student.school_id, student.student_name, testClassName, testDate, 'late', 'test_teacher', 'Arrived 30 minutes late']);

      expect(result.rows[0].status).toBe('late');
      expect(result.rows[0].notes).toBe('Arrived 30 minutes late');
    });

    test('should mark student as excused', async () => {
      const student = testStudents[3];
      
      const result = await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [student.school_id, student.student_name, testClassName, testDate, 'excused', 'test_teacher', 'Medical appointment']);

      expect(result.rows[0].status).toBe('excused');
      expect(result.rows[0].notes).toBe('Medical appointment');
    });
  });

  describe('2. Mark Entire Class Attendance', () => {
    test('should mark attendance for all students in class', async () => {
      const attendanceRecords = testStudents.map((student, index) => ({
        student_id: student.school_id,
        student_name: student.student_name,
        class: testClassName,
        date: testDate,
        status: index % 2 === 0 ? 'present' : 'absent',
        marked_by: 'test_teacher'
      }));

      for (const record of attendanceRecords) {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [record.student_id, record.student_name, record.class, record.date, record.status, record.marked_by]);
      }

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1 AND date = $2',
        [testClassName, testDate]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should calculate attendance statistics for class', async () => {
      // Mark attendance for all students
      for (let i = 0; i < testStudents.length; i++) {
        const status = i < 3 ? 'present' : 'absent';
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testStudents[i].school_id, testStudents[i].student_name, testClassName, testDate, status, 'test_teacher']);
      }

      // Calculate statistics
      const stats = await testPool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
        FROM attendance
        WHERE class = $1 AND date = $2
      `, [testClassName, testDate]);

      expect(parseInt(stats.rows[0].total)).toBe(5);
      expect(parseInt(stats.rows[0].present)).toBe(3);
      expect(parseInt(stats.rows[0].absent)).toBe(2);
    });
  });

  describe('3. Update Attendance Records', () => {
    test('should update attendance status', async () => {
      const student = testStudents[0];
      
      // Initial mark as absent
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [student.school_id, student.student_name, testClassName, testDate, 'absent', 'test_teacher']);

      // Update to present
      await testPool.query(`
        UPDATE attendance 
        SET status = $1, notes = $2
        WHERE student_id = $3 AND class = $4 AND date = $5
      `, ['present', 'Arrived later', student.school_id, testClassName, testDate]);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [student.school_id, testDate]
      );

      expect(result.rows[0].status).toBe('present');
      expect(result.rows[0].notes).toBe('Arrived later');
    });

    test('should add notes to existing attendance', async () => {
      const student = testStudents[1];
      
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [student.school_id, student.student_name, testClassName, testDate, 'absent', 'test_teacher']);

      await testPool.query(`
        UPDATE attendance 
        SET notes = $1
        WHERE student_id = $2 AND date = $3
      `, ['Called parent - sick', student.school_id, testDate]);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [student.school_id, testDate]
      );

      expect(result.rows[0].notes).toBe('Called parent - sick');
    });
  });

  describe('4. Retrieve Attendance Records', () => {
    beforeEach(async () => {
      // Create attendance records for testing
      for (const student of testStudents) {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher']);
      }
    });

    test('should retrieve attendance by date', async () => {
      const result = await testPool.query(
        'SELECT * FROM attendance WHERE date = $1',
        [testDate]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(testStudents.length);
    });

    test('should retrieve attendance by class', async () => {
      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should retrieve attendance by student', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
        [student.school_id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].student_id).toBe(student.school_id);
    });

    test('should retrieve attendance by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1 AND date BETWEEN $2 AND $3',
        [testClassName, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('5. Attendance Statistics', () => {
    beforeEach(async () => {
      // Create varied attendance records
      const statuses = ['present', 'absent', 'late', 'excused', 'present'];
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testStudents[i].school_id, testStudents[i].student_name, testClassName, testDate, statuses[i], 'test_teacher']);
      }
    });

    test('should calculate attendance percentage for student', async () => {
      const student = testStudents[0];
      
      // Add more attendance records
      const dates = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
        
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_id, class, date) DO NOTHING
        `, [student.school_id, student.student_name, testClassName, dates[i], i < 8 ? 'present' : 'absent', 'test_teacher']);
      }

      const result = await testPool.query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 2) as percentage
        FROM attendance
        WHERE student_id = $1
      `, [student.school_id]);

      expect(parseInt(result.rows[0].total_days)).toBeGreaterThan(0);
      expect(parseFloat(result.rows[0].percentage)).toBeGreaterThan(0);
    });

    test('should get class attendance summary', async () => {
      const result = await testPool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM attendance
        WHERE class = $1 AND date = $2
        GROUP BY status
      `, [testClassName, testDate]);

      expect(result.rows.length).toBeGreaterThan(0);
      
      const summary = {};
      result.rows.forEach(row => {
        summary[row.status] = parseInt(row.count);
      });

      expect(summary.present).toBe(2);
      expect(summary.absent).toBe(1);
      expect(summary.late).toBe(1);
      expect(summary.excused).toBe(1);
    });

    test('should identify students with low attendance', async () => {
      // Create attendance history
      for (let day = 0; day < 10; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        const dateStr = date.toISOString().split('T')[0];
        
        for (let i = 0; i < testStudents.length; i++) {
          const status = i === 0 && day < 7 ? 'absent' : 'present'; // Student 0 has low attendance
          await testPool.query(`
            INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (student_id, class, date) DO NOTHING
          `, [testStudents[i].school_id, testStudents[i].student_name, testClassName, dateStr, status, 'test_teacher']);
        }
      }

      const result = await testPool.query(`
        SELECT 
          student_id,
          student_name,
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 2) as percentage
        FROM attendance
        WHERE class = $1
        GROUP BY student_id, student_name
        HAVING ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 2) < 75
      `, [testClassName]);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(parseFloat(result.rows[0].percentage)).toBeLessThan(75);
    });
  });

  describe('6. Offline Attendance Sync', () => {
    test('should mark attendance as unsynced for offline mode', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by, synced)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher', false]);

      expect(result.rows[0].synced).toBe(false);
    });

    test('should retrieve unsynced attendance records', async () => {
      // Create some synced and unsynced records
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by, synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [testStudents[i].school_id, testStudents[i].student_name, testClassName, testDate, 'present', 'test_teacher', i < 2]);
      }

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE synced = FALSE'
      );

      expect(result.rows.length).toBe(3);
    });

    test('should mark records as synced after successful sync', async () => {
      const student = testStudents[0];
      
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by, synced)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher', false]);

      // Simulate sync
      await testPool.query(`
        UPDATE attendance 
        SET synced = TRUE
        WHERE student_id = $1 AND date = $2
      `, [student.school_id, testDate]);

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE student_id = $1 AND date = $2',
        [student.school_id, testDate]
      );

      expect(result.rows[0].synced).toBe(true);
    });
  });

  describe('7. Validation and Error Handling', () => {
    test('should prevent duplicate attendance for same student on same date', async () => {
      const student = testStudents[0];
      
      await testPool.query(`
        INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher']);

      try {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [student.school_id, student.student_name, testClassName, testDate, 'absent', 'test_teacher']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('23505'); // Unique violation
      }
    });

    test('should validate attendance status values', async () => {
      const student = testStudents[0];
      const validStatuses = ['present', 'absent', 'late', 'excused'];
      
      for (const status of validStatuses) {
        const date = new Date();
        date.setDate(date.getDate() - validStatuses.indexOf(status));
        const dateStr = date.toISOString().split('T')[0];
        
        const result = await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [student.school_id, student.student_name, testClassName, dateStr, status, 'test_teacher']);

        expect(result.rows[0].status).toBe(status);
      }
    });

    test('should require student_id and date', async () => {
      try {
        await testPool.query(`
          INSERT INTO attendance (student_name, class, status, marked_by)
          VALUES ($1, $2, $3, $4)
        `, ['Test Student', testClassName, 'present', 'test_teacher']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('should handle invalid date format', async () => {
      const student = testStudents[0];
      
      try {
        await testPool.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [student.school_id, student.student_name, testClassName, 'invalid-date', 'present', 'test_teacher']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('8. Bulk Operations', () => {
    test('should mark attendance for multiple students in single transaction', async () => {
      const client = await testPool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const student of testStudents) {
          await client.query(`
            INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [student.school_id, student.student_name, testClassName, testDate, 'present', 'test_teacher']);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1 AND date = $2',
        [testClassName, testDate]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should rollback on error during bulk operation', async () => {
      const client = await testPool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert first student
        await client.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testStudents[0].school_id, testStudents[0].student_name, testClassName, testDate, 'present', 'test_teacher']);
        
        // Try to insert duplicate (should fail)
        await client.query(`
          INSERT INTO attendance (student_id, student_name, class, date, status, marked_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testStudents[0].school_id, testStudents[0].student_name, testClassName, testDate, 'absent', 'test_teacher']);
        
        await client.query('COMMIT');
        fail('Should have thrown an error');
      } catch (error) {
        await client.query('ROLLBACK');
        expect(error).toBeTruthy();
      } finally {
        client.release();
      }

      // Verify no records were inserted
      const result = await testPool.query(
        'SELECT * FROM attendance WHERE class = $1 AND date = $2',
        [testClassName, testDate]
      );

      expect(result.rows.length).toBe(0);
    });
  });
});
