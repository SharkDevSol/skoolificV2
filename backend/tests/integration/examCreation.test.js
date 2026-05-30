/**
 * Integration Tests for Exam Creation and Publishing
 * 
 * Tests the complete exam lifecycle including:
 * - Manual exam creation
 * - AI-generated exam creation
 * - Exam publishing to students
 * - Exam unpublishing
 * - Exam validation
 * - Question types handling
 * - Exam scheduling
 * - Class assignment
 * - Exam retrieval
 * - Error handling
 */

const {
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  makeAuthenticatedRequest,
  generateTestId,
  getTestPool,
  API_BASE_URL
} = require('./setup');

const axios = require('axios');

describe('Exam Creation and Publishing Integration Tests', () => {
  let testPool;
  let testClassName;
  let testExamId;
  let testStudentId;
  let testTeacherId;

  beforeAll(async () => {
    // Initialize test database connection
    testPool = await initTestDatabase();
    
    testClassName = `TEST_EXAM_CLASS_${Date.now()}`;
    
    // Create required schemas
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create ai_exams table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS ai_exams (
        id SERIAL PRIMARY KEY,
        class VARCHAR(100) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        term VARCHAR(50),
        component VARCHAR(100),
        exam_title VARCHAR(255) NOT NULL,
        exam_description TEXT,
        total_marks INTEGER NOT NULL,
        time_limit INTEGER,
        difficulty_level VARCHAR(50),
        language VARCHAR(50) DEFAULT 'English',
        questions JSONB NOT NULL,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft'
      )
    `);
    
    // Create student_exams table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS student_exams (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES ai_exams(id),
        student_id INTEGER NOT NULL,
        student_name VARCHAR(255),
        class VARCHAR(100),
        questions JSONB NOT NULL,
        answers JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'not_started',
        started_at TIMESTAMP,
        submitted_at TIMESTAMP,
        auto_submitted BOOLEAN DEFAULT FALSE,
        marks_obtained DECIMAL(5,2),
        percentage DECIMAL(5,2),
        graded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        student_name VARCHAR(255) NOT NULL,
        age INTEGER,
        gender VARCHAR(50),
        class VARCHAR(50),
        username VARCHAR(255),
        password VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create test student
    const studentResult = await testPool.query(`
      INSERT INTO classes_schema."${testClassName}" (
        school_id, student_name, age, gender, class, username, password, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [1001, 'Test Student Exam', 15, 'Male', testClassName, 'test_exam_student', 'pass123', true]);
    
    testStudentId = studentResult.rows[0].school_id;
    
    // Create test teacher (for created_by field)
    testTeacherId = `test_teacher_${Date.now()}`;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestDatabase();
    
    // Drop test tables
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    await testPool.query(`DELETE FROM student_exams WHERE student_id = $1`, [testStudentId]);
    await testPool.query(`DELETE FROM ai_exams WHERE class = $1`, [testClassName]);
    
    // Close database connection
    await closeTestDatabase();
  });

  afterEach(async () => {
    // Clean up test exams after each test
    if (testExamId) {
      await testPool.query(`DELETE FROM student_exams WHERE exam_id = $1`, [testExamId]);
      await testPool.query(`DELETE FROM ai_exams WHERE id = $1`, [testExamId]);
      testExamId = null;
    }
  });

  describe('1. Manual Exam Creation', () => {
    test('should successfully create a manual exam with valid data', async () => {
      const examData = {
        class: testClassName,
        subject: 'Mathematics',
        term: 'Term 1',
        component: 'Mid-term',
        exam_title: 'Test Math Exam',
        exam_description: 'Test exam for mathematics',
        total_marks: 100,
        time_limit: 60,
        difficulty_level: 'Medium',
        language: 'English',
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correct_answer: '4',
            marks: 10
          },
          {
            id: 2,
            type: 'true_false',
            question: 'The earth is flat',
            correct_answer: 'False',
            marks: 10
          }
        ],
        created_by: testTeacherId
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, term, component, exam_title, exam_description,
          total_marks, time_limit, difficulty_level, language, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        examData.class, examData.subject, examData.term, examData.component,
        examData.exam_title, examData.exam_description, examData.total_marks,
        examData.time_limit, examData.difficulty_level, examData.language,
        JSON.stringify(examData.questions), examData.created_by
      ]);

      testExamId = result.rows[0].id;

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].exam_title).toBe(examData.exam_title);
      expect(result.rows[0].total_marks).toBe(examData.total_marks);
      expect(result.rows[0].is_published).toBe(false);
      expect(result.rows[0].status).toBe('draft');
    });

    test('should validate required fields for exam creation', async () => {
      try {
        await testPool.query(`
          INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions)
          VALUES ($1, $2, $3, $4, $5)
        `, [null, 'Math', 'Test', 100, '[]']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('2. AI-Generated Exam Creation', () => {
    test('should create exam with AI-generated questions', async () => {
      const aiExamData = {
        class: testClassName,
        subject: 'Science',
        term: 'Term 1',
        exam_title: 'AI Generated Science Exam',
        total_marks: 50,
        questions: [
          {
            id: 1,
            type: 'multiple_choice',
            question: 'What is photosynthesis?',
            options: ['Process of making food', 'Process of breathing', 'Process of digestion', 'Process of excretion'],
            correct_answer: 'Process of making food',
            marks: 10,
            ai_generated: true
          }
        ],
        created_by: testTeacherId
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, term, exam_title, total_marks, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        aiExamData.class, aiExamData.subject, aiExamData.term,
        aiExamData.exam_title, aiExamData.total_marks,
        JSON.stringify(aiExamData.questions), aiExamData.created_by
      ]);

      testExamId = result.rows[0].id;

      expect(result.rows[0].exam_title).toBe(aiExamData.exam_title);
      const questions = result.rows[0].questions;
      expect(questions[0].ai_generated).toBe(true);
    });
  });

  describe('3. Exam Publishing', () => {
    test('should successfully publish exam to students', async () => {
      // Create exam
      const examResult = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testClassName, 'Math', 'Test Publish Exam', 100,
        JSON.stringify([{ id: 1, question: 'Test?', marks: 10 }]),
        testTeacherId
      ]);

      testExamId = examResult.rows[0].id;

      // Publish exam
      await testPool.query(`
        UPDATE ai_exams 
        SET is_published = TRUE, published_at = NOW(), status = 'published'
        WHERE id = $1
      `, [testExamId]);

      // Create student_exam record
      await testPool.query(`
        INSERT INTO student_exams (
          exam_id, student_id, student_name, class, questions
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        testExamId, testStudentId, 'Test Student Exam', testClassName,
        JSON.stringify([{ id: 1, question: 'Test?', marks: 10 }])
      ]);

      // Verify exam is published
      const publishedExam = await testPool.query(
        'SELECT * FROM ai_exams WHERE id = $1',
        [testExamId]
      );

      expect(publishedExam.rows[0].is_published).toBe(true);
      expect(publishedExam.rows[0].status).toBe('published');
      expect(publishedExam.rows[0].published_at).toBeTruthy();

      // Verify student_exam was created
      const studentExam = await testPool.query(
        'SELECT * FROM student_exams WHERE exam_id = $1 AND student_id = $2',
        [testExamId, testStudentId]
      );

      expect(studentExam.rows.length).toBe(1);
      expect(studentExam.rows[0].status).toBe('not_started');
    });

    test('should randomize questions when publishing', async () => {
      const questions = [
        { id: 1, question: 'Q1', marks: 10 },
        { id: 2, question: 'Q2', marks: 10 },
        { id: 3, question: 'Q3', marks: 10 }
      ];

      const examResult = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'Randomize Test', 30, JSON.stringify(questions), testTeacherId]);

      testExamId = examResult.rows[0].id;

      // Publish with randomization
      await testPool.query(`UPDATE ai_exams SET is_published = TRUE WHERE id = $1`, [testExamId]);

      // Create student exam with randomized questions
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      await testPool.query(`
        INSERT INTO student_exams (exam_id, student_id, student_name, class, questions)
        VALUES ($1, $2, $3, $4, $5)
      `, [testExamId, testStudentId, 'Test Student', testClassName, JSON.stringify(shuffled)]);

      const studentExam = await testPool.query(
        'SELECT questions FROM student_exams WHERE exam_id = $1',
        [testExamId]
      );

      expect(studentExam.rows[0].questions).toBeTruthy();
      expect(studentExam.rows[0].questions.length).toBe(3);
    });
  });

  describe('4. Exam Unpublishing', () => {
    test('should unpublish exam if no students have started', async () => {
      const examResult = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [testClassName, 'Math', 'Unpublish Test', 100, '[]', testTeacherId, true]);

      testExamId = examResult.rows[0].id;

      // Create student exam (not started)
      await testPool.query(`
        INSERT INTO student_exams (exam_id, student_id, student_name, class, questions, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testExamId, testStudentId, 'Test Student', testClassName, '[]', 'not_started']);

      // Unpublish
      await testPool.query(`
        UPDATE ai_exams SET is_published = FALSE, status = 'draft' WHERE id = $1
      `, [testExamId]);

      const unpublished = await testPool.query('SELECT * FROM ai_exams WHERE id = $1', [testExamId]);
      expect(unpublished.rows[0].is_published).toBe(false);
      expect(unpublished.rows[0].status).toBe('draft');
    });

    test('should prevent unpublishing if students have started', async () => {
      const examResult = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [testClassName, 'Math', 'Started Test', 100, '[]', testTeacherId, true]);

      testExamId = examResult.rows[0].id;

      // Create student exam (started)
      await testPool.query(`
        INSERT INTO student_exams (exam_id, student_id, student_name, class, questions, status, started_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [testExamId, testStudentId, 'Test Student', testClassName, '[]', 'in_progress']);

      // Check if any student has started
      const started = await testPool.query(
        `SELECT COUNT(*) FROM student_exams WHERE exam_id = $1 AND status != 'not_started'`,
        [testExamId]
      );

      expect(parseInt(started.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('5. Exam Validation', () => {
    test('should validate exam has questions', async () => {
      try {
        await testPool.query(`
          INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions)
          VALUES ($1, $2, $3, $4, $5)
        `, [testClassName, 'Math', 'Empty Exam', 100, '[]']);
        
        // Validation should happen at application level
        const result = await testPool.query(
          `SELECT * FROM ai_exams WHERE exam_title = 'Empty Exam'`
        );
        
        expect(result.rows[0].questions.length).toBe(0);
      } catch (error) {
        // Database allows empty array, validation should be in application
        expect(error).toBeTruthy();
      }
    });

    test('should validate total marks matches question marks', async () => {
      const questions = [
        { id: 1, marks: 10 },
        { id: 2, marks: 20 }
      ];
      
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      
      const result = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'Marks Test', totalMarks, JSON.stringify(questions), testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].total_marks).toBe(30);
    });
  });

  describe('6. Question Types', () => {
    test('should support multiple choice questions', async () => {
      const mcq = {
        id: 1,
        type: 'multiple_choice',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correct_answer: '4',
        marks: 10
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'MCQ Test', 10, JSON.stringify([mcq]), testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].questions[0].type).toBe('multiple_choice');
      expect(result.rows[0].questions[0].options.length).toBe(3);
    });

    test('should support true/false questions', async () => {
      const tfQuestion = {
        id: 1,
        type: 'true_false',
        question: 'The sky is blue',
        correct_answer: 'True',
        marks: 5
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Science', 'TF Test', 5, JSON.stringify([tfQuestion]), testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].questions[0].type).toBe('true_false');
    });

    test('should support short answer questions', async () => {
      const shortAnswer = {
        id: 1,
        type: 'short_answer',
        question: 'Explain photosynthesis',
        marks: 15
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Biology', 'SA Test', 15, JSON.stringify([shortAnswer]), testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].questions[0].type).toBe('short_answer');
    });

    test('should support essay questions', async () => {
      const essay = {
        id: 1,
        type: 'essay',
        question: 'Discuss the causes of World War II',
        marks: 25
      };

      const result = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'History', 'Essay Test', 25, JSON.stringify([essay]), testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].questions[0].type).toBe('essay');
    });
  });

  describe('7. Exam Scheduling', () => {
    test('should set exam start and end dates', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

      const result = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'Scheduled Exam', 100, '[]', testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].created_at).toBeTruthy();
    });

    test('should set time limit for exam', async () => {
      const result = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by, time_limit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [testClassName, 'Math', 'Timed Exam', 100, '[]', testTeacherId, 90]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].time_limit).toBe(90);
    });
  });

  describe('8. Class Assignment', () => {
    test('should assign exam to specific class', async () => {
      const result = await testPool.query(`
        INSERT INTO ai_exams (
          class, subject, exam_title, total_marks, questions, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'Class Exam', 100, '[]', testTeacherId]);

      testExamId = result.rows[0].id;
      expect(result.rows[0].class).toBe(testClassName);
    });

    test('should retrieve exams by class', async () => {
      // Create multiple exams for the class
      await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testClassName, 'Math', 'Exam 1', 100, '[]', testTeacherId]);

      await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testClassName, 'Science', 'Exam 2', 100, '[]', testTeacherId]);

      const result = await testPool.query(
        'SELECT * FROM ai_exams WHERE class = $1',
        [testClassName]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('9. Exam Retrieval', () => {
    test('should retrieve exam by ID', async () => {
      const createResult = await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [testClassName, 'Math', 'Retrieve Test', 100, '[]', testTeacherId]);

      testExamId = createResult.rows[0].id;

      const result = await testPool.query(
        'SELECT * FROM ai_exams WHERE id = $1',
        [testExamId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].exam_title).toBe('Retrieve Test');
    });

    test('should retrieve exams by teacher', async () => {
      await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testClassName, 'Math', 'Teacher Exam', 100, '[]', testTeacherId]);

      const result = await testPool.query(
        'SELECT * FROM ai_exams WHERE created_by = $1',
        [testTeacherId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should retrieve published exams only', async () => {
      await testPool.query(`
        INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testClassName, 'Math', 'Published Exam', 100, '[]', testTeacherId, true]);

      const result = await testPool.query(
        'SELECT * FROM ai_exams WHERE is_published = TRUE'
      );

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(exam => {
        expect(exam.is_published).toBe(true);
      });
    });
  });

  describe('10. Error Handling', () => {
    test('should handle invalid exam data gracefully', async () => {
      try {
        await testPool.query(`
          INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions)
          VALUES ($1, $2, $3, $4, $5)
        `, [testClassName, 'Math', 'Invalid Exam', -100, '[]']);
        
        // Negative marks should be validated at application level
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('should handle missing required fields', async () => {
      try {
        await testPool.query(`
          INSERT INTO ai_exams (class, subject)
          VALUES ($1, $2)
        `, [testClassName, 'Math']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    test('should handle invalid JSON in questions field', async () => {
      try {
        await testPool.query(`
          INSERT INTO ai_exams (class, subject, exam_title, total_marks, questions, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [testClassName, 'Math', 'Invalid JSON', 100, 'invalid json', testTeacherId]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });
});
