/**
 * Integration Test Setup
 * 
 * Sets up the test environment for integration tests including:
 * - Test database connection
 * - Test data seeding
 * - API server setup
 * - Cleanup utilities
 */

const { Pool } = require('pg');
const axios = require('axios');

// Test database configuration
// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || process.env.DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'skoolific',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres'
};

// Test API base URL
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

// Global test pool
let testPool;

/**
 * Initialize test database connection
 */
async function initTestDatabase() {
  testPool = new Pool(TEST_DB_CONFIG);
  
  try {
    await testPool.query('SELECT NOW()');
    console.log('[Integration Test] Database connection established');
  } catch (error) {
    console.error('[Integration Test] Database connection failed:', error.message);
    throw error;
  }
  
  return testPool;
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase() {
  if (!testPool) return;
  
  try {
    // Delete test data in reverse order of dependencies
    await testPool.query('DELETE FROM student_exams WHERE student_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM marks WHERE student_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM attendance WHERE student_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM students WHERE school_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM staff WHERE global_staff_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM guardians WHERE guardian_username LIKE \'test_%\'');
    await testPool.query('DELETE FROM payments WHERE student_id LIKE \'TEST_%\'');
    await testPool.query('DELETE FROM notifications WHERE user_id LIKE \'TEST_%\'');
    
    console.log('[Integration Test] Test data cleaned up');
  } catch (error) {
    console.error('[Integration Test] Cleanup failed:', error.message);
  }
}

/**
 * Close test database connection
 */
async function closeTestDatabase() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    console.log('[Integration Test] Database connection closed');
  }
}

/**
 * Create test student
 */
async function createTestStudent(data = {}) {
  const defaultData = {
    school_id: `TEST_${Date.now()}`,
    student_name: 'Test Student',
    class: 'Grade 10',
    age: 16,
    gender: 'Male',
    guardian_name: 'Test Guardian',
    guardian_phone: '+251911000000',
    guardian_relation: 'Father',
    username: `test_student_${Date.now()}`,
    password: 'test123'
  };
  
  const studentData = { ...defaultData, ...data };
  
  const query = `
    INSERT INTO students (
      school_id, student_name, class, age, gender,
      guardian_name, guardian_phone, guardian_relation,
      username, password
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  
  const values = [
    studentData.school_id,
    studentData.student_name,
    studentData.class,
    studentData.age,
    studentData.gender,
    studentData.guardian_name,
    studentData.guardian_phone,
    studentData.guardian_relation,
    studentData.username,
    studentData.password
  ];
  
  const result = await testPool.query(query, values);
  return result.rows[0];
}

/**
 * Create test staff member
 */
async function createTestStaff(data = {}) {
  const defaultData = {
    global_staff_id: `TEST_STAFF_${Date.now()}`,
    name: 'Test Teacher',
    staff_type: 'Teacher',
    phone: '+251911000001',
    username: `test_staff_${Date.now()}`,
    password: 'test123'
  };
  
  const staffData = { ...defaultData, ...data };
  
  const query = `
    INSERT INTO staff (
      global_staff_id, name, staff_type, phone, username, password
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    staffData.global_staff_id,
    staffData.name,
    staffData.staff_type,
    staffData.phone,
    staffData.username,
    staffData.password
  ];
  
  const result = await testPool.query(query, values);
  return result.rows[0];
}

/**
 * Create test guardian
 */
async function createTestGuardian(data = {}) {
  const defaultData = {
    guardian_username: `test_guardian_${Date.now()}`,
    guardian_name: 'Test Guardian',
    guardian_phone: '+251911000002',
    guardian_password: 'test123'
  };
  
  const guardianData = { ...defaultData, ...data };
  
  const query = `
    INSERT INTO guardians (
      guardian_username, guardian_name, guardian_phone, guardian_password
    ) VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values = [
    guardianData.guardian_username,
    guardianData.guardian_name,
    guardianData.guardian_phone,
    guardianData.guardian_password
  ];
  
  const result = await testPool.query(query, values);
  return result.rows[0];
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(method, endpoint, data = {}, token = null) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {}
  };
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (method === 'GET') {
    config.params = data;
  } else {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Login and get auth token
 */
async function loginAndGetToken(username, password, userType = 'student') {
  const endpoint = `/auth/${userType}-login`;
  const response = await makeAuthenticatedRequest('POST', endpoint, {
    username,
    password
  });
  
  return response.token;
}

/**
 * Wait for async operation
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique test ID
 */
function generateTestId(prefix = 'TEST') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export utilities
module.exports = {
  TEST_DB_CONFIG,
  API_BASE_URL,
  initTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  createTestStudent,
  createTestStaff,
  createTestGuardian,
  makeAuthenticatedRequest,
  loginAndGetToken,
  wait,
  generateTestId,
  getTestPool: () => testPool
};
