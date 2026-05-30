# Playwright E2E Testing Setup Guide

This document provides a comprehensive guide for setting up and using Playwright for end-to-end testing in the Skoolific V2 project.

## ✅ Installation Complete

Playwright has been successfully installed and configured for the Skoolific V2 project with the following setup:

### Installed Components

1. **@playwright/test** - Playwright testing framework
2. **Browser Binaries** - Chromium, Firefox, WebKit
3. **Configuration File** - `playwright.config.js`
4. **Test Directory Structure** - `e2e/` with organized subdirectories
5. **Helper Functions** - Authentication and utility helpers
6. **Test Fixtures** - Reusable test data
7. **Sample Tests** - Admin login and student registration flows

## 📁 Directory Structure

```
APP/
├── e2e/
│   ├── auth/
│   │   └── admin-login.spec.js          # Admin authentication tests
│   ├── academic/
│   │   └── student-registration.spec.js # Student registration tests
│   ├── fixtures/
│   │   └── test-data.js                 # Test data fixtures
│   ├── helpers/
│   │   └── auth-helper.js               # Authentication helpers
│   └── README.md                        # E2E testing documentation
├── playwright.config.js                  # Playwright configuration
├── package.json                          # Updated with E2E scripts
└── E2E_TESTING_SETUP.md                 # This file
```

## 🚀 Quick Start

### 1. Run All E2E Tests

```bash
cd APP
npm run test:e2e
```

### 2. Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### 3. Run Tests with UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### 4. Debug Tests

```bash
npm run test:e2e:debug
```

### 5. View Test Report

```bash
npm run test:e2e:report
```

## 🎯 Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:headed` | Run tests in headed mode (visible browser) |
| `npm run test:e2e:ui` | Run tests in interactive UI mode |
| `npm run test:e2e:debug` | Run tests in debug mode with Playwright Inspector |
| `npm run test:e2e:report` | Show HTML test report |

## 🌐 Configured Browsers

Playwright is configured to run tests on the following browsers:

1. **Chromium** (Desktop Chrome) - 1920x1080
2. **Firefox** (Desktop Firefox) - 1920x1080
3. **WebKit** (Desktop Safari) - 1920x1080
4. **Mobile Chrome** (Pixel 5)
5. **Mobile Safari** (iPhone 12)

## ⚙️ Configuration Highlights

### Base Configuration (`playwright.config.js`)

- **Test Directory**: `./e2e`
- **Timeout**: 30 seconds per test
- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Parallel Execution**: Enabled
- **Retries**: 2 in CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure
- **Traces**: On first retry

### Web Server

The configuration automatically starts the Vite dev server before running tests:

```javascript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

## 📝 Sample Tests Included

### 1. Admin Login Flow (`e2e/auth/admin-login.spec.js`)

Tests the complete admin authentication flow:
- ✅ Display login form with branch code input
- ✅ Show error for invalid branch code
- ✅ Show error for invalid credentials
- ✅ Successfully login with valid credentials
- ✅ Persist branch code in local storage

### 2. Student Registration Flow (`e2e/academic/student-registration.spec.js`)

Tests the student registration process:
- ✅ Navigate to student registration page
- ✅ Show validation errors for empty form
- ✅ Successfully register a new student
- ✅ Display registered student in student list
- ✅ Validate phone number format
- ✅ Support KG student registration (when enabled)
- ✅ Support evening class registration (when enabled)

## 🛠️ Helper Functions

### Authentication Helpers (`e2e/helpers/auth-helper.js`)

Reusable authentication functions for different user types:

```javascript
import { loginAsAdmin, loginAsTeacher, loginAsStudent, loginAsGuardian } from '../helpers/auth-helper.js';

// Login as admin
await loginAsAdmin(page, testUsers.admin);

// Login as teacher
await loginAsTeacher(page, testUsers.teacher);

// Login as student
await loginAsStudent(page, testUsers.student);

// Login as guardian
await loginAsGuardian(page, testUsers.guardian);

// Logout
await logout(page);

// Clear authentication
await clearAuth(page);
```

## 📊 Test Data Fixtures

Test data is centralized in `e2e/fixtures/test-data.js`:

```javascript
import { testUsers, testStudent, testExam, testPayment } from '../fixtures/test-data.js';

// Use in tests
await page.fill('input[name="firstName"]', testStudent.firstName);
```

**Important**: Update the test data in `test-data.js` to match your test environment.

## 📋 Writing New Tests

### Basic Test Template

```javascript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth-helper.js';
import { testUsers } from '../fixtures/test-data.js';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await loginAsAdmin(page, testUsers.admin);
  });

  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/feature-page');
    
    // Interact with elements
    await page.click('button[data-testid="action-button"]');
    
    // Assert expectations
    await expect(page.locator('text=/Success/i')).toBeVisible();
  });
});
```

## 🎨 Best Practices

### 1. Use Data-TestId Attributes

Add `data-testid` attributes to your components for stable selectors:

```jsx
<button data-testid="submit-button">Submit</button>
```

```javascript
await page.click('[data-testid="submit-button"]');
```

### 2. Wait for Elements Properly

```javascript
// Wait for element to be visible
await page.waitForSelector('[data-testid="student-list"]');

// Or use expect with auto-waiting
await expect(page.locator('[data-testid="student-list"]')).toBeVisible();
```

### 3. Use Descriptive Test Names

```javascript
test('should show validation error when submitting empty registration form', async ({ page }) => {
  // Test implementation
});
```

### 4. Organize Tests by Feature

Create subdirectories for each major feature:
- `e2e/auth/` - Authentication tests
- `e2e/academic/` - Academic module tests
- `e2e/finance/` - Finance module tests
- `e2e/hr/` - HR module tests

### 5. Use Fixtures for Test Data

Keep test data in `fixtures/test-data.js` and update based on your environment.

## 🐛 Debugging Tests

### Visual Debugging

```bash
npm run test:e2e:debug
```

This opens the Playwright Inspector where you can:
- Step through tests
- Inspect elements
- View console logs
- See network requests

### Generate Test Code

Use Playwright Codegen to generate test code by recording your actions:

```bash
npx playwright codegen http://localhost:5173
```

### View Traces

If a test fails, you can view the trace:

```bash
npx playwright show-trace trace.zip
```

## 📈 Test Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

The report includes:
- Test results (passed/failed)
- Screenshots of failures
- Videos of test runs
- Traces for debugging
- Execution time

## 🔄 CI/CD Integration

Playwright is configured for CI/CD with:
- **Retries**: 2 retries for flaky tests in CI
- **Workers**: Single worker in CI for stability
- **Reports**: HTML and JSON reports generated

### Example GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd APP
          npm ci
      
      - name: Install Playwright browsers
        run: |
          cd APP
          npx playwright install --with-deps
      
      - name: Run E2E tests
        run: |
          cd APP
          npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: APP/playwright-report/
```

## 🎯 Next Steps

### Implement Remaining E2E Tests

Based on Phase 10.3 tasks, implement the following tests:

1. **AI Exam Creation Flow** (`e2e/academic/ai-exam-creation.spec.js`)
   - Test exam configuration
   - Test question type selection
   - Test AI generation
   - Test exam preview and approval

2. **Exam Taking Flow** (`e2e/academic/exam-taking.spec.js`)
   - Test student exam access
   - Test question navigation
   - Test answer submission
   - Test timer functionality

3. **Mark Entry Flow** (`e2e/academic/mark-entry.spec.js`)
   - Test mark list creation
   - Test mark entry
   - Test mark validation
   - Test mark list locking

4. **Attendance Marking Flow** (`e2e/academic/attendance-marking.spec.js`)
   - Test attendance page access
   - Test marking attendance
   - Test attendance reports

5. **Payment Flow** (`e2e/finance/payment-flow.spec.js`)
   - Test fee configuration
   - Test payment recording
   - Test payment receipts

6. **Cross-Branch Reporting** (`e2e/super-admin/cross-branch-reporting.spec.js`)
   - Test Super Admin login
   - Test branch selection
   - Test aggregated reports

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Generator](https://playwright.dev/docs/codegen)

## 🆘 Troubleshooting

### Tests Fail with "Target closed" Error

**Solution**: Increase timeout in `playwright.config.js`:

```javascript
timeout: 60 * 1000, // Increase to 60 seconds
```

### Tests Fail with "Element not found" Error

**Solution**: Add proper waits:

```javascript
await page.waitForSelector('[data-testid="element"]');
await page.click('[data-testid="element"]');
```

### Dev Server Not Starting

**Solution**: Check if port 5173 is available or update the port in `playwright.config.js`:

```javascript
webServer: {
  command: 'npm run dev -- --port 5174',
  url: 'http://localhost:5174',
}
```

### Tests Are Flaky

**Solution**:
1. Add explicit waits instead of `waitForTimeout`
2. Use `waitForLoadState('networkidle')` for dynamic content
3. Increase action timeout in config

## ✅ Task 10.3.1 Completion Checklist

- [x] Install Playwright testing framework
- [x] Configure Playwright for the project
- [x] Set up test directory structure (`e2e/`)
- [x] Configure browsers (Chromium, Firefox, WebKit)
- [x] Create basic Playwright configuration file
- [x] Add E2E test scripts to package.json
- [x] Create helper functions for authentication
- [x] Create test data fixtures
- [x] Write sample tests (admin login, student registration)
- [x] Create comprehensive documentation
- [x] Update .gitignore for Playwright artifacts

## 🎉 Summary

Playwright has been successfully installed and configured for the Skoolific V2 project. The setup includes:

- ✅ Playwright testing framework installed
- ✅ Three browsers configured (Chromium, Firefox, WebKit)
- ✅ Mobile viewports configured (Mobile Chrome, Mobile Safari)
- ✅ Test directory structure created
- ✅ Helper functions and fixtures implemented
- ✅ Sample tests written
- ✅ NPM scripts added for easy test execution
- ✅ Comprehensive documentation provided

You can now start writing E2E tests for the remaining flows in Phase 10.3!
