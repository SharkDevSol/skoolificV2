/**
 * Authentication Helper for k6 Performance Tests
 * 
 * Provides utility functions for authentication in performance tests
 */

import http from 'k6/http';
import { check } from 'k6';
import { config } from '../config/test-config.js';

/**
 * Login and get authentication token
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} branchCode - Branch code
 * @returns {string|null} - JWT token or null if login failed
 */
export function login(username, password, branchCode) {
  const loginPayload = JSON.stringify({
    username: username,
    password: password,
    branchCode: branchCode
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'auth' }
  };

  const response = http.post(
    `${config.baseURL}/api/v2/auth/login`,
    loginPayload,
    params
  );

  const loginSuccess = check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined
  });

  if (loginSuccess) {
    return response.json('token');
  }

  console.error(`Login failed for ${username}: ${response.status} - ${response.body}`);
  return null;
}

/**
 * Login as admin user
 * @returns {string|null} - JWT token or null if login failed
 */
export function loginAsAdmin() {
  const { username, password, branchCode } = config.testUsers.admin;
  return login(username, password, branchCode);
}

/**
 * Login as teacher user
 * @returns {string|null} - JWT token or null if login failed
 */
export function loginAsTeacher() {
  const { username, password, branchCode } = config.testUsers.teacher;
  return login(username, password, branchCode);
}

/**
 * Login as student user
 * @returns {string|null} - JWT token or null if login failed
 */
export function loginAsStudent() {
  const { username, password, branchCode } = config.testUsers.student;
  return login(username, password, branchCode);
}

/**
 * Validate branch code
 * @param {string} branchCode - Branch code to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateBranchCode(branchCode) {
  const payload = JSON.stringify({ branchCode: branchCode });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'auth' }
  };

  const response = http.post(
    `${config.baseURL}/api/v2/auth/validate-branch`,
    payload,
    params
  );

  return check(response, {
    'branch code valid': (r) => r.status === 200
  });
}
