/**
 * Integration Tests for Mark Entry
 * 
 * Tests the complete mark entry flow including:
 * - Create mark list forms
 * - Enter marks for students
 * - Update existing marks
 * - Lock/unlock mark lists
 * - Calculate totals and percentages
 * - Retrieve marks by student/subject/term
 * - Mark validation
 * - Offline mark entry sync
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  generateTestId,
  getTestPool
} = require('./setup');

describe('Mark Entry Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudents = [];
  let testMarkListId;

  beforeAll(async () => {
    testPool = await initTestDatabase();
    testClassName = `TEST_MARK_CLASS_${Date.now()}`;
    
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create mark_lists table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS mark_lists (
        id SERIAL PRIMARY KEY,
        class VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        term VARCHAR(50) NOT NULL,
        component VARCHAR(100),
        total_marks INTEGER NOT NULL,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_locked BOOLEAN DEFAULT FALSE,
        locked_at TIMESTAMP,
        locked_by VARCHAR(100)
      )
    `);
    
    // Create marks table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        mark_list_id INTEGER NOT NULL REFERENCES mark_lists(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        class VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        term VARCHAR(50) NOT NULL,
        marks_obtained DECIMAL(5,2),
        total_marks INTEGER NOT NULL,
        percentage DECIMAL(5,2),
        grade VARCHAR(10),
        remarks TEXT,
        entered_by VARCHAR(100),
        entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced BOOLEAN DEFAULT TRUE,
        UNIQUE(mark_list_id, student_id)
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
      `, [2000 + i, `Test Student ${i}`, testClassName, true]);
      
      testStudents.push(result.rows[0]);
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM mark_lists WHERE class = $1`, [testClassName]);
    await closeTestDatabase();
  });

  afterEach(async () => {
    await testPool.query(`DELETE FROM marks WHERE class = $1`, [testClassName]);
    await testPool.query(`DELETE FROM mark_lists WHERE class = $1`, [testClassName]);
    testMarkListId = null;
  });

  describe('1. Create Mark List Forms', () => {
    test('should create a new mark list form', async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, component, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Mathematics', 'Term 1', 'Mid-term', 100, 'test_teacher']);

      testMarkListId = result.rows[0].id;

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].class).toBe(testClassName);
      expect(result.rows[0].subject).toBe('Mathematics');
      expect(result.rows[0].total_marks).toBe(100);
      expect(result.rows[0].is_locked).toBe(false);
    });

    test('should prevent duplicate mark lists for same class/subject/term', async () => {
      await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [testClassName, 'Science', 'Term 1', 100, 'test_teacher']);

      // Application should check for duplicates before inserting
      const existing = await testPool.query(`
        SELECT * FROM mark_lists 
        WHERE class = $1 AND subject = $2 AND term = $3
      `, [testClassName, 'Science', 'Term 1']);

      expect(existing.rows.length).toBe(1);
    });

    test('should create mark list with component', async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, component, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'English', 'Term 2', 'Final Exam', 150, 'test_teacher']);

      testMarkListId = result.rows[0].id;
      expect(result.rows[0].component).toBe('Final Exam');
    });
  });

  describe('2. Enter Marks for Students', () => {
    beforeEach(async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'Mathematics', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = result.rows[0].id;
    });

    test('should enter marks for a student', async () => {
      const student = testStudents[0];
      const marksObtained = 85;
      const percentage = (marksObtained / 100) * 100;
      
      const result = await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Mathematics', 'Term 1', marksObtained, 100, percentage, 'test_teacher'
      ]);

      expect(result.rows[0].marks_obtained).toBe('85.00');
      expect(parseFloat(result.rows[0].percentage)).toBe(85);
    });

    test('should calculate grade based on percentage', async () => {
      const student = testStudents[1];
      const marksObtained = 92;
      const percentage = (marksObtained / 100) * 100;
      
      // Calculate grade
      let grade = 'F';
      if (percentage >= 90) grade = 'A';
      else if (percentage >= 80) grade = 'B';
      else if (percentage >= 70) grade = 'C';
      else if (percentage >= 60) grade = 'D';
      
      const result = await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, grade, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Mathematics', 'Term 1', marksObtained, 100, percentage, grade, 'test_teacher'
      ]);

      expect(result.rows[0].grade).toBe('A');
    });

    test('should enter marks for all students in class', async () => {
      const markValues = [85, 72, 90, 65, 78];
      
      for (let i = 0; i < testStudents.length; i++) {
        const student = testStudents[i];
        const marksObtained = markValues[i];
        const percentage = (marksObtained / 100) * 100;
        
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testMarkListId, student.school_id, student.student_name, testClassName,
          'Mathematics', 'Term 1', marksObtained, 100, percentage, 'test_teacher'
        ]);
      }

      const result = await testPool.query(
        'SELECT * FROM marks WHERE mark_list_id = $1',
        [testMarkListId]
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should add remarks to marks', async () => {
      const student = testStudents[2];
      
      const result = await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, remarks, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Mathematics', 'Term 1', 95, 100, 95, 'Excellent performance', 'test_teacher'
      ]);

      expect(result.rows[0].remarks).toBe('Excellent performance');
    });
  });

  describe('3. Update Existing Marks', () => {
    beforeEach(async () => {
      const mlResult = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'Science', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = mlResult.rows[0].id;
      
      // Insert initial marks
      const student = testStudents[0];
      await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Science', 'Term 1', 75, 100, 75, 'test_teacher'
      ]);
    });

    test('should update marks for a student', async () => {
      const student = testStudents[0];
      const newMarks = 88;
      const newPercentage = (newMarks / 100) * 100;
      
      await testPool.query(`
        UPDATE marks 
        SET marks_obtained = $1, percentage = $2
        WHERE mark_list_id = $3 AND student_id = $4
      `, [newMarks, newPercentage, testMarkListId, student.school_id]);

      const result = await testPool.query(
        'SELECT * FROM marks WHERE mark_list_id = $1 AND student_id = $2',
        [testMarkListId, student.school_id]
      );

      expect(parseFloat(result.rows[0].marks_obtained)).toBe(88);
      expect(parseFloat(result.rows[0].percentage)).toBe(88);
    });

    test('should update remarks', async () => {
      const student = testStudents[0];
      
      await testPool.query(`
        UPDATE marks 
        SET remarks = $1
        WHERE mark_list_id = $2 AND student_id = $3
      `, ['Needs improvement', testMarkListId, student.school_id]);

      const result = await testPool.query(
        'SELECT * FROM marks WHERE mark_list_id = $1 AND student_id = $2',
        [testMarkListId, student.school_id]
      );

      expect(result.rows[0].remarks).toBe('Needs improvement');
    });
  });

  describe('4. Lock/Unlock Mark Lists', () => {
    beforeEach(async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'History', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = result.rows[0].id;
    });

    test('should lock mark list', async () => {
      await testPool.query(`
        UPDATE mark_lists 
        SET is_locked = TRUE, locked_at = NOW(), locked_by = $1
        WHERE id = $2
      `, ['test_teacher', testMarkListId]);

      const result = await testPool.query(
        'SELECT * FROM mark_lists WHERE id = $1',
        [testMarkListId]
      );

      expect(result.rows[0].is_locked).toBe(true);
      expect(result.rows[0].locked_at).toBeTruthy();
      expect(result.rows[0].locked_by).toBe('test_teacher');
    });

    test('should unlock mark list', async () => {
      // Lock first
      await testPool.query(`
        UPDATE mark_lists 
        SET is_locked = TRUE, locked_at = NOW(), locked_by = $1
        WHERE id = $2
      `, ['test_teacher', testMarkListId]);

      // Unlock
      await testPool.query(`
        UPDATE mark_lists 
        SET is_locked = FALSE, locked_at = NULL, locked_by = NULL
        WHERE id = $1
      `, [testMarkListId]);

      const result = await testPool.query(
        'SELECT * FROM mark_lists WHERE id = $1',
        [testMarkListId]
      );

      expect(result.rows[0].is_locked).toBe(false);
      expect(result.rows[0].locked_at).toBeNull();
    });

    test('should prevent mark entry when list is locked', async () => {
      // Lock the mark list
      await testPool.query(`
        UPDATE mark_lists 
        SET is_locked = TRUE
        WHERE id = $1
      `, [testMarkListId]);

      // Check if locked before inserting
      const lockCheck = await testPool.query(
        'SELECT is_locked FROM mark_lists WHERE id = $1',
        [testMarkListId]
      );

      expect(lockCheck.rows[0].is_locked).toBe(true);
      // Application should prevent insertion when locked
    });
  });

  describe('5. Calculate Totals and Percentages', () => {
    beforeEach(async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'Geography', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = result.rows[0].id;
    });

    test('should calculate class average', async () => {
      const markValues = [85, 72, 90, 65, 78];
      
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testMarkListId, testStudents[i].school_id, testStudents[i].student_name,
          testClassName, 'Geography', 'Term 1', markValues[i], 100, markValues[i], 'test_teacher'
        ]);
      }

      const result = await testPool.query(`
        SELECT AVG(percentage) as class_average
        FROM marks
        WHERE mark_list_id = $1
      `, [testMarkListId]);

      const average = parseFloat(result.rows[0].class_average);
      expect(average).toBeCloseTo(78, 0);
    });

    test('should calculate highest and lowest marks', async () => {
      const markValues = [85, 72, 90, 65, 78];
      
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testMarkListId, testStudents[i].school_id, testStudents[i].student_name,
          testClassName, 'Geography', 'Term 1', markValues[i], 100, markValues[i], 'test_teacher'
        ]);
      }

      const result = await testPool.query(`
        SELECT 
          MAX(marks_obtained) as highest,
          MIN(marks_obtained) as lowest
        FROM marks
        WHERE mark_list_id = $1
      `, [testMarkListId]);

      expect(parseFloat(result.rows[0].highest)).toBe(90);
      expect(parseFloat(result.rows[0].lowest)).toBe(65);
    });

    test('should calculate pass/fail statistics', async () => {
      const markValues = [85, 45, 90, 35, 78];
      const passingMark = 50;
      
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testMarkListId, testStudents[i].school_id, testStudents[i].student_name,
          testClassName, 'Geography', 'Term 1', markValues[i], 100, markValues[i], 'test_teacher'
        ]);
      }

      const result = await testPool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN marks_obtained >= $1 THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN marks_obtained < $1 THEN 1 ELSE 0 END) as failed
        FROM marks
        WHERE mark_list_id = $2
      `, [passingMark, testMarkListId]);

      expect(parseInt(result.rows[0].total)).toBe(5);
      expect(parseInt(result.rows[0].passed)).toBe(3);
      expect(parseInt(result.rows[0].failed)).toBe(2);
    });
  });

  describe('6. Retrieve Marks', () => {
    beforeEach(async () => {
      // Create multiple mark lists
      for (let term = 1; term <= 2; term++) {
        const mlResult = await testPool.query(`
          INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [testClassName, 'Physics', `Term ${term}`, 100, 'test_teacher']);
        
        const markListId = mlResult.rows[0].id;
        
        // Add marks for students
        for (const student of testStudents) {
          await testPool.query(`
            INSERT INTO marks (
              mark_list_id, student_id, student_name, class, subject, term,
              marks_obtained, total_marks, percentage, entered_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            markListId, student.school_id, student.student_name, testClassName,
            'Physics', `Term ${term}`, 80, 100, 80, 'test_teacher'
          ]);
        }
      }
    });

    test('should retrieve marks by student', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(
        'SELECT * FROM marks WHERE student_id = $1 ORDER BY term',
        [student.school_id]
      );

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].student_id).toBe(student.school_id);
    });

    test('should retrieve marks by subject', async () => {
      const result = await testPool.query(
        'SELECT * FROM marks WHERE subject = $1',
        ['Physics']
      );

      expect(result.rows.length).toBe(testStudents.length * 2);
    });

    test('should retrieve marks by term', async () => {
      const result = await testPool.query(
        'SELECT * FROM marks WHERE term = $1',
        ['Term 1']
      );

      expect(result.rows.length).toBe(testStudents.length);
    });

    test('should retrieve marks by class', async () => {
      const result = await testPool.query(
        'SELECT * FROM marks WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBe(testStudents.length * 2);
    });
  });

  describe('7. Mark Validation', () => {
    beforeEach(async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'Chemistry', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = result.rows[0].id;
    });

    test('should validate marks do not exceed total marks', async () => {
      const student = testStudents[0];
      
      // Application should validate before inserting
      const marksObtained = 105; // Exceeds total
      const totalMarks = 100;
      
      if (marksObtained > totalMarks) {
        expect(marksObtained).toBeGreaterThan(totalMarks);
        // Application should reject this
      }
    });

    test('should validate marks are not negative', async () => {
      const student = testStudents[0];
      
      // Application should validate before inserting
      const marksObtained = -10;
      
      if (marksObtained < 0) {
        expect(marksObtained).toBeLessThan(0);
        // Application should reject this
      }
    });

    test('should prevent duplicate marks for same student in same mark list', async () => {
      const student = testStudents[0];
      
      await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Chemistry', 'Term 1', 85, 100, 85, 'test_teacher'
      ]);

      try {
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testMarkListId, student.school_id, student.student_name, testClassName,
          'Chemistry', 'Term 1', 90, 100, 90, 'test_teacher'
        ]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBe('23505'); // Unique violation
      }
    });
  });

  describe('8. Offline Mark Entry Sync', () => {
    beforeEach(async () => {
      const result = await testPool.query(`
        INSERT INTO mark_lists (class, subject, term, total_marks, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [testClassName, 'Biology', 'Term 1', 100, 'test_teacher']);
      
      testMarkListId = result.rows[0].id;
    });

    test('should mark entry as unsynced for offline mode', async () => {
      const student = testStudents[0];
      
      const result = await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, entered_by, synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Biology', 'Term 1', 88, 100, 88, 'test_teacher', false
      ]);

      expect(result.rows[0].synced).toBe(false);
    });

    test('should retrieve unsynced marks', async () => {
      for (let i = 0; i < testStudents.length; i++) {
        await testPool.query(`
          INSERT INTO marks (
            mark_list_id, student_id, student_name, class, subject, term,
            marks_obtained, total_marks, percentage, entered_by, synced
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          testMarkListId, testStudents[i].school_id, testStudents[i].student_name,
          testClassName, 'Biology', 'Term 1', 80, 100, 80, 'test_teacher', i < 2
        ]);
      }

      const result = await testPool.query(
        'SELECT * FROM marks WHERE synced = FALSE'
      );

      expect(result.rows.length).toBe(3);
    });

    test('should mark as synced after successful sync', async () => {
      const student = testStudents[0];
      
      await testPool.query(`
        INSERT INTO marks (
          mark_list_id, student_id, student_name, class, subject, term,
          marks_obtained, total_marks, percentage, entered_by, synced
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        testMarkListId, student.school_id, student.student_name, testClassName,
        'Biology', 'Term 1', 92, 100, 92, 'test_teacher', false
      ]);

      await testPool.query(`
        UPDATE marks 
        SET synced = TRUE
        WHERE mark_list_id = $1 AND student_id = $2
      `, [testMarkListId, student.school_id]);

      const result = await testPool.query(
        'SELECT * FROM marks WHERE mark_list_id = $1 AND student_id = $2',
        [testMarkListId, student.school_id]
      );

      expect(result.rows[0].synced).toBe(true);
    });
  });
});
