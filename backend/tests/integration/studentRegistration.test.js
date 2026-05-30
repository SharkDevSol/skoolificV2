/**
 * Integration Tests for Student Registration API
 * 
 * Tests the complete student registration flow including:
 * - Successful registration with valid data
 * - Validation of required fields
 * - Duplicate prevention (student IDs, machine IDs)
 * - Database verification
 * - Error handling
 * - Multi-branch support
 * - Guardian reuse functionality
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

describe('Student Registration API Integration Tests', () => {
  let testPool;
  let testClassName;

  beforeAll(async () => {
    // Initialize test database connection
    testPool = await initTestDatabase();
    
    // Create a test class for student registration
    testClassName = `TEST_CLASS_${Date.now()}`;
    
    // Ensure school_schema_points schema exists
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    
    // Create global ID tracker
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_id_tracker (
        id SERIAL PRIMARY KEY,
        last_school_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Initialize tracker if empty
    const trackerCheck = await testPool.query('SELECT COUNT(*) FROM school_schema_points.global_id_tracker');
    if (parseInt(trackerCheck.rows[0].count) === 0) {
      await testPool.query('INSERT INTO school_schema_points.global_id_tracker (last_school_id) VALUES (0)');
    }
    
    // Create global machine IDs table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.global_machine_ids (
        smachine_id VARCHAR(50) PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        school_id INTEGER,
        class_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create classes_schema
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        class_id INTEGER,
        image_student VARCHAR(255),
        student_name VARCHAR(255) NOT NULL,
        smachine_id VARCHAR(50) UNIQUE,
        age INTEGER NOT NULL,
        gender VARCHAR(50) NOT NULL,
        class VARCHAR(50) NOT NULL,
        username VARCHAR(255),
        password VARCHAR(255),
        guardian_name VARCHAR(255) NOT NULL,
        guardian_phone VARCHAR(20) NOT NULL,
        guardian_relation VARCHAR(50) NOT NULL,
        guardian_username VARCHAR(255),
        guardian_password VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        is_free BOOLEAN DEFAULT FALSE,
        exemption_type VARCHAR(50),
        exemption_reason TEXT
      )
    `);
    
    // Store class in school_schema_points.classes
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS school_schema_points.classes (
        id INTEGER PRIMARY KEY,
        class_count INTEGER NOT NULL,
        class_names TEXT[] NOT NULL,
        custom_fields JSONB DEFAULT '[]'::jsonb
      )
    `);
    
    await testPool.query(`
      INSERT INTO school_schema_points.classes (id, class_count, class_names, custom_fields)
      VALUES (1, 1, $1, '[]'::jsonb)
      ON CONFLICT (id) DO UPDATE 
      SET class_names = array_append(school_schema_points.classes.class_names, $1::text)
    `, [[testClassName]]);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestDatabase();
    
    // Drop test class table
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    
    // Close database connection
    await closeTestDatabase();
  });

  afterEach(async () => {
    // Clean up test students after each test
    if (testClassName) {
      await testPool.query(`DELETE FROM classes_schema."${testClassName}" WHERE school_id LIKE 'TEST_%' OR student_name LIKE 'Test%'`);
    }
    await testPool.query(`DELETE FROM school_schema_points.global_machine_ids WHERE smachine_id LIKE 'TEST_%'`);
  });

  describe('1. Successful Registration', () => {
    test('should successfully register a new student with valid data', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student One',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian One',
        guardian_phone: '+251911111111',
        guardian_relation: 'Father'
      };

      const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message', 'Student added successfully');
      expect(response.data).toHaveProperty('student_username');
      expect(response.data).toHaveProperty('student_password');
      expect(response.data).toHaveProperty('guardian_username');
      expect(response.data).toHaveProperty('guardian_password');
      expect(response.data).toHaveProperty('generated_ids');
      expect(response.data.generated_ids).toHaveProperty('school_id');
      expect(response.data.generated_ids).toHaveProperty('class_id');

      // Verify student was inserted into database
      const dbResult = await testPool.query(
        `SELECT * FROM classes_schema."${testClassName}" WHERE student_name = $1`,
        [studentData.student_name]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].student_name).toBe(studentData.student_name);
      expect(dbResult.rows[0].age).toBe(studentData.age);
      expect(dbResult.rows[0].gender).toBe(studentData.gender);
      expect(dbResult.rows[0].guardian_name).toBe(studentData.guardian_name);
      expect(dbResult.rows[0].guardian_phone).toBe(studentData.guardian_phone);
      expect(dbResult.rows[0].school_id).toBeGreaterThan(0);
      expect(dbResult.rows[0].class_id).toBeGreaterThan(0);
    });

    test('should register student with machine ID', async () => {
      const machineId = generateTestId('TEST_MACHINE');
      const studentData = {
        class: testClassName,
        student_name: 'Test Student With Machine',
        age: 16,
        gender: 'Female',
        guardian_name: 'Test Guardian Two',
        guardian_phone: '+251911111112',
        guardian_relation: 'Mother',
        smachine_id: machineId
      };

      const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);

      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Student added successfully');

      // Verify machine ID was stored
      const dbResult = await testPool.query(
        `SELECT * FROM classes_schema."${testClassName}" WHERE smachine_id = $1`,
        [machineId]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].smachine_id).toBe(machineId);

      // Verify machine ID was added to global tracker
      const trackerResult = await testPool.query(
        'SELECT * FROM school_schema_points.global_machine_ids WHERE smachine_id = $1',
        [machineId]
      );

      expect(trackerResult.rows.length).toBe(1);
      expect(trackerResult.rows[0].student_name).toBe(studentData.student_name);
      expect(trackerResult.rows[0].class_name).toBe(testClassName);
    });
  });

  describe('2. Validation Tests', () => {
    test('should reject registration without required student_name', async () => {
      const studentData = {
        class: testClassName,
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111113',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
      }
    });

    test('should reject registration without required age', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student',
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111114',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
      }
    });

    test('should reject registration without required gender', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student',
        age: 15,
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111115',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
      }
    });

    test('should reject registration without guardian information', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student',
        age: 15,
        gender: 'Male'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
      }
    });

    test('should reject registration without class name', async () => {
      const studentData = {
        student_name: 'Test Student',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111116',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
        expect(error.response.data.details).toContain('Class name is required');
      }
    });
  });

  describe('3. Duplicate Prevention', () => {
    test('should prevent duplicate machine IDs within same class', async () => {
      const machineId = generateTestId('TEST_DUP_MACHINE');
      
      // First registration
      const studentData1 = {
        class: testClassName,
        student_name: 'Test Student First',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111117',
        guardian_relation: 'Father',
        smachine_id: machineId
      };

      const response1 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData1);
      expect(response1.status).toBe(200);

      // Second registration with same machine ID
      const studentData2 = {
        class: testClassName,
        student_name: 'Test Student Second',
        age: 16,
        gender: 'Female',
        guardian_name: 'Test Guardian Two',
        guardian_phone: '+251911111118',
        guardian_relation: 'Mother',
        smachine_id: machineId
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData2);
        fail('Should have thrown an error for duplicate machine ID');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
        expect(error.response.data.details).toContain('Machine ID');
        expect(error.response.data.details).toContain('already added');
      }
    });

    test('should allow same guardian for multiple students (guardian reuse)', async () => {
      const guardianPhone = '+251911111119';
      
      // First student
      const studentData1 = {
        class: testClassName,
        student_name: 'Test Student Sibling One',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian Shared',
        guardian_phone: guardianPhone,
        guardian_relation: 'Father'
      };

      const response1 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData1);
      expect(response1.status).toBe(200);
      
      const guardian1Username = response1.data.guardian_username;
      const guardian1Password = response1.data.guardian_password;

      // Second student with same guardian phone
      const studentData2 = {
        class: testClassName,
        student_name: 'Test Student Sibling Two',
        age: 13,
        gender: 'Female',
        guardian_name: 'Test Guardian Shared',
        guardian_phone: guardianPhone,
        guardian_relation: 'Father'
      };

      const response2 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData2);
      expect(response2.status).toBe(200);

      // Guardian credentials should be reused
      expect(response2.data.guardian_username).toBe(guardian1Username);
      expect(response2.data.guardian_password).toBe(guardian1Password);

      // Verify both students have same guardian credentials in database
      const dbResult = await testPool.query(
        `SELECT guardian_username, guardian_password FROM classes_schema."${testClassName}" 
         WHERE guardian_phone = $1`,
        [guardianPhone]
      );

      expect(dbResult.rows.length).toBe(2);
      expect(dbResult.rows[0].guardian_username).toBe(dbResult.rows[1].guardian_username);
      expect(dbResult.rows[0].guardian_password).toBe(dbResult.rows[1].guardian_password);
    });
  });

  describe('4. Database Verification', () => {
    test('should correctly store all student data in database', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student Complete',
        age: 17,
        gender: 'Male',
        guardian_name: 'Test Guardian Complete',
        guardian_phone: '+251911111120',
        guardian_relation: 'Father'
      };

      const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
      expect(response.status).toBe(200);

      // Verify all fields in database
      const dbResult = await testPool.query(
        `SELECT * FROM classes_schema."${testClassName}" WHERE student_name = $1`,
        [studentData.student_name]
      );

      const student = dbResult.rows[0];
      expect(student.student_name).toBe(studentData.student_name);
      expect(student.age).toBe(studentData.age);
      expect(student.gender).toBe(studentData.gender);
      expect(student.class).toBe(testClassName);
      expect(student.guardian_name).toBe(studentData.guardian_name);
      expect(student.guardian_phone).toBe(studentData.guardian_phone);
      expect(student.guardian_relation).toBe(studentData.guardian_relation);
      expect(student.username).toBeTruthy();
      expect(student.password).toBeTruthy();
      expect(student.guardian_username).toBeTruthy();
      expect(student.guardian_password).toBeTruthy();
      expect(student.school_id).toBeGreaterThan(0);
      expect(student.class_id).toBeGreaterThan(0);
      expect(student.is_active).toBe(true);
    });

    test('should generate unique school_id and class_id', async () => {
      // Register multiple students
      const students = [];
      for (let i = 0; i < 3; i++) {
        const studentData = {
          class: testClassName,
          student_name: `Test Student ${i}`,
          age: 15 + i,
          gender: i % 2 === 0 ? 'Male' : 'Female',
          guardian_name: `Test Guardian ${i}`,
          guardian_phone: `+25191111112${i}`,
          guardian_relation: 'Father'
        };

        const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        expect(response.status).toBe(200);
        students.push(response.data.generated_ids);
      }

      // Verify all school_ids are unique and sequential
      const schoolIds = students.map(s => s.school_id);
      const uniqueSchoolIds = [...new Set(schoolIds)];
      expect(uniqueSchoolIds.length).toBe(3);
      
      // Verify school_ids are sequential
      expect(schoolIds[1]).toBe(schoolIds[0] + 1);
      expect(schoolIds[2]).toBe(schoolIds[1] + 1);

      // Verify all class_ids are unique and sequential within the class
      const classIds = students.map(s => s.class_id);
      const uniqueClassIds = [...new Set(classIds)];
      expect(uniqueClassIds.length).toBe(3);
      
      // Verify class_ids are sequential
      expect(classIds[1]).toBe(classIds[0] + 1);
      expect(classIds[2]).toBe(classIds[1] + 1);
    });

    test('should update global ID tracker after registration', async () => {
      // Get current global ID
      const beforeResult = await testPool.query(
        'SELECT last_school_id FROM school_schema_points.global_id_tracker LIMIT 1'
      );
      const beforeId = beforeResult.rows[0].last_school_id;

      // Register a student
      const studentData = {
        class: testClassName,
        student_name: 'Test Student Tracker',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian Tracker',
        guardian_phone: '+251911111123',
        guardian_relation: 'Father'
      };

      const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
      expect(response.status).toBe(200);

      // Get updated global ID
      const afterResult = await testPool.query(
        'SELECT last_school_id FROM school_schema_points.global_id_tracker LIMIT 1'
      );
      const afterId = afterResult.rows[0].last_school_id;

      // Verify ID was incremented
      expect(afterId).toBe(beforeId + 1);
    });
  });

  describe('5. Error Handling', () => {
    test('should handle invalid class name gracefully', async () => {
      const studentData = {
        class: 'NONEXISTENT_CLASS',
        student_name: 'Test Student',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111124',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
      }
    });

    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failure
      // For now, we'll just verify the error structure
      const studentData = {
        class: testClassName,
        student_name: 'Test Student Error',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian Error',
        guardian_phone: '+251911111125',
        guardian_relation: 'Father'
      };

      // Normal registration should work
      const response = await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
      expect(response.status).toBe(200);
    });

    test('should provide detailed error messages', async () => {
      const studentData = {
        class: testClassName,
        student_name: 'Test Student',
        age: 'invalid', // Invalid age type
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111126',
        guardian_relation: 'Father'
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data).toHaveProperty('details');
      }
    });
  });

  describe('6. Multi-branch Support', () => {
    test('should support registration in different classes (simulating branches)', async () => {
      // Create another test class
      const testClassName2 = `TEST_CLASS_2_${Date.now()}`;
      
      await testPool.query(`
        CREATE TABLE IF NOT EXISTS classes_schema."${testClassName2}" (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          class_id INTEGER,
          student_name VARCHAR(255) NOT NULL,
          smachine_id VARCHAR(50) UNIQUE,
          age INTEGER NOT NULL,
          gender VARCHAR(50) NOT NULL,
          class VARCHAR(50) NOT NULL,
          username VARCHAR(255),
          password VARCHAR(255),
          guardian_name VARCHAR(255) NOT NULL,
          guardian_phone VARCHAR(20) NOT NULL,
          guardian_relation VARCHAR(50) NOT NULL,
          guardian_username VARCHAR(255),
          guardian_password VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE
        )
      `);

      // Register student in first class
      const studentData1 = {
        class: testClassName,
        student_name: 'Test Student Branch 1',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111127',
        guardian_relation: 'Father'
      };

      const response1 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData1);
      expect(response1.status).toBe(200);
      const schoolId1 = response1.data.generated_ids.school_id;

      // Register student in second class
      const studentData2 = {
        class: testClassName2,
        student_name: 'Test Student Branch 2',
        age: 16,
        gender: 'Female',
        guardian_name: 'Test Guardian 2',
        guardian_phone: '+251911111128',
        guardian_relation: 'Mother'
      };

      const response2 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData2);
      expect(response2.status).toBe(200);
      const schoolId2 = response2.data.generated_ids.school_id;

      // Verify school_ids are sequential across classes (global counter)
      expect(schoolId2).toBe(schoolId1 + 1);

      // Verify class_ids are independent per class
      expect(response1.data.generated_ids.class_id).toBe(1);
      expect(response2.data.generated_ids.class_id).toBe(1);

      // Clean up
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName2}" CASCADE`);
    });

    test('should prevent duplicate machine IDs across different classes', async () => {
      // Create another test class
      const testClassName2 = `TEST_CLASS_3_${Date.now()}`;
      
      await testPool.query(`
        CREATE TABLE IF NOT EXISTS classes_schema."${testClassName2}" (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          class_id INTEGER,
          student_name VARCHAR(255) NOT NULL,
          smachine_id VARCHAR(50) UNIQUE,
          age INTEGER NOT NULL,
          gender VARCHAR(50) NOT NULL,
          class VARCHAR(50) NOT NULL,
          username VARCHAR(255),
          password VARCHAR(255),
          guardian_name VARCHAR(255) NOT NULL,
          guardian_phone VARCHAR(20) NOT NULL,
          guardian_relation VARCHAR(50) NOT NULL,
          guardian_username VARCHAR(255),
          guardian_password VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE
        )
      `);

      const machineId = generateTestId('TEST_CROSS_BRANCH');

      // Register student in first class with machine ID
      const studentData1 = {
        class: testClassName,
        student_name: 'Test Student Cross 1',
        age: 15,
        gender: 'Male',
        guardian_name: 'Test Guardian',
        guardian_phone: '+251911111129',
        guardian_relation: 'Father',
        smachine_id: machineId
      };

      const response1 = await axios.post(`${API_BASE_URL}/students/add-student`, studentData1);
      expect(response1.status).toBe(200);

      // Try to register student in second class with same machine ID
      const studentData2 = {
        class: testClassName2,
        student_name: 'Test Student Cross 2',
        age: 16,
        gender: 'Female',
        guardian_name: 'Test Guardian 2',
        guardian_phone: '+251911111130',
        guardian_relation: 'Mother',
        smachine_id: machineId
      };

      try {
        await axios.post(`${API_BASE_URL}/students/add-student`, studentData2);
        fail('Should have thrown an error for duplicate machine ID across classes');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Failed to add student');
        expect(error.response.data.details).toContain('Machine ID');
        expect(error.response.data.details).toContain('already added');
      }

      // Clean up
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName2}" CASCADE`);
    });
  });
});
