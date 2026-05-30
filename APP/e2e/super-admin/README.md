# Super Admin E2E Tests

## Overview
This directory contains End-to-End (E2E) tests for the Super Admin application, focusing on cross-branch data aggregation, reporting, and management capabilities.

## Test Files

### 1. cross-branch-reporting.spec.js
Comprehensive E2E tests for Super Admin cross-branch reporting functionality.

**Test Coverage:**
- Super Admin authentication
- Multi-branch data aggregation
- Branch comparison and filtering
- Consolidated report generation
- Data export (Excel, PDF, CSV)
- Date range filtering
- Real-time data updates
- Error handling
- Performance optimization
- Accessibility
- Session management

**Total Tests:** 43

## Prerequisites

### 1. Test Environment Setup
```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### 2. Test Database Setup
Ensure the following test databases are available and populated:
- `iqrab3` (Iqrab Branch 3)
- `almarkaz` (Al Markaz)
- `alkhwarizm` (Al Khwarizmi)

### 3. Super Admin User
Create a Super Admin user in the system:
```sql
INSERT INTO super_admins (username, password, email, created_at)
VALUES ('superadmin', '$2b$12$hashed_password', 'superadmin@skoolific.com', NOW());
```

### 4. Environment Variables
Set up the following environment variables in `.env.test`:
```env
# Super Admin Test Credentials
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=superadmin123

# Branch Database Connections
BRANCH_1_DB=iqrab3
BRANCH_2_DB=almarkaz
BRANCH_3_DB=alkhwarizm

# API Base URL
API_BASE_URL=http://localhost:3000
```

## Running Tests

### Run All Super Admin Tests
```bash
npx playwright test e2e/super-admin/
```

### Run Specific Test File
```bash
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js
```

### Run with UI Mode (Interactive)
```bash
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --ui
```

### Run Specific Test Suite
```bash
# Run only login tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Super Admin Login"

# Run only aggregation tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Cross-Branch Data Aggregation"

# Run only export tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Data Export"
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --headed
```

### Run on Specific Browser
```bash
# Chromium
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --project=chromium

# Firefox
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --project=firefox

# WebKit (Safari)
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --project=webkit
```

### Debug Tests
```bash
# Debug mode with Playwright Inspector
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --debug

# Debug specific test
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "should display aggregated student enrollment" --debug
```

### Generate Test Report
```bash
# Run tests and generate HTML report
npx playwright test e2e/super-admin/

# View report
npx playwright show-report
```

## Test Data

### Super Admin User
```javascript
{
  username: 'superadmin',
  password: 'superadmin123',
  role: 'super_admin'
}
```

### Test Branches
```javascript
[
  {
    code: 'ib3',
    name: 'Iqrab Branch 3',
    database: 'iqrab3'
  },
  {
    code: 'ama',
    name: 'Al Markaz',
    database: 'almarkaz'
  },
  {
    code: 'alk',
    name: 'Al Khwarizmi',
    database: 'alkhwarizm'
  }
]
```

### Expected Metrics
- **Total Students:** 1500+
- **Total Staff:** 120+
- **Total Revenue:** 5,000,000 ETB
- **Average Attendance Rate:** 90%+
- **Average Academic Performance:** 75%+

## Test Structure

### Test Organization
```
e2e/super-admin/
├── cross-branch-reporting.spec.js    # Main test file
├── README.md                          # This file
└── CROSS_BRANCH_REPORTING_E2E_SUMMARY.md  # Detailed test summary
```

### Test Suites
1. **Super Admin Login** - Authentication and dashboard access
2. **Cross-Branch Data Aggregation** - Multi-branch data consolidation
3. **Branch Comparison and Filtering** - Branch selection and comparison
4. **Consolidated Reports** - Report generation across branches
5. **Data Export Functionality** - Export to Excel, PDF, CSV
6. **Date Range Filtering** - Time-based data filtering
7. **Real-Time Data Updates** - Data refresh and auto-update
8. **Error Handling** - Connection errors and edge cases
9. **Performance and Optimization** - Load times and caching
10. **Accessibility** - ARIA labels and keyboard navigation
11. **Logout and Session Management** - Session security

## Helper Functions

### Authentication Helper
```javascript
import { loginAsSuperAdmin } from '../helpers/auth-helper.js';

// Login as Super Admin
await loginAsSuperAdmin(page, testUsers.superAdmin);
```

### Test Data
```javascript
import { superAdminTestData } from '../fixtures/test-data.js';

// Access branch data
const branches = superAdminTestData.branches;

// Access aggregated metrics
const metrics = superAdminTestData.aggregatedMetrics;
```

## Common Test Patterns

### 1. Testing Data Aggregation
```javascript
test('should display aggregated data', async ({ page }) => {
  await loginAsSuperAdmin(page, testUsers.superAdmin);
  
  // Navigate to report
  await page.click('text=/Student Enrollment/i');
  
  // Wait for data to load
  await page.waitForSelector('[data-testid="enrollment-summary"]', { timeout: 10000 });
  
  // Verify aggregated data
  const totalEnrollment = page.locator('[data-testid="total-enrollment"]');
  await expect(totalEnrollment).toBeVisible();
});
```

### 2. Testing Branch Filtering
```javascript
test('should filter by branch', async ({ page }) => {
  await loginAsSuperAdmin(page, testUsers.superAdmin);
  
  // Select specific branch
  await page.click('[data-testid="branch-selector"]');
  await page.click(`text=${superAdminTestData.branches[0].name}`);
  
  // Wait for data to reload
  await page.waitForTimeout(2000);
  
  // Verify filtered data
  const branchIndicator = page.locator('[data-testid="selected-branch"]');
  await expect(branchIndicator).toContainText(superAdminTestData.branches[0].name);
});
```

### 3. Testing Data Export
```javascript
test('should export data', async ({ page }) => {
  await loginAsSuperAdmin(page, testUsers.superAdmin);
  
  // Navigate to report
  await page.click('text=/Financial Reports/i');
  await page.waitForSelector('[data-testid="financial-summary"]', { timeout: 10000 });
  
  // Set up download listener
  const downloadPromise = page.waitForEvent('download');
  
  // Click export button
  await page.click('[data-testid="export-excel"]');
  
  // Wait for download
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
});
```

## Troubleshooting

### Test Failures

#### 1. Authentication Failures
**Problem:** Super Admin login fails
**Solution:**
- Verify Super Admin user exists in database
- Check credentials in test-data.js
- Ensure password is correctly hashed in database

#### 2. Data Not Loading
**Problem:** Aggregated data doesn't appear
**Solution:**
- Verify all branch databases are accessible
- Check database connection strings
- Ensure test data exists in branch databases
- Increase timeout values if network is slow

#### 3. Branch Selector Not Working
**Problem:** Cannot select branches
**Solution:**
- Verify branch_config table is populated
- Check branch codes match test data
- Ensure branch selector component is rendered

#### 4. Export Tests Failing
**Problem:** Download events not triggered
**Solution:**
- Check if export functionality is implemented
- Verify file generation on backend
- Ensure proper MIME types are set

#### 5. Performance Tests Failing
**Problem:** Load times exceed thresholds
**Solution:**
- Optimize database queries
- Implement caching
- Reduce data volume in test databases
- Increase timeout thresholds if necessary

### Common Issues

#### Timeout Errors
```javascript
// Increase timeout for slow operations
await page.waitForSelector('[data-testid="enrollment-summary"]', { timeout: 20000 });
```

#### Flaky Tests
```javascript
// Add retry logic in playwright.config.js
{
  retries: 2,
  timeout: 30000
}
```

#### Network Issues
```javascript
// Wait for network idle
await page.waitForLoadState('networkidle');
```

## Best Practices

### 1. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach` to set up clean state
- Clear authentication between tests

### 2. Descriptive Test Names
- Use clear, descriptive test names
- Follow pattern: "should [expected behavior] when [condition]"
- Group related tests in describe blocks

### 3. Proper Assertions
- Use specific assertions (toBeVisible, toContainText, etc.)
- Verify both positive and negative cases
- Check for error messages and edge cases

### 4. Wait Strategies
- Use `waitForSelector` instead of `waitForTimeout` when possible
- Wait for specific elements, not arbitrary time periods
- Use `waitForLoadState` for page loads

### 5. Test Data Management
- Use fixtures for consistent test data
- Don't hardcode values in tests
- Clean up test data after tests if needed

## Performance Benchmarks

| Operation | Target | Status |
|-----------|--------|--------|
| Dashboard Load | < 15s | ✅ |
| Cross-Branch Data Load | < 10s | ✅ |
| Cached Data Load | < 5s | ✅ |
| Report Generation | < 20s | ✅ |
| Data Export | < 10s | ✅ |

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Super Admin E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test e2e/super-admin/
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Related Documentation
- [E2E Testing Setup](../../E2E_TESTING_SETUP.md)
- [Super Admin Setup Guide](../../../packages/desktop-super-admin/SUPER_ADMIN_SETUP.md)
- [Multi-Database Connection](../../../super-admin-dashboard/backend/MULTI_DATABASE_CONNECTION.md)
- [Phase 7.3 Complete](../../../PHASE_7.3_SUPER_ADMIN_COMPLETE.md)

## Contributing

### Adding New Tests
1. Follow existing test structure
2. Use descriptive test names
3. Add proper assertions
4. Update this README with new test information
5. Update test count in summary document

### Reporting Issues
- Include test name and error message
- Provide steps to reproduce
- Include browser and OS information
- Attach screenshots or videos if possible

## Support
For questions or issues with Super Admin E2E tests, contact the development team or refer to the main E2E testing documentation.

---

**Last Updated:** 2024-01-15
**Maintained By:** Skoolific Development Team
**Status:** ✅ Active
