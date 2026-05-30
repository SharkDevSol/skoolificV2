# Academic Module E2E Tests

This directory contains end-to-end tests for the Academic module of Skoolific V2.

## Test Files

### Student Registration (`student-registration.spec.js`)
Comprehensive E2E tests for the student registration flow.

**Coverage:**
- Form validation (required fields, formats)
- Guardian assignment (new/existing)
- KG and evening class support
- Success flows and error handling
- Student list display
- Photo upload and bulk import

**Test Count:** 26 tests

**Run Command:**
```bash
npx playwright test e2e/academic/student-registration.spec.js
```

## Quick Start

### 1. Prerequisites
```bash
# Install dependencies
cd APP
npm install

# Start dev server
npm run dev
```

### 2. Run Tests

#### All Academic Tests
```bash
npx playwright test e2e/academic/
```

#### Student Registration Tests Only
```bash
npx playwright test e2e/academic/student-registration.spec.js
```

#### With UI Mode (Interactive)
```bash
npx playwright test e2e/academic/student-registration.spec.js --ui
```

#### With Debug Mode
```bash
npx playwright test e2e/academic/student-registration.spec.js --debug
```

#### Specific Browser
```bash
# Chromium only
npx playwright test e2e/academic/student-registration.spec.js --project=chromium

# Firefox only
npx playwright test e2e/academic/student-registration.spec.js --project=firefox

# WebKit only
npx playwright test e2e/academic/student-registration.spec.js --project=webkit
```

### 3. View Results

#### HTML Report
```bash
npx playwright show-report
```

#### JSON Report
```bash
cat test-results/results.json
```

## Test Organization

```
e2e/academic/
├── student-registration.spec.js          # Student registration E2E tests
├── STUDENT_REGISTRATION_E2E_SUMMARY.md   # Detailed documentation
└── README.md                             # This file
```

## Test Data

Test data is managed in `e2e/fixtures/test-data.js`:

```javascript
import { studentRegistrationData, guardianData } from '../fixtures/test-data.js';

// Use in tests
const regularStudent = studentRegistrationData.regular;
const kgStudent = studentRegistrationData.kg;
```

## Authentication

Tests use the admin authentication helper:

```javascript
import { loginAsAdmin } from '../helpers/auth-helper.js';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page, testUsers.admin);
});
```

## Common Test Patterns

### Unique Test Data
```javascript
// Generate unique identifiers to prevent conflicts
const timestamp = Date.now();
const uniqueId = `${timestamp}`.slice(-4);
const studentName = `Test Student ${uniqueId}`;
```

### Form Filling
```javascript
// Fill student registration form
await page.selectOption('select[name="class"]', { index: 1 });
await page.fill('input[name="student_name"]', studentName);
await page.fill('input[name="smachine_id"]', machineId);
await page.fill('input[name="age"]', '10');
await page.selectOption('select[name="gender"]', 'Male');
```

### Validation Testing
```javascript
// Test validation error
await page.fill('input[name="student_name"]', 'Invalid123');
await page.click('input[name="smachine_id"]'); // Blur
await expect(page.locator('text=/letters and spaces/i')).toBeVisible();
```

### Success Verification
```javascript
// Verify success message
await page.click('button[type="submit"]');
await expect(page.locator('text=/successfully/i')).toBeVisible({ timeout: 15000 });
```

## Troubleshooting

### Tests Timeout
- Ensure dev server is running (`npm run dev`)
- Check `PLAYWRIGHT_BASE_URL` environment variable
- Increase timeout in test if needed

### Authentication Fails
- Verify test user credentials in `test-data.js`
- Check branch code is correct
- Ensure database is accessible

### Form Not Loading
- Verify Task2 form structure is created
- Check API endpoints are responding
- Review browser console for errors

### Tests Fail Intermittently
- Add explicit waits: `await page.waitForTimeout(1000)`
- Use `waitForSelector` for dynamic elements
- Check for race conditions

## Environment Variables

```bash
# Set base URL
export PLAYWRIGHT_BASE_URL=http://localhost:5173

# Run tests
npx playwright test e2e/academic/
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd APP
    npm run dev &
    npx playwright test e2e/academic/
  env:
    PLAYWRIGHT_BASE_URL: http://localhost:5173
```

## Best Practices

1. **Use Unique Identifiers**: Prevent test data conflicts
2. **Clean Up**: Tests should be independent
3. **Explicit Waits**: Use `waitForSelector` instead of `waitForTimeout`
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Group Related Tests**: Use `test.describe()` for organization
6. **Handle Async**: Always await async operations
7. **Error Messages**: Verify specific error messages, not just presence

## Adding New Tests

### 1. Create Test File
```javascript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth-helper.js';

test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, testUsers.admin);
    await page.goto('/feature-page');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### 2. Add Test Data
Update `e2e/fixtures/test-data.js`:
```javascript
export const newFeatureData = {
  // Test data here
};
```

### 3. Run and Verify
```bash
npx playwright test e2e/academic/new-feature.spec.js
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Skoolific V2 Design Doc](.kiro/specs/skoolific-v2-upgrade/design.md)
- [Task List](.kiro/specs/skoolific-v2-upgrade/tasks.md)
- [Test Data Fixtures](../fixtures/test-data.js)
- [Auth Helpers](../helpers/auth-helper.js)

## Support

For issues or questions:
1. Check test output and error messages
2. Review browser console in debug mode
3. Consult Playwright documentation
4. Review implementation code

---

**Last Updated:** 2024
**Test Framework:** Playwright
**Coverage:** Student Registration (26 tests)
