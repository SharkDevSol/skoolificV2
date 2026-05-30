/**
 * k6 Performance Test Configuration
 * 
 * This file contains configuration for all performance tests
 * including base URLs, thresholds, and test scenarios.
 */

// Base configuration
export const config = {
  // API Base URL - update this based on your environment
  baseURL: __ENV.BASE_URL || 'http://localhost:5000',
  
  // Test user credentials
  testUsers: {
    admin: {
      username: __ENV.ADMIN_USERNAME || 'admin',
      password: __ENV.ADMIN_PASSWORD || 'admin123',
      branchCode: __ENV.BRANCH_CODE || 'AAS'
    },
    teacher: {
      username: __ENV.TEACHER_USERNAME || 'teacher1',
      password: __ENV.TEACHER_PASSWORD || 'teacher123',
      branchCode: __ENV.BRANCH_CODE || 'AAS'
    },
    student: {
      username: __ENV.STUDENT_USERNAME || 'student1',
      password: __ENV.STUDENT_PASSWORD || 'student123',
      branchCode: __ENV.BRANCH_CODE || 'AAS'
    }
  },
  
  // Performance thresholds
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500'],
    // 99% of requests should complete within 1000ms
    'http_req_duration{type:api}': ['p(99)<1000'],
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],
    // Request rate should be at least 100 requests per second
    http_reqs: ['rate>100']
  },
  
  // Load test scenarios
  scenarios: {
    // Light load - 10 concurrent users
    light: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m'
    },
    
    // Medium load - 50 concurrent users
    medium: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m'
    },
    
    // Heavy load - 100 concurrent users
    heavy: {
      executor: 'constant-vus',
      vus: 100,
      duration: '3m'
    },
    
    // Stress test - ramp up to 500 users
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '2m', target: 0 }
      ]
    },
    
    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 10 },
        { duration: '30s', target: 10 }
      ]
    }
  }
};

// Helper function to get scenario by name
export function getScenario(name) {
  return config.scenarios[name] || config.scenarios.light;
}

// Helper function to get auth headers
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
