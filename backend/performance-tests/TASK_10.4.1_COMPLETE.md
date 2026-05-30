# Task 10.4.1 Complete: Set up Apache JMeter or k6

## Summary

Successfully set up **k6** (modern, developer-friendly performance testing tool) for the Skoolific V2 backend APIs. k6 was chosen over Apache JMeter for its simplicity, JavaScript-based scripting, and modern features.

## What Was Implemented

### 1. Directory Structure ✅

```
backend/
├── performance-tests/
│   ├── config/
│   │   └── test-config.js          # Central configuration
│   ├── utils/
│   │   └── auth-helper.js          # Authentication utilities
│   ├── tests/
│   │   ├── sample-test.js          # Sample health check test
│   │   ├── dashboard-load-test.js  # Dashboard load test (100 users)
│   │   ├── mark-entry-load-test.js # Mark entry test (50 teachers)
│   │   ├── exam-taking-load-test.js # Exam taking test (500 students)
│   │   └── student-registration-load-test.js # Bulk registration (1000 students)
│   ├── run-all-tests.ps1           # PowerShell test runner
│   ├── run-all-tests.sh            # Bash test runner
│   ├── README.md                   # Quick reference guide
│   └── TASK_10.4.1_COMPLETE.md     # This file
├── .env.performance.example        # Environment variables template
└── PERFORMANCE_TESTING_SETUP.md    # Complete documentation
```

### 2. Configuration Files ✅

#### test-config.js
- Base URL configuration
- Test user credentials (admin, teacher, student)
- Performance thresholds
- Load test scenarios (light, medium, heavy, stress, spike)
- Helper functions for authentication

#### .env.performance.example
- Environment variables template
- API configuration
- Test user credentials
- Optional k6 Cloud configuration

### 3. Test Scripts ✅

#### Sample Test (sample-test.js)
- **Purpose**: Verify k6 setup and basic API connectivity
- **Load**: 10 virtual users
- **Duration**: 30 seconds
- **Target**: Health check endpoint

#### Dashboard Load Test (dashboard-load-test.js)
- **Purpose**: Test dashboard performance under typical load
- **Load**: 100 concurrent users
- **Duration**: 3 minutes
- **Endpoints**: Dashboard stats, enrollment, attendance, finance, activities
- **Custom Metrics**: Dashboard load time, error rate

#### Mark Entry Load Test (mark-entry-load-test.js)
- **Purpose**: Test mark entry system with concurrent teachers
- **Load**: 50 concurrent teachers
- **Duration**: 5 minutes
- **Operations**: Load forms, load students, enter marks, view marks
- **Custom Metrics**: Mark entry time, marks entered counter, error rate

#### Exam Taking Load Test (exam-taking-load-test.js)
- **Purpose**: Test exam system with high concurrent student load
- **Load**: Ramp up to 500 students
- **Duration**: 9 minutes
- **Stages**:
  - Ramp up to 100 users (1 minute)
  - Ramp up to 300 users (2 minutes)
  - Ramp up to 500 users (2 minutes)
  - Hold at 500 users (3 minutes)
  - Ramp down to 0 (1 minute)
- **Operations**: Load exams, start exam, answer questions, submit exam, view results
- **Custom Metrics**: Exam load time, answer submit time, answers submitted counter, error rate

#### Student Registration Load Test (student-registration-load-test.js)
- **Purpose**: Test bulk student registration performance
- **Load**: 1000 student registrations
- **Virtual Users**: 10 concurrent registrations
- **Max Duration**: 10 minutes
- **Custom Metrics**: Registration time, students registered counter, error rate

### 4. Utility Functions ✅

#### auth-helper.js
- `login(username, password, branchCode)` - Generic login function
- `loginAsAdmin()` - Login as admin user
- `loginAsTeacher()` - Login as teacher user
- `loginAsStudent()` - Login as student user
- `validateBranchCode(branchCode)` - Validate branch code

### 5. Test Runners ✅

#### PowerShell Script (run-all-tests.ps1)
- Checks k6 installation
- Checks backend server status
- Runs all tests sequentially
- Tracks test results
- Displays summary table
- Color-coded output

#### Bash Script (run-all-tests.sh)
- Checks k6 installation
- Checks backend server status
- Runs all tests sequentially
- Tracks test results
- Displays summary table
- Color-coded output

### 6. Documentation ✅

#### PERFORMANCE_TESTING_SETUP.md (Comprehensive Guide)
- Overview and why k6
- Installation instructions (Windows, Linux, macOS)
- Directory structure
- Configuration guide
- Running tests (basic and advanced)
- Test scenarios detailed explanation
- Interpreting results
- Best practices
- Troubleshooting
- CI/CD integration examples
- Additional resources

#### README.md (Quick Reference)
- Quick start guide
- Available tests table
- Common commands
- Configuration overview
- Performance targets
- Links to full documentation

### 7. Package.json Scripts ✅

Added npm scripts for easy test execution:
```json
"perf:sample": "k6 run performance-tests/tests/sample-test.js",
"perf:dashboard": "k6 run performance-tests/tests/dashboard-load-test.js",
"perf:marks": "k6 run performance-tests/tests/mark-entry-load-test.js",
"perf:exams": "k6 run performance-tests/tests/exam-taking-load-test.js",
"perf:registration": "k6 run performance-tests/tests/student-registration-load-test.js",
"perf:all": "npm run perf:sample && npm run perf:dashboard && npm run perf:marks"
```

## Performance Thresholds

All tests are configured with the following thresholds:

- **Response Time**: p(95) < 500ms, p(99) < 1000ms
- **Error Rate**: < 1%
- **Throughput**: > 100 requests per second
- **Custom Metrics**: Specific to each test type

## How to Use

### 1. Install k6

**Windows (Chocolatey)**:
```powershell
choco install k6
```

**macOS**:
```bash
brew install k6
```

**Linux (Debian/Ubuntu)**:
```bash
sudo apt-get install k6
```

### 2. Configure Environment

Copy `.env.performance.example` to `.env.performance` and update with your values:
```bash
cp .env.performance.example .env.performance
```

### 3. Run Tests

**Using npm scripts**:
```bash
npm run perf:sample          # Run sample test
npm run perf:dashboard       # Run dashboard test
npm run perf:marks           # Run mark entry test
npm run perf:exams           # Run exam taking test
npm run perf:registration    # Run registration test
npm run perf:all             # Run multiple tests
```

**Using k6 directly**:
```bash
k6 run backend/performance-tests/tests/sample-test.js
```

**Using test runners**:
```powershell
# Windows
.\backend\performance-tests\run-all-tests.ps1

# Linux/macOS
chmod +x backend/performance-tests/run-all-tests.sh
./backend/performance-tests/run-all-tests.sh
```

## Features

### ✅ Modern JavaScript-based Testing
- ES6 modules support
- Easy to read and maintain
- Familiar syntax for developers

### ✅ Comprehensive Test Coverage
- Health check test
- Dashboard load test
- Mark entry load test
- Exam taking load test
- Student registration load test

### ✅ Custom Metrics
- Dashboard load time
- Mark entry time
- Exam load time
- Answer submit time
- Registration time
- Error rates
- Counters for operations

### ✅ Flexible Configuration
- Environment-based configuration
- Multiple load scenarios
- Customizable thresholds
- Easy to extend

### ✅ Detailed Documentation
- Complete setup guide
- Quick reference
- Best practices
- Troubleshooting
- CI/CD integration examples

### ✅ Easy to Run
- npm scripts
- Test runner scripts
- Direct k6 commands
- Multiple output formats

## Next Steps

1. **Install k6** on your system
2. **Configure environment** by creating `.env.performance` file
3. **Start backend server**: `npm run dev`
4. **Run sample test** to verify setup: `npm run perf:sample`
5. **Run full test suite** to establish baseline: `.\backend\performance-tests\run-all-tests.ps1`
6. **Analyze results** and identify bottlenecks
7. **Optimize** based on findings
8. **Re-run tests** to verify improvements

## Performance Testing Best Practices

1. **Test in dedicated environment** - Don't run on production
2. **Start small** - Begin with low load and increase gradually
3. **Monitor resources** - Watch CPU, memory, disk I/O
4. **Run multiple times** - Average results from 3-5 runs
5. **Document results** - Keep records for comparison
6. **Focus on percentiles** - p(95) and p(99) are more important than average
7. **Identify bottlenecks** - Use metrics to find issues
8. **Optimize one thing at a time** - Measure impact of each change

## Task Requirements Met

✅ **Choose between Apache JMeter or k6** - k6 chosen for modern JavaScript-based testing  
✅ **Install the chosen tool** - Installation instructions provided for all platforms  
✅ **Create basic configuration** - test-config.js with comprehensive settings  
✅ **Set up test scripts directory structure** - Organized structure with config, utils, tests  
✅ **Create sample performance test** - 5 complete test scripts created  
✅ **Document setup and usage instructions** - Comprehensive documentation provided  

## Additional Features Implemented

✅ Authentication helper utilities  
✅ Custom metrics for detailed analysis  
✅ Multiple load scenarios (light, medium, heavy, stress, spike)  
✅ Test runner scripts (PowerShell and Bash)  
✅ npm scripts for easy execution  
✅ Environment variable configuration  
✅ Quick reference guide  
✅ CI/CD integration examples  
✅ Troubleshooting guide  

## Files Created

1. `backend/performance-tests/config/test-config.js`
2. `backend/performance-tests/utils/auth-helper.js`
3. `backend/performance-tests/tests/sample-test.js`
4. `backend/performance-tests/tests/dashboard-load-test.js`
5. `backend/performance-tests/tests/mark-entry-load-test.js`
6. `backend/performance-tests/tests/exam-taking-load-test.js`
7. `backend/performance-tests/tests/student-registration-load-test.js`
8. `backend/performance-tests/run-all-tests.ps1`
9. `backend/performance-tests/run-all-tests.sh`
10. `backend/performance-tests/README.md`
11. `backend/performance-tests/TASK_10.4.1_COMPLETE.md`
12. `backend/.env.performance.example`
13. `backend/PERFORMANCE_TESTING_SETUP.md`

## Files Modified

1. `backend/package.json` - Added performance testing scripts

---

**Task Status**: ✅ **COMPLETE**

**Date Completed**: 2024-03-02

**Tool Selected**: k6 (modern, developer-friendly, JavaScript-based)

**Test Scripts Created**: 5 (sample, dashboard, mark entry, exam taking, student registration)

**Documentation**: Comprehensive setup guide and quick reference

**Ready for Use**: Yes - Install k6 and run tests
