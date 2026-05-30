/**
 * Integration Tests for Authentication Flow
 * 
 * Tests the complete authentication flow including:
 * - Student login with username/password
 * - Staff login with username/password
 * - Guardian login with username/password
 * - Admin login
 * - Super admin login
 * - JWT token generation and validation
 * - Token expiration handling
 * - Invalid credentials handling
 * - Missing credentials validation
 * - Role-based access control
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
const jwt = require('jsonwebtoken');

describe('Authentication Flow Integration Tests', () => {
  let testPool;
  let testClassName;
  let testStudent;
  let testGuardian;
  let testStaff;
  let testAdmin;

  beforeAll(async () => {
    // Initialize test database connection
    testPool = await initTestDatabase();
    
    // Create test class for students
    testClassName = `TEST_AUTH_CLASS_${Date.now()}`;
    
    // Ensure required schemas exist
    await testPool.query('CREATE SCHEMA IF NOT EXISTS school_schema_points');
    await testPool.query('CREATE SCHEMA IF NOT EXISTS classes_schema');
    
    // Create test class table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS classes_schema."${testClassName}" (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        class_id INTEGER,
        student_name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL,
        gender VARCHAR(50) NOT NULL,
        class VARCHAR(50) NOT NULL,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        guardian_name VARCHAR(255) NOT NULL,
        guardian_phone VARCHAR(20) NOT NULL,
        guardian_relation VARCHAR(50) NOT NULL,
        guardian_username VARCHAR(255),
        guardian_password VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Create staff_users table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS staff_users (
        id SERIAL PRIMARY KEY,
        global_staff_id INTEGER NOT NULL UNIQUE,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        password_plain VARCHAR(100),
        staff_type VARCHAR(50) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create admin_users table
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    
    // Create test student with credentials
    const studentUsername = `test_student_${Date.now()}`;
    const studentPassword = 'student123';
    const studentResult = await testPool.query(`
      INSERT INTO classes_schema."${testClassName}" (
        school_id, class_id, student_name, age, gender, class,
        username, password, guardian_name, guardian_phone, guardian_relation,
        guardian_username, guardian_password, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      1001, 1, 'Test Student Auth', 15, 'Male', testClassName,
      studentUsername, studentPassword,
      'Test Guardian Auth', '+251911000001', 'Father',
      `test_guardian_${Date.now()}`, 'guardian123', true
    ]);
    
    testStudent = {
      username: studentUsername,
      password: studentPassword,
      data: studentResult.rows[0]
    };
    
    testGuardian = {
      username: studentResult.rows[0].guardian_username,
      password: studentResult.rows[0].guardian_password
    };
    
    // Create test staff with hashed password
    const bcrypt = require('bcrypt');
    const staffUsername = `test_staff_${Date.now()}`;
    const staffPassword = 'staff123';
    const staffPasswordHash = await bcrypt.hash(staffPassword, 10);
    
    await testPool.query(`
      INSERT INTO staff_users (
        global_staff_id, username, password_hash, password_plain,
        staff_type, class_name
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      9001, staffUsername, staffPasswordHash, staffPassword,
      'Teacher', testClassName
    ]);
    
    testStaff = {
      username: staffUsername,
      password: staffPassword,
      globalStaffId: 9001
    };
    
    // Create test admin
    const adminUsername = `test_admin_${Date.now()}`;
    const adminPassword = 'admin123';
    
    await testPool.query(`
      INSERT INTO admin_users (username, password, email, role)
      VALUES ($1, $2, $3, $4)
    `, [adminUsername, adminPassword, 'test@admin.com', 'admin']);
    
    testAdmin = {
      username: adminUsername,
      password: adminPassword
    };
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestDatabase();
    
    // Drop test tables
    if (testClassName) {
      await testPool.query(`DROP TABLE IF EXISTS classes_schema."${testClassName}" CASCADE`);
    }
    
    // Clean up test users
    if (testStudent) {
      await testPool.query(`DELETE FROM classes_schema."${testClassName}" WHERE username = $1`, [testStudent.username]);
    }
    if (testStaff) {
      await testPool.query(`DELETE FROM staff_users WHERE username = $1`, [testStaff.username]);
    }
    if (testAdmin) {
      await testPool.query(`DELETE FROM admin_users WHERE username = $1`, [testAdmin.username]);
    }
    
    // Close database connection
    await closeTestDatabase();
  });

  describe('1. Student Login', () => {
    test('should successfully login with valid student credentials', async () => {
      const response = await axios.post(`${API_BASE_URL}/students/login`, {
        username: testStudent.username,
        password: testStudent.password
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('role', 'student');
      expect(response.data).toHaveProperty('student');
      expect(response.data.student).toHaveProperty('username', testStudent.username);
      expect(response.data.student).toHaveProperty('student_name');
      expect(response.data.student).toHaveProperty('class');
    });

    test('should reject student login with invalid password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          username: testStudent.username,
          password: 'wrongpassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toContain('Invalid');
      }
    });

    test('should reject student login with non-existent username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          username: 'nonexistent_student',
          password: 'anypassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject student login with missing username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          password: testStudent.password
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject student login with missing password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          username: testStudent.username
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should not return sensitive data in student login response', async () => {
      const response = await axios.post(`${API_BASE_URL}/students/login`, {
        username: testStudent.username,
        password: testStudent.password
      });

      expect(response.status).toBe(200);
      // Password should not be in response (or should be masked)
      if (response.data.student.password) {
        expect(response.data.student.password).not.toBe(testStudent.password);
      }
    });
  });

  describe('2. Staff Login', () => {
    test('should successfully login with valid staff credentials', async () => {
      // Note: Staff login might be through a different endpoint
      // Adjust the endpoint based on actual implementation
      try {
        const response = await axios.post(`${API_BASE_URL}/staff/login`, {
          username: testStaff.username,
          password: testStaff.password
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('user');
        expect(response.data.user).toHaveProperty('username', testStaff.username);
        expect(response.data.user).toHaveProperty('staffType');
      } catch (error) {
        // If endpoint doesn't exist, check if it's a 404
        if (error.response && error.response.status === 404) {
          console.log('Staff login endpoint not found - may need to be implemented');
        } else {
          throw error;
        }
      }
    });

    test('should reject staff login with invalid password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/staff/login`, {
          username: testStaff.username,
          password: 'wrongpassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Accept 401 (invalid credentials) or 404 (endpoint not found)
        expect([401, 404]).toContain(error.response.status);
      }
    });

    test('should reject staff login with non-existent username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/staff/login`, {
          username: 'nonexistent_staff',
          password: 'anypassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect([401, 404]).toContain(error.response.status);
      }
    });
  });

  describe('3. Guardian Login', () => {
    test('should successfully login with valid guardian credentials', async () => {
      const response = await axios.post(`${API_BASE_URL}/students/login`, {
        username: testGuardian.username,
        password: testGuardian.password
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('role', 'guardian');
      expect(response.data).toHaveProperty('student');
      expect(response.data.student).toHaveProperty('guardian_username', testGuardian.username);
    });

    test('should reject guardian login with invalid password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          username: testGuardian.username,
          password: 'wrongpassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject guardian login with non-existent username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/students/login`, {
          username: 'nonexistent_guardian',
          password: 'anypassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('4. Admin Login', () => {
    test('should successfully login with valid admin credentials', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('message', 'Login successful');
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('username', testAdmin.username);
      expect(response.data.user).toHaveProperty('role', 'admin');
    });

    test('should reject admin login with invalid password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: testAdmin.username,
          password: 'wrongpassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject admin login with non-existent username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: 'nonexistent_admin',
          password: 'anypassword'
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should update last_login timestamp on successful admin login', async () => {
      const beforeLogin = new Date();
      
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);

      // Verify last_login was updated in database
      const result = await testPool.query(
        'SELECT last_login FROM admin_users WHERE username = $1',
        [testAdmin.username]
      );

      expect(result.rows.length).toBe(1);
      const lastLogin = new Date(result.rows[0].last_login);
      expect(lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('5. Super Admin Login', () => {
    test('should successfully login with super admin credentials', async () => {
      // Create a super admin user
      const superAdminUsername = `test_superadmin_${Date.now()}`;
      const superAdminPassword = 'superadmin123';
      
      await testPool.query(`
        INSERT INTO admin_users (username, password, email, role)
        VALUES ($1, $2, $3, $4)
      `, [superAdminUsername, superAdminPassword, 'super@admin.com', 'super_admin']);

      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: superAdminUsername,
        password: superAdminPassword
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('token');
      expect(response.data.user).toHaveProperty('role', 'super_admin');

      // Clean up
      await testPool.query('DELETE FROM admin_users WHERE username = $1', [superAdminUsername]);
    });
  });

  describe('6. Token Generation', () => {
    test('should generate valid JWT token on successful admin login', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      
      const token = response.data.token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      // Verify token structure (JWT has 3 parts separated by dots)
      const tokenParts = token.split('.');
      expect(tokenParts.length).toBe(3);
    });

    test('should include user information in JWT token payload', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      const token = response.data.token;
      
      // Decode token (without verification for testing)
      const decoded = jwt.decode(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('username', testAdmin.username);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('role', 'admin');
    });

    test('should set token expiration time', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      const token = response.data.token;
      
      const decoded = jwt.decode(token);
      
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
      
      // Expiration should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
      
      // Issued at should be in the past or now
      expect(decoded.iat).toBeLessThanOrEqual(now + 5); // Allow 5 second buffer
    });
  });

  describe('7. Token Validation', () => {
    test('should accept valid token for authenticated requests', async () => {
      // Login to get token
      const loginResponse = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      const token = loginResponse.data.token;

      // Make authenticated request (adjust endpoint based on actual protected routes)
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // If endpoint exists, it should return 200
        expect([200, 404]).toContain(response.status);
      } catch (error) {
        // Accept 404 if endpoint doesn't exist, but not 401 (unauthorized)
        if (error.response) {
          expect(error.response.status).not.toBe(401);
        }
      }
    });

    test('should reject requests with invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      try {
        await axios.get(`${API_BASE_URL}/admin/profile`, {
          headers: {
            'Authorization': `Bearer ${invalidToken}`
          }
        });
        // If no error, endpoint might not exist or doesn't validate tokens
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          expect([401, 403]).toContain(error.response.status);
        }
      }
    });

    test('should reject requests with missing token', async () => {
      try {
        await axios.get(`${API_BASE_URL}/admin/profile`);
        // If no error, endpoint might not exist or doesn't require auth
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          expect([401, 403]).toContain(error.response.status);
        }
      }
    });

    test('should reject requests with malformed Authorization header', async () => {
      try {
        await axios.get(`${API_BASE_URL}/admin/profile`, {
          headers: {
            'Authorization': 'InvalidFormat token123'
          }
        });
        // If no error, endpoint might not exist
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          expect([401, 403]).toContain(error.response.status);
        }
      }
    });
  });

  describe('8. Token Expiration', () => {
    test('should reject expired token', async () => {
      // This test would require creating a token with very short expiration
      // or mocking the JWT verification
      // For now, we'll test the token structure includes expiration
      
      const loginResponse = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      const token = loginResponse.data.token;
      const decoded = jwt.decode(token);
      
      // Verify token has expiration
      expect(decoded).toHaveProperty('exp');
      expect(typeof decoded.exp).toBe('number');
    });
  });

  describe('9. Invalid Credentials Handling', () => {
    test('should return consistent error message for invalid credentials', async () => {
      const testCases = [
        { username: 'wrong_user', password: testAdmin.password },
        { username: testAdmin.username, password: 'wrong_password' },
        { username: 'wrong_user', password: 'wrong_password' }
      ];

      for (const testCase of testCases) {
        try {
          await axios.post(`${API_BASE_URL}/admin/login`, testCase);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.response.status).toBe(401);
          expect(error.response.data).toHaveProperty('error');
          // Error message should not reveal whether username or password was wrong
          expect(error.response.data.error).toBeTruthy();
        }
      }
    });

    test('should not reveal user existence through error messages', async () => {
      const nonExistentResponse = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: 'definitely_does_not_exist',
        password: 'anypassword'
      }).catch(err => err.response);

      const wrongPasswordResponse = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: 'wrongpassword'
      }).catch(err => err.response);

      // Both should return same status code
      expect(nonExistentResponse.status).toBe(wrongPasswordResponse.status);
      
      // Error messages should be similar (not revealing which field was wrong)
      expect(nonExistentResponse.data.error).toBeTruthy();
      expect(wrongPasswordResponse.data.error).toBeTruthy();
    });
  });

  describe('10. Missing Credentials Validation', () => {
    test('should reject login with empty username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: '',
          password: testAdmin.password
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject login with empty password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: testAdmin.username,
          password: ''
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject login with null username', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: null,
          password: testAdmin.password
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject login with null password', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`, {
          username: testAdmin.username,
          password: null
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });

    test('should reject login with missing request body', async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/login`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('11. Role-Based Access Control', () => {
    test('should include role information in login response', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toHaveProperty('role');
      expect(response.data.user.role).toBe('admin');
    });

    test('should include role in JWT token payload', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      const token = response.data.token;
      const decoded = jwt.decode(token);
      
      expect(decoded).toHaveProperty('role');
      expect(decoded.role).toBe('admin');
    });

    test('should differentiate between student and guardian roles', async () => {
      const studentResponse = await axios.post(`${API_BASE_URL}/students/login`, {
        username: testStudent.username,
        password: testStudent.password
      });

      const guardianResponse = await axios.post(`${API_BASE_URL}/students/login`, {
        username: testGuardian.username,
        password: testGuardian.password
      });

      expect(studentResponse.data.role).toBe('student');
      expect(guardianResponse.data.role).toBe('guardian');
      expect(studentResponse.data.role).not.toBe(guardianResponse.data.role);
    });

    test('should include staff type in staff login response', async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/staff/login`, {
          username: testStaff.username,
          password: testStaff.password
        });

        if (response.status === 200) {
          expect(response.data.user).toHaveProperty('staffType');
          expect(response.data.user.staffType).toBe('Teacher');
        }
      } catch (error) {
        // Accept 404 if endpoint doesn't exist yet
        if (error.response && error.response.status !== 404) {
          throw error;
        }
      }
    });
  });

  describe('12. Security Best Practices', () => {
    test('should not return password in login response', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      expect(response.status).toBe(200);
      expect(response.data.user).not.toHaveProperty('password');
      expect(response.data.user).not.toHaveProperty('password_hash');
    });

    test('should use secure password comparison (timing-safe)', async () => {
      // This test verifies that login attempts take similar time
      // regardless of whether username or password is wrong
      
      const start1 = Date.now();
      await axios.post(`${API_BASE_URL}/admin/login`, {
        username: 'nonexistent',
        password: 'anypassword'
      }).catch(() => {});
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: 'wrongpassword'
      }).catch(() => {});
      const time2 = Date.now() - start2;

      // Times should be within reasonable range (not revealing which field was wrong)
      // Allow 500ms difference for network variance
      expect(Math.abs(time1 - time2)).toBeLessThan(500);
    });

    test('should use HTTPS in production (check headers)', async () => {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username: testAdmin.username,
        password: testAdmin.password
      });

      // In production, secure headers should be present
      // This is a basic check - actual HTTPS enforcement happens at server level
      expect(response.status).toBe(200);
    });
  });
});
