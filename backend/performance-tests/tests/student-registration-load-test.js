/**
 * Student Registration Load Test
 * 
 * Tests bulk student registration performance
 * Simulates registering 1000 students
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getAuthHeaders } from '../config/test-config.js';
import { loginAsAdmin } from '../utils/auth-helper.js';

// Custom metrics
const registrationTime = new Trend('registration_time');
const registrationErrors = new Rate('registration_errors');
const studentsRegistered = new Counter('students_registered');

// Test configuration
export const options = {
  scenarios: {
    bulk_registration: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 1000,
      maxDuration: '10m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'registration_time': ['p(95)<800'],
    'registration_errors': ['rate<0.01'],
  },
};

// Setup function
export function setup() {
  console.log('Setting up student registration load test...');
  const token = loginAsAdmin();
  
  if (!token) {
    throw new Error('Failed to authenticate admin user');
  }
  
  // Get available classes
  const headers = getAuthHeaders(token);
  const classesResponse = http.get(
    `${config.baseURL}/api/classes`,
    { headers: headers }
  );
  
  const classes = classesResponse.json('classes') || [];
  
  return { token, classes };
}

// Generate random student data
function generateStudentData(iteration, classes) {
  const randomClass = classes[Math.floor(Math.random() * classes.length)];
  
  return {
    firstName: `TestStudent${iteration}`,
    middleName: `Middle${iteration}`,
    lastName: `Last${iteration}`,
    gender: Math.random() > 0.5 ? 'Male' : 'Female',
    dateOfBirth: '2010-01-01',
    classId: randomClass.id,
    phoneNumber: `+251${Math.floor(Math.random() * 900000000 + 100000000)}`,
    guardianName: `Guardian${iteration}`,
    guardianPhone: `+251${Math.floor(Math.random() * 900000000 + 100000000)}`,
    address: `Test Address ${iteration}`,
    emergencyContact: `+251${Math.floor(Math.random() * 900000000 + 100000000)}`,
    medicalInfo: 'None',
    previousSchool: 'Test School',
    admissionDate: new Date().toISOString().split('T')[0]
  };
}

// Main test function
export default function(data) {
  const headers = getAuthHeaders(data.token);
  const params = {
    headers: headers,
    tags: { type: 'student_registration' }
  };

  // Generate student data
  const studentData = generateStudentData(__ITER, data.classes);
  const payload = JSON.stringify(studentData);

  // Register student
  const response = http.post(
    `${config.baseURL}/api/students/register`,
    payload,
    params
  );

  const registrationCheck = check(response, {
    'student registered': (r) => r.status === 200 || r.status === 201,
    'registration time OK': (r) => r.timings.duration < 800,
    'student ID returned': (r) => r.json('studentId') !== undefined,
  });

  registrationTime.add(response.timings.duration);

  if (registrationCheck) {
    studentsRegistered.add(1);
  } else {
    registrationErrors.add(1);
    console.error(`Registration failed for iteration ${__ITER}: ${response.status} - ${response.body}`);
  }

  // Small delay between registrations (0.1-0.5 seconds)
  sleep(Math.random() * 0.4 + 0.1);
}

// Teardown function
export function teardown(data) {
  console.log('Student registration load test completed');
  console.log(`Total students registered: ${studentsRegistered.value}`);
}
