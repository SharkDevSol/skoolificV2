/**
 * Exam Taking Load Test
 * 
 * Tests exam taking performance with 500 concurrent students
 * Simulates students taking exams simultaneously
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getAuthHeaders } from '../config/test-config.js';
import { loginAsStudent } from '../utils/auth-helper.js';

// Custom metrics
const examLoadTime = new Trend('exam_load_time');
const answerSubmitTime = new Trend('answer_submit_time');
const examErrors = new Rate('exam_errors');
const answersSubmitted = new Counter('answers_submitted');

// Test configuration
export const options = {
  scenarios: {
    exam_taking_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'exam_load_time': ['p(95)<1000'],
    'answer_submit_time': ['p(95)<300'],
    'exam_errors': ['rate<0.01'],
  },
};

// Setup function
export function setup() {
  console.log('Setting up exam taking load test...');
  const token = loginAsStudent();
  
  if (!token) {
    throw new Error('Failed to authenticate student user');
  }
  
  return { token };
}

// Main test function
export default function(data) {
  const headers = getAuthHeaders(data.token);
  const params = {
    headers: headers,
    tags: { type: 'exam_taking' }
  };

  // 1. Get available exams
  const examsResponse = http.get(
    `${config.baseURL}/api/exams/available`,
    params
  );

  const examsCheck = check(examsResponse, {
    'exams loaded': (r) => r.status === 200,
    'exams load time OK': (r) => r.timings.duration < 1000,
  });

  examLoadTime.add(examsResponse.timings.duration);

  if (!examsCheck) {
    examErrors.add(1);
    sleep(1);
    return;
  }

  const exams = examsResponse.json('exams') || [];
  
  if (exams.length === 0) {
    sleep(1);
    return;
  }

  const randomExam = exams[Math.floor(Math.random() * exams.length)];

  // 2. Start exam
  const startPayload = JSON.stringify({
    examId: randomExam.id
  });

  const startResponse = http.post(
    `${config.baseURL}/api/exams/start`,
    startPayload,
    params
  );

  const startCheck = check(startResponse, {
    'exam started': (r) => r.status === 200,
  });

  if (!startCheck) {
    examErrors.add(1);
    sleep(1);
    return;
  }

  const examData = startResponse.json();
  const questions = examData.questions || [];

  // 3. Answer questions (simulate answering 5-10 questions)
  const numAnswers = Math.min(
    Math.floor(Math.random() * 6) + 5,
    questions.length
  );

  for (let i = 0; i < numAnswers; i++) {
    const question = questions[i];
    
    // Generate random answer based on question type
    let answer;
    switch (question.type) {
      case 'multiple_choice':
        answer = question.options[Math.floor(Math.random() * question.options.length)];
        break;
      case 'true_false':
        answer = Math.random() > 0.5 ? 'True' : 'False';
        break;
      case 'numeric':
        answer = Math.floor(Math.random() * 100).toString();
        break;
      case 'fill_blank':
        answer = 'test answer';
        break;
      default:
        answer = 'Sample answer for testing';
    }

    const answerPayload = JSON.stringify({
      examId: randomExam.id,
      questionId: question.id,
      answer: answer
    });

    const answerResponse = http.post(
      `${config.baseURL}/api/exams/answer`,
      answerPayload,
      params
    );

    const answerCheck = check(answerResponse, {
      'answer submitted': (r) => r.status === 200,
      'answer submit time OK': (r) => r.timings.duration < 300,
    });

    answerSubmitTime.add(answerResponse.timings.duration);

    if (answerCheck) {
      answersSubmitted.add(1);
    } else {
      examErrors.add(1);
    }

    // Simulate time to read and answer question (5-15 seconds)
    sleep(Math.random() * 10 + 5);
  }

  // 4. Submit exam
  const submitPayload = JSON.stringify({
    examId: randomExam.id
  });

  const submitResponse = http.post(
    `${config.baseURL}/api/exams/submit`,
    submitPayload,
    params
  );

  check(submitResponse, {
    'exam submitted': (r) => r.status === 200,
  });

  // 5. View results
  const resultsResponse = http.get(
    `${config.baseURL}/api/exams/results?examId=${randomExam.id}`,
    params
  );

  check(resultsResponse, {
    'results loaded': (r) => r.status === 200,
  });

  // Simulate student reviewing results (2-5 seconds)
  sleep(Math.random() * 3 + 2);
}

// Teardown function
export function teardown(data) {
  console.log('Exam taking load test completed');
}
