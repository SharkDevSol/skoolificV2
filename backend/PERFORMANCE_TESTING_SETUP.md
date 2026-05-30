# Performance Testing Setup - Skoolific V2

This document provides comprehensive instructions for setting up and running performance tests for the Skoolific V2 backend APIs using k6.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Directory Structure](#directory-structure)
4. [Configuration](#configuration)
5. [Running Tests](#running-tests)
6. [Test Scenarios](#test-scenarios)
7. [Interpreting Results](#interpreting-results)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

k6 is a modern, developer-friendly load testing tool built for testing the performance of APIs, microservices, and websites. It's written in Go and uses JavaScript (ES6) for test scripts.

### Why k6?

- **Developer-friendly**: Write tests in JavaScript
- **Performance**: Built in Go for high performance
- **Modern**: Supports HTTP/2, WebSockets, and gRPC
- **CI/CD Integration**: Easy to integrate into CI/CD pipelines
- **Rich Metrics**: Detailed performance metrics and custom metrics support
- **Cloud Support**: Can run tests locally or in the cloud

### Performance Goals

- **API Response Time**: 95th percentile < 500ms
- **Page Load Time**: < 2 seconds
- **Error Rate**: < 1%
- **Concurrent Users**: Support 100-500 concurrent users
- **Throughput**: > 100 requests per second

---

## Installation

### Windows

1. **Using Chocolatey** (Recommended):
   ```powershell
   choco install k6
   ```

2. **Using MSI Installer**:
   - Download the latest MSI installer from [k6 releases](https://github.com/grafana/k6/releases)
   - Run the installer
   - Add k6 to your PATH

3. **Using Winget**:
   ```powershell
   winget install k6 --source winget
   ```

### Linux

1. **Debian/Ubuntu**:
   ```bash
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Fedora/CentOS**:
   ```bash
   sudo dnf install https://dl.k6.io/rpm/repo.rpm
   sudo dnf install k6
   ```

### macOS

```bash
brew install k6
```

### Verify Installation

```bash
k6 version
```

You should see output like: `k6 v0.48.0 (2024-01-15T12:00:00+0000/v0.48.0-0-gabcdef12, go1.21.5, darwin/amd64)`

---

## Directory Structure

```
backend/
├── performance-tests/
│   ├── config/
│   │   └── test-config.js          # Central configuration file
│   ├── utils/
│   │   └── auth-helper.js          # Authentication utilities
│   ├── tests/
│   │   ├── sample-test.js          # Simple sample test
│   │   ├── dashboard-load-test.js  # Dashboard load test (100 users)
│   │   ├── mark-entry-load-test.js # Mark entry test (50 teachers)
│   │   ├── exam-taking-load-test.js # Exam taking test (500 students)
│   │   └── student-registration-load-test.js # Bulk registration (1000 students)
│   └── results/                    # Test results (generated)
└── PERFORMANCE_TESTING_SETUP.md    # This file
```

---

## Configuration

### Environment Variables

Create a `.env.performance` file in the `backend` directory:

```env
# API Configuration
BASE_URL=http://localhost:5000
BRANCH_CODE=AAS

# Test User Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

TEACHER_USERNAME=teacher1
TEACHER_PASSWORD=teacher123

STUDENT_USERNAME=student1
STUDENT_PASSWORD=student123
```

### Test Configuration

Edit `performance-tests/config/test-config.js` to customize:

- **Base URL**: API endpoint
- **Test Users**: Credentials for different user types
- **Thresholds**: Performance thresholds
- **Scenarios**: Load test scenarios (light, medium, heavy, stress, spike)

---

## Running Tests

### Basic Usage

```bash
# Run a simple test
k6 run backend/performance-tests/tests/sample-test.js

# Run with environment variables
k6 run --env BASE_URL=http://localhost:5000 backend/performance-tests/tests/sample-test.js

# Run with custom VUs and duration
k6 run --vus 50 --duration 2m backend/performance-tests/tests/sample-test.js
```

### Running Specific Tests

1. **Sample Test** (Health Check):
   ```bash
   k6 run backend/performance-tests/tests/sample-test.js
   ```

2. **Dashboard Load Test** (100 concurrent users):
   ```bash
   k6 run backend/performance-tests/tests/dashboard-load-test.js
   ```

3. **Mark Entry Load Test** (50 concurrent teachers):
   ```bash
   k6 run backend/performance-tests/tests/mark-entry-load-test.js
   ```

4. **Exam Taking Load Test** (500 concurrent students):
   ```bash
   k6 run backend/performance-tests/tests/exam-taking-load-test.js
   ```

5. **Student Registration Load Test** (1000 students):
   ```bash
   k6 run backend/performance-tests/tests/student-registration-load-test.js
   ```

### Advanced Options

```bash
# Run with custom scenario
k6 run --stage 1m:10,2m:50,1m:0 backend/performance-tests/tests/dashboard-load-test.js

# Output results to JSON
k6 run --out json=results.json backend/performance-tests/tests/sample-test.js

# Output results to CSV
k6 run --out csv=results.csv backend/performance-tests/tests/sample-test.js

# Run with summary export
k6 run --summary-export=summary.json backend/performance-tests/tests/sample-test.js

# Run with custom tags
k6 run --tag testid=test001 --tag environment=staging backend/performance-tests/tests/sample-test.js

# Run with increased HTTP debug output
k6 run --http-debug backend/performance-tests/tests/sample-test.js
```

### Running All Tests

Create a script to run all tests sequentially:

**Windows (PowerShell)**:
```powershell
# run-all-tests.ps1
Write-Host "Running all performance tests..." -ForegroundColor Green

Write-Host "`n1. Running Sample Test..." -ForegroundColor Yellow
k6 run backend/performance-tests/tests/sample-test.js

Write-Host "`n2. Running Dashboard Load Test..." -ForegroundColor Yellow
k6 run backend/performance-tests/tests/dashboard-load-test.js

Write-Host "`n3. Running Mark Entry Load Test..." -ForegroundColor Yellow
k6 run backend/performance-tests/tests/mark-entry-load-test.js

Write-Host "`n4. Running Exam Taking Load Test..." -ForegroundColor Yellow
k6 run backend/performance-tests/tests/exam-taking-load-test.js

Write-Host "`n5. Running Student Registration Load Test..." -ForegroundColor Yellow
k6 run backend/performance-tests/tests/student-registration-load-test.js

Write-Host "`nAll tests completed!" -ForegroundColor Green
```

**Linux/macOS (Bash)**:
```bash
#!/bin/bash
# run-all-tests.sh

echo "Running all performance tests..."

echo -e "\n1. Running Sample Test..."
k6 run backend/performance-tests/tests/sample-test.js

echo -e "\n2. Running Dashboard Load Test..."
k6 run backend/performance-tests/tests/dashboard-load-test.js

echo -e "\n3. Running Mark Entry Load Test..."
k6 run backend/performance-tests/tests/mark-entry-load-test.js

echo -e "\n4. Running Exam Taking Load Test..."
k6 run backend/performance-tests/tests/exam-taking-load-test.js

echo -e "\n5. Running Student Registration Load Test..."
k6 run backend/performance-tests/tests/student-registration-load-test.js

echo -e "\nAll tests completed!"
```

---

## Test Scenarios

### 1. Sample Test (Health Check)

**Purpose**: Verify k6 setup and basic API connectivity

**Configuration**:
- Virtual Users: 10
- Duration: 30 seconds
- Target: Health check endpoint

**Expected Results**:
- Response time: < 200ms (95th percentile)
- Error rate: < 1%

### 2. Dashboard Load Test

**Purpose**: Test dashboard performance under typical load

**Configuration**:
- Virtual Users: 100
- Duration: 3 minutes
- Endpoints: Dashboard stats, enrollment, attendance, finance, activities

**Expected Results**:
- Response time: < 500ms (95th percentile)
- Page load time: < 2 seconds
- Error rate: < 1%

### 3. Mark Entry Load Test

**Purpose**: Test mark entry system with concurrent teachers

**Configuration**:
- Virtual Users: 50 (teachers)
- Duration: 5 minutes
- Operations: Load forms, load students, enter marks, view marks

**Expected Results**:
- Response time: < 500ms (95th percentile)
- Mark entry time: < 800ms (95th percentile)
- Error rate: < 1%

### 4. Exam Taking Load Test

**Purpose**: Test exam system with high concurrent student load

**Configuration**:
- Virtual Users: Ramp up to 500 students
- Duration: 9 minutes
- Operations: Load exams, start exam, answer questions, submit exam, view results

**Stages**:
1. Ramp up to 100 users (1 minute)
2. Ramp up to 300 users (2 minutes)
3. Ramp up to 500 users (2 minutes)
4. Hold at 500 users (3 minutes)
5. Ramp down to 0 (1 minute)

**Expected Results**:
- Response time: < 500ms (95th percentile)
- Exam load time: < 1000ms (95th percentile)
- Answer submit time: < 300ms (95th percentile)
- Error rate: < 1%

### 5. Student Registration Load Test

**Purpose**: Test bulk student registration performance

**Configuration**:
- Total Registrations: 1000 students
- Virtual Users: 10 (concurrent registrations)
- Max Duration: 10 minutes

**Expected Results**:
- Response time: < 500ms (95th percentile)
- Registration time: < 800ms (95th percentile)
- Error rate: < 1%
- Throughput: > 100 registrations per minute

---

## Interpreting Results

### Console Output

k6 provides real-time output during test execution:

```
     ✓ status is 200
     ✓ response time < 200ms

     checks.........................: 100.00% ✓ 1000      ✗ 0
     data_received..................: 1.2 MB  40 kB/s
     data_sent......................: 100 kB  3.3 kB/s
     http_req_blocked...............: avg=1.2ms    min=0s       med=0s       max=120ms    p(90)=0s       p(95)=0s
     http_req_connecting............: avg=1.1ms    min=0s       med=0s       max=110ms    p(90)=0s       p(95)=0s
     http_req_duration..............: avg=45ms     min=20ms     med=40ms     max=200ms    p(90)=80ms     p(95)=100ms
       { expected_response:true }...: avg=45ms     min=20ms     med=40ms     max=200ms    p(90)=80ms     p(95)=100ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 1000
     http_req_receiving.............: avg=0.5ms    min=0s       med=0s       max=10ms     p(90)=1ms      p(95)=2ms
     http_req_sending...............: avg=0.1ms    min=0s       med=0s       max=5ms      p(90)=0s       p(95)=1ms
     http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
     http_req_waiting...............: avg=44.4ms   min=19ms     med=39ms     max=195ms    p(90)=79ms     p(95)=99ms
     http_reqs......................: 1000    33.33/s
     iteration_duration.............: avg=1.05s    min=1.02s    med=1.04s    max=1.2s     p(90)=1.08s    p(95)=1.1s
     iterations.....................: 1000    33.33/s
     vus............................: 10      min=10      max=10
     vus_max........................: 10      min=10      max=10
```

### Key Metrics

1. **checks**: Percentage of successful checks
   - ✓ = passed checks
   - ✗ = failed checks
   - Target: 100% or close to it

2. **http_req_duration**: Total request duration
   - avg: Average response time
   - p(95): 95th percentile (95% of requests faster than this)
   - p(99): 99th percentile
   - Target: p(95) < 500ms

3. **http_req_failed**: Percentage of failed requests
   - Target: < 1%

4. **http_reqs**: Total number of requests and rate
   - Shows requests per second
   - Target: > 100 req/s

5. **vus**: Number of virtual users
   - Shows current and max virtual users

### Threshold Evaluation

At the end of the test, k6 shows which thresholds passed or failed:

```
✓ http_req_duration..............: p(95) < 500ms
✓ http_req_failed................: rate < 0.01
✗ http_reqs......................: rate > 100
```

- ✓ = Threshold passed
- ✗ = Threshold failed

### Custom Metrics

Tests may include custom metrics:

```
dashboard_load_time............: avg=450ms    p(95)=800ms
dashboard_errors...............: 0.50%   ✓ 5         ✗ 995
marks_entered..................: 2500    total
```

---

## Best Practices

### 1. Test Environment

- **Use dedicated test environment**: Don't run performance tests on production
- **Consistent environment**: Use the same hardware/network for comparable results
- **Warm up**: Run a small test first to warm up caches and connections
- **Clean state**: Reset database to known state before tests

### 2. Test Design

- **Realistic scenarios**: Simulate actual user behavior
- **Think time**: Add sleep() between requests to simulate user reading/thinking
- **Ramp up gradually**: Don't start with maximum load immediately
- **Test one thing at a time**: Isolate what you're testing

### 3. Running Tests

- **Start small**: Begin with low load and increase gradually
- **Monitor resources**: Watch CPU, memory, disk I/O during tests
- **Run multiple times**: Run tests 3-5 times and average results
- **Document results**: Keep records of test results for comparison

### 4. Interpreting Results

- **Focus on percentiles**: p(95) and p(99) are more important than average
- **Look for trends**: Compare results over time
- **Identify bottlenecks**: Use metrics to find performance issues
- **Set realistic thresholds**: Based on your requirements

### 5. Optimization

- **Fix one issue at a time**: Don't try to optimize everything at once
- **Measure impact**: Test before and after optimization
- **Profile code**: Use profiling tools to find slow code
- **Optimize database**: Add indexes, optimize queries

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Error**: `dial tcp 127.0.0.1:5000: connect: connection refused`

**Solution**:
- Ensure backend server is running
- Check BASE_URL in configuration
- Verify port number

#### 2. Authentication Failed

**Error**: `login failed: 401 - Unauthorized`

**Solution**:
- Verify test user credentials in `.env.performance`
- Ensure test users exist in database
- Check branch code is correct

#### 3. High Error Rate

**Error**: `http_req_failed: rate > 0.01`

**Solution**:
- Check server logs for errors
- Reduce load (fewer VUs)
- Increase server resources
- Optimize slow endpoints

#### 4. Timeout Errors

**Error**: `request timeout`

**Solution**:
- Increase timeout in test configuration
- Optimize slow endpoints
- Check database performance
- Verify network connectivity

#### 5. Out of Memory

**Error**: `fatal error: out of memory`

**Solution**:
- Reduce number of VUs
- Reduce test duration
- Increase system memory
- Optimize test script

### Debugging

```bash
# Run with verbose output
k6 run --verbose backend/performance-tests/tests/sample-test.js

# Run with HTTP debug
k6 run --http-debug backend/performance-tests/tests/sample-test.js

# Run with full HTTP debug
k6 run --http-debug=full backend/performance-tests/tests/sample-test.js

# Run single iteration for debugging
k6 run --iterations 1 --vus 1 backend/performance-tests/tests/sample-test.js
```

### Getting Help

- **k6 Documentation**: https://k6.io/docs/
- **k6 Community Forum**: https://community.k6.io/
- **k6 GitHub**: https://github.com/grafana/k6
- **k6 Examples**: https://k6.io/docs/examples/

---

## Next Steps

1. **Install k6** following the installation instructions above
2. **Configure test environment** by creating `.env.performance` file
3. **Run sample test** to verify setup: `k6 run backend/performance-tests/tests/sample-test.js`
4. **Run dashboard test** to test basic load: `k6 run backend/performance-tests/tests/dashboard-load-test.js`
5. **Analyze results** and identify performance bottlenecks
6. **Optimize** based on findings
7. **Run full test suite** to verify improvements

---

## Additional Resources

### k6 Cloud (Optional)

For advanced features like distributed testing and result visualization:

1. Sign up at https://app.k6.io/
2. Get your API token
3. Run tests in cloud:
   ```bash
   k6 cloud backend/performance-tests/tests/dashboard-load-test.js
   ```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run performance tests
        run: |
          k6 run backend/performance-tests/tests/sample-test.js
          k6 run backend/performance-tests/tests/dashboard-load-test.js
```

---

## Conclusion

This performance testing setup provides a solid foundation for testing the Skoolific V2 backend APIs. Regular performance testing helps ensure the system can handle expected load and identifies bottlenecks before they impact users.

For questions or issues, please contact the development team or refer to the k6 documentation.

**Happy Testing! 🚀**
