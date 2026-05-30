/**
 * Dashboard Load Test
 * 
 * Tests dashboard performance with 100 concurrent users
 * Simulates typical admin dashboard usage patterns
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, getAuthHeaders } from '../config/test-config.js';
import { loginAsAdmin } from '../utils/auth-helper.js';

// Custom metrics
const dashboardLoadTime = new Trend('dashboard_load_time');
const dashboardErrorRate = new Rate('dashboard_errors');

// Test configuration
export const options = {
  scenarios: {
    dashboard_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'dashboard_load_time': ['p(95)<2000'],
    'dashboard_errors': ['rate<0.01'],
  },
};

// Setup function - runs once before test
export function setup() {
  console.log('Setting up dashboard load test...');
  const token = loginAsAdmin();
  
  if (!token) {
    throw new Error('Failed to authenticate admin user');
  }
  
  return { token };
}

// Main test function
export default function(data) {
  const headers = getAuthHeaders(data.token);
  const params = {
    headers: headers,
    tags: { type: 'dashboard' }
  };

  // 1. Load dashboard stats
  const statsResponse = http.get(
    `${config.baseURL}/api/dashboard/stats`,
    params
  );

  const statsCheck = check(statsResponse, {
    'dashboard stats loaded': (r) => r.status === 200,
    'stats response time OK': (r) => r.timings.duration < 500,
  });

  dashboardLoadTime.add(statsResponse.timings.duration);
  dashboardErrorRate.add(!statsCheck);

  // 2. Load student enrollment data
  const enrollmentResponse = http.get(
    `${config.baseURL}/api/dashboard/enrollment`,
    params
  );

  check(enrollmentResponse, {
    'enrollment data loaded': (r) => r.status === 200,
  });

  // 3. Load attendance summary
  const attendanceResponse = http.get(
    `${config.baseURL}/api/dashboard/attendance-summary`,
    params
  );

  check(attendanceResponse, {
    'attendance summary loaded': (r) => r.status === 200,
  });

  // 4. Load financial summary
  const financeResponse = http.get(
    `${config.baseURL}/api/dashboard/finance-summary`,
    params
  );

  check(financeResponse, {
    'finance summary loaded': (r) => r.status === 200,
  });

  // 5. Load recent activities
  const activitiesResponse = http.get(
    `${config.baseURL}/api/dashboard/recent-activities`,
    params
  );

  check(activitiesResponse, {
    'recent activities loaded': (r) => r.status === 200,
  });

  // Simulate user reading dashboard (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('Dashboard load test completed');
}
