# Skoolific V2 End-to-End Tests

This directory contains end-to-end (E2E) tests for the Skoolific V2 application using Playwright.

## Directory Structure

```
e2e/
├── auth/                    # Authentication flow tests
│   └── admin-login.spec.js
├── academic/                # Academic module tests
│   └── student-registration.spec.js
├── fixtures/                # Test data fixtures
│   └── test-data.js
├── helpers/                 # Helper functions
│   └── auth-helper.js
└── README.md               # This file
```

## Test Organization

Tests are organized by feature/module:

- **auth/** - Authentication and login flows
- **academic/** - Student registration, attendance, marks, exams
- **finance/** - Fee management, payments
- **hr/** - Staff management, attendance, payroll
- **communication/** - Posts, notifications, messages
- **fixtures/** - Reusable test data
- **helpers/** - Utility functions for tests

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in a specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run a specific test file
```bash
npx playwright test e2e/auth/admin-login.spec.js
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### Run tests with UI mode (interactive)
```bash
npx playwright test --ui
```

## Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

Reports are generated in the `playwright-report/` directory.

## Configuration

The Playwright configuration is in `playwright.config.js` at the root of the APP directory.

Key configuration options:
- **baseURL**: `http://localhost:5173` (Vite dev server)
- **timeout**: 30 seconds per test
- **retries**: 2 retries in CI, 0 locally
- **browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **webServer**: Automatically starts dev server before tests

## Writing Tests

### Basic Test Structure

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Using Helpers

```javascript
import { loginAsAdmin } from '../helpers/auth-helper.js';
import { testUsers } from '../fixtures/test-data.js';

test('should access admin dashboard', async ({ page }) => {
  await loginAsAdmin(page, testUsers.admin);
  await expect(page.locator('text=/Dashboard/i')).toBeVisible();
});
```

### Using Test Data

```javascript
import { testStudent } from '../fixtures/test-data.js';

test('should register student', async ({ page }) => {
  await page.fill('input[name="firstName"]', testStudent.firstName);
  await page.fill('input[name="lastName"]', testStudent.lastName);
  // ... rest of the form
});
```

## Best Practices

1. **Use data-testid attributes** for stable selectors
   ```html
   <button data-testid="submit-button">Submit</button>
   ```
   ```javascript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Wait for elements properly**
   ```javascript
   await page.waitForSelector('[data-testid="student-list"]');
   await expect(page.locator('[data-testid="student-list"]')).toBeVisible();
   ```

3. **Use descriptive test names**
   ```javascript
   test('should show validation error when submitting empty form', async ({ page }) => {
     // ...
   });
   ```

4. **Clean up after tests**
   ```javascript
   test.afterEach(async ({ page }) => {
     // Clean up test data
   });
   ```

5. **Use fixtures for test data**
   - Keep test data in `fixtures/test-data.js`
   - Update fixtures based on your test environment

6. **Organize tests by feature**
   - Create subdirectories for each major feature
   - Keep related tests together

## Environment Variables

You can configure the base URL using environment variables:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

## Debugging Tests

### Visual debugging with Playwright Inspector
```bash
npx playwright test --debug
```

### Generate test code with Codegen
```bash
npx playwright codegen http://localhost:5173
```

### View trace files
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries for flaky tests
- Single worker for stability
- HTML and JSON reports

Example GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright browsers
  run: npx playwright install --with-deps
  
- name: Run E2E tests
  run: npm run test:e2e
  
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Coverage

Current test coverage:
- ✅ Admin login flow
- ✅ Student registration flow
- 🔄 AI exam creation flow (pending)
- 🔄 Exam taking flow (pending)
- 🔄 Mark entry flow (pending)
- 🔄 Attendance marking flow (pending)
- 🔄 Payment flow (pending)
- 🔄 Cross-branch reporting (pending)

## Troubleshooting

### Tests fail with "Target closed" error
- Increase timeout in `playwright.config.js`
- Check if the dev server is running properly

### Tests fail with "Element not found" error
- Use `page.waitForSelector()` before interacting with elements
- Check if selectors are correct
- Use `--headed` mode to see what's happening

### Tests are flaky
- Add proper waits (`waitForSelector`, `waitForURL`)
- Avoid using `page.waitForTimeout()` (use explicit waits instead)
- Check for race conditions

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
