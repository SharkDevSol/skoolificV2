/**
 * Sample k6 Performance Test
 * 
 * A simple test to verify k6 setup and demonstrate basic usage
 * Tests the health check endpoint with light load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config } from '../config/test-config.js';

// Custom metrics
const healthCheckTime = new Trend('health_check_time');
const healthCheckErrors = new Rate('health_check_errors');

// Test configuration
export const options = {
  // Run with 10 virtual users for 30 seconds
  vus: 10,
  duration: '30s',
  
  thresholds: {
    // 95% of requests should complete within 200ms
    'http_req_duration': ['p(95)<200'],
    // Error rate should be 0%
    'http_req_failed': ['rate<0.01'],
    // Custom metric thresholds
    'health_check_time': ['p(95)<200'],
    'health_check_errors': ['rate<0.01'],
  },
};

// Main test function - runs for each virtual user
export default function() {
  // Make request to health check endpoint
  const response = http.get(`${config.baseURL}/api/health`, {
    tags: { type: 'health_check' }
  });

  // Check response
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has status field': (r) => r.json('status') !== undefined,
  });

  // Record custom metrics
  healthCheckTime.add(response.timings.duration);
  healthCheckErrors.add(!checkResult);

  // Simulate user think time (1 second)
  sleep(1);
}

// Setup function - runs once before test starts
export function setup() {
  console.log('Starting sample performance test...');
  console.log(`Testing endpoint: ${config.baseURL}/api/health`);
}

// Teardown function - runs once after test completes
export function teardown(data) {
  console.log('Sample performance test completed');
}
