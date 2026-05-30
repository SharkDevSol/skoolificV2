/**
 * Mark Entry Load Test
 * 
 * Tests mark entry performance with 50 concurrent teachers
 * Simulates teachers entering marks for students
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getAuthHeaders } from '../config/test-config.js';
import { loginAsTeacher } from '../utils/auth-helper.js';

// Custom metrics
const markEntryTime = new Trend('mark_entry_time');
const markEntryErrors = new Rate('mark_entry_errors');
const marksEntered = new Counter('marks_entered');

// Test configuration
export const options = {
  scenarios: {
    mark_entry_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'mark_entry_time': ['p(95)<800'],
    'mark_entry_errors': ['rate<0.01'],
  },
};

// Setup function
export function setup() {
  console.log('Setting up mark entry load test...');
  const token = loginAsTeacher();
  
  if (!token) {
    throw new Error('Failed to authenticate teacher user');
  }
  
  return { token };
}

// Main test function
export default function(data) {
  const headers = getAuthHeaders(data.token);
  const params = {
    headers: headers,
    tags: { type: 'mark_entry' }
  };

  // 1. Get mark list forms
  const formsResponse = http.get(
    `${config.baseURL}/api/marks/forms`,
    params
  );

  const formsCheck = check(formsResponse, {
    'mark forms loaded': (r) => r.status === 200,
    'forms have data': (r) => r.json('forms') && r.json('forms').length > 0,
  });

  if (!formsCheck) {
    markEntryErrors.add(1);
    sleep(1);
    return;
  }

  const forms = formsResponse.json('forms');
  const randomForm = forms[Math.floor(Math.random() * forms.length)];

  // 2. Get students for the selected form
  const studentsResponse = http.get(
    `${config.baseURL}/api/marks/students?formId=${randomForm.id}`,
    params
  );

  check(studentsResponse, {
    'students loaded': (r) => r.status === 200,
  });

  const students = studentsResponse.json('students') || [];

  // 3. Enter marks for random students (simulate entering 3-5 marks)
  const numMarks = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < Math.min(numMarks, students.length); i++) {
    const student = students[Math.floor(Math.random() * students.length)];
    
    const markPayload = JSON.stringify({
      studentId: student.id,
      formId: randomForm.id,
      mark: Math.floor(Math.random() * 100),
      term: randomForm.term,
      component: randomForm.component
    });

    const markResponse = http.post(
      `${config.baseURL}/api/marks/enter`,
      markPayload,
      params
    );

    const markCheck = check(markResponse, {
      'mark entered successfully': (r) => r.status === 200 || r.status === 201,
      'mark entry time OK': (r) => r.timings.duration < 500,
    });

    markEntryTime.add(markResponse.timings.duration);
    
    if (markCheck) {
      marksEntered.add(1);
    } else {
      markEntryErrors.add(1);
    }

    // Small delay between mark entries (0.5-1.5 seconds)
    sleep(Math.random() + 0.5);
  }

  // 4. View entered marks
  const viewMarksResponse = http.get(
    `${config.baseURL}/api/marks/view?formId=${randomForm.id}`,
    params
  );

  check(viewMarksResponse, {
    'marks viewed successfully': (r) => r.status === 200,
  });

  // Simulate teacher reviewing marks (2-4 seconds)
  sleep(Math.random() * 2 + 2);
}

// Teardown function
export function teardown(data) {
  console.log('Mark entry load test completed');
}
