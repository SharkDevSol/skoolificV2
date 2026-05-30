/**
 * Branch Authentication System - End-to-End Tests
 * 
 * Tests for Phase 1.7: Branch Code Authentication System
 * 
 * Test Coverage:
 * 1. Branch code validation
 * 2. Login flow with branch code
 * 3. JWT token generation with branch context
 * 4. Protected route access with branch validation
 * 5. Branch switching
 * 6. Error handling
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '12345678';
process.env.DB_NAME = 'skoolific';

// Import app after setting env vars
const app = require('../server');
const DatabaseConnectionManager = require('../services/DatabaseConnectionManager');

describe('Branch Authentication System - E2E Tests', () => {
  let testBranches = [];
  let testUsers = {};
  let authTokens = {};

  // Setup: Create test branches and users
  beforeAll(async () => {
    console.log('Setting up test environment...');

    // Test branches to create
    testBranches = [
      { branchCode: 'TST', branchName: 'Test Branch', databaseName: 'skoolific_test_branch' },
      { branchCode: 'DEV', branchName: 'Dev Branch', databaseName: 'skoolific_dev_branch' },
      { branchCode: 'STG', branchName: 'Staging Branch', databaseName: 'skoolific_staging_branch' }
    ];

    // Create test branches in master database
    const masterPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    try {
      // Ensure branch_config table exists
      await masterPool.query(`
        CREATE TABLE IF NOT EXISTS branch_config (
          id SERIAL PRIMARY KEY,
          branch_code VARCHAR(3) UNIQUE NOT NULL,
          branch_name VARCHAR(255) NOT NULL,
          database_name VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test branches
      for (const branch of testBranches) {
        await masterPool.query(
          `INSERT INTO branch_config (branch_code, branch_name, database_name) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (branch_code) DO NOTHING`,
          [branch.branchCode, branch.branchName, branch.databaseName]
        );
      }

      console.log('Test branches created successfully');
    } catch (error) {
      console.error('Error setting up test branches:', error);
    } finally {
      await masterPool.end();
    }

    // Test users for each user type
    testUsers = {
      admin: { username: 'test_admin', password: 'admin123', userType: 'admin' },
      staff: { username: 'test_staff', password: 'staff123', userType: 'staff' },
      student: { username: 'test_student', password: 'student123', userType: 'student' },
      guardian: { username: 'test_guardian', password: 'guardian123', userType: 'guardian' }
    };
  });

  // Cleanup: Remove test branches and users
  afterAll(async () => {
    console.log('Cleaning up test environment...');

    const masterPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    try {
      // Remove test branches
      await masterPool.query(
        `DELETE FROM branch_config WHERE branch_code IN ('TST', 'DEV', 'STG')`
      );
      console.log('Test branches removed successfully');
    } catch (error) {
      console.error('Error cleaning up test branches:', error);
    } finally {
      await masterPool.end();
    }
  });

  // ============================================================================
  // TEST SUITE 1: Branch Code Validation
  // ============================================================================
  describe('1. Branch Code Validation', () => {
    test('1.1 Should validate correct branch code format', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'TST' })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('databaseName', 'skoolific_test_branch');
    });

    test('1.2 Should reject invalid branch code format (lowercase)', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'tst' })
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body.message).toContain('3 uppercase letters');
    });

    test('1.3 Should reject invalid branch code format (too short)', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'TS' })
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });

    test('1.4 Should reject invalid branch code format (too long)', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'TEST' })
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });

    test('1.5 Should reject non-existent branch code', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'XXX' })
        .expect(404);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body.message).toContain('not found');
    });

    test('1.6 Should reject missing branch code', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });
  });

  // ============================================================================
  // TEST SUITE 2: Login Flow with Branch Code
  // ============================================================================
  describe('2. Login Flow with Branch Code', () => {
    test('2.1 Should login admin with valid branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'TST',
          userType: 'admin'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testUsers.admin.username);

      // Store token for later tests
      authTokens.admin = response.body.token;
    });

    test('2.2 Should login staff with valid branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.staff.username,
          password: testUsers.staff.password,
          branchCode: 'TST',
          userType: 'staff'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      authTokens.staff = response.body.token;
    });

    test('2.3 Should login student with valid branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.student.username,
          password: testUsers.student.password,
          branchCode: 'TST',
          userType: 'student'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      authTokens.student = response.body.token;
    });

    test('2.4 Should login guardian with valid branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.guardian.username,
          password: testUsers.guardian.password,
          branchCode: 'TST',
          userType: 'guardian'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      authTokens.guardian = response.body.token;
    });

    test('2.5 Should reject login with invalid branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'XXX',
          userType: 'admin'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Branch code');
    });

    test('2.6 Should reject login with missing branch code', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          userType: 'admin'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('2.7 Should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: 'wrong_password',
          branchCode: 'TST',
          userType: 'admin'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // TEST SUITE 3: JWT Token with Branch Context
  // ============================================================================
  describe('3. JWT Token with Branch Context', () => {
    test('3.1 Should include branch code in JWT token', () => {
      const decoded = jwt.verify(authTokens.admin, process.env.JWT_SECRET);
      
      expect(decoded).toHaveProperty('branchCode', 'TST');
      expect(decoded).toHaveProperty('databaseName', 'skoolific_test_branch');
      expect(decoded).toHaveProperty('username', testUsers.admin.username);
      expect(decoded).toHaveProperty('userType', 'admin');
    });

    test('3.2 Should have valid token expiration', () => {
      const decoded = jwt.verify(authTokens.admin, process.env.JWT_SECRET);
      
      expect(decoded).toHaveProperty('iat'); // Issued at
      expect(decoded).toHaveProperty('exp'); // Expiration
      
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now); // Token should not be expired
    });

    test('3.3 Should reject invalid JWT signature', () => {
      const invalidToken = authTokens.admin + 'invalid';
      
      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET);
      }).toThrow();
    });

    test('3.4 Should reject expired JWT token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        {
          username: testUsers.admin.username,
          userType: 'admin',
          branchCode: 'TST',
          databaseName: 'skoolific_test_branch'
        },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET);
      }).toThrow();
    });
  });

  // ============================================================================
  // TEST SUITE 4: Protected Routes with Branch Validation
  // ============================================================================
  describe('4. Protected Routes with Branch Validation', () => {
    test('4.1 Should access protected route with valid token', async () => {
      // This test assumes you have a protected route like /api/v2/profile
      // Adjust the endpoint based on your actual routes
      const response = await request(app)
        .get('/api/v2/profile')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('4.2 Should reject access without token', async () => {
      const response = await request(app)
        .get('/api/v2/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('4.3 Should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/v2/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('4.4 Should reject access with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          username: testUsers.admin.username,
          userType: 'admin',
          branchCode: 'TST',
          databaseName: 'skoolific_test_branch'
        },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/v2/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============================================================================
  // TEST SUITE 5: Branch Switching
  // ============================================================================
  describe('5. Branch Switching', () => {
    test('5.1 Should login to different branch with same user', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'DEV',
          userType: 'admin'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.branchCode).toBe('DEV');
      expect(decoded.databaseName).toBe('skoolific_dev_branch');
    });

    test('5.2 Should maintain branch isolation', async () => {
      // Login to TST branch
      const tstResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'TST',
          userType: 'admin'
        })
        .expect(200);

      const tstToken = tstResponse.body.token;
      const tstDecoded = jwt.verify(tstToken, process.env.JWT_SECRET);

      // Login to DEV branch
      const devResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'DEV',
          userType: 'admin'
        })
        .expect(200);

      const devToken = devResponse.body.token;
      const devDecoded = jwt.verify(devToken, process.env.JWT_SECRET);

      // Verify tokens have different branch contexts
      expect(tstDecoded.branchCode).not.toBe(devDecoded.branchCode);
      expect(tstDecoded.databaseName).not.toBe(devDecoded.databaseName);
    });
  });

  // ============================================================================
  // TEST SUITE 6: Error Handling
  // ============================================================================
  describe('6. Error Handling', () => {
    test('6.1 Should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test with an invalid branch code
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'XXX',
          userType: 'admin'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('6.2 Should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          // Missing required fields
          username: testUsers.admin.username
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('6.3 Should handle SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: "TST'; DROP TABLE branch_config; --" })
        .expect(400);

      expect(response.body).toHaveProperty('valid', false);
    });

    test('6.4 Should handle concurrent login requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v2/auth/login')
          .send({
            username: testUsers.admin.username,
            password: testUsers.admin.password,
            branchCode: 'TST',
            userType: 'admin'
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
    });
  });

  // ============================================================================
  // TEST SUITE 7: Performance Tests
  // ============================================================================
  describe('7. Performance Tests', () => {
    test('7.1 Should validate branch code within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v2/branches/validate')
        .send({ branchCode: 'TST' })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('7.2 Should login within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v2/auth/login')
        .send({
          username: testUsers.admin.username,
          password: testUsers.admin.password,
          branchCode: 'TST',
          userType: 'admin'
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('7.3 Should handle multiple concurrent validations', async () => {
      const startTime = Date.now();
      
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v2/branches/validate')
          .send({ branchCode: 'TST' })
      );

      await Promise.all(requests);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});

// Export for use in other test files
module.exports = {
  testBranches,
  testUsers,
  authTokens
};
