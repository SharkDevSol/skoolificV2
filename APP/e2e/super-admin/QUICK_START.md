# Super Admin E2E Tests - Quick Start Guide

## Prerequisites

### 1. Install Dependencies
```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Setup Test Environment
Ensure the following are configured:
- Super Admin user created in database
- Test branch databases populated with data
- Backend API running on `http://localhost:3000`

### 3. Create Super Admin User
```sql
-- Create Super Admin user (adjust password hash as needed)
INSERT INTO super_admins (username, password_hash, email, created_at)
VALUES (
  'superadmin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhzW7pS', -- superadmin123
  'superadmin@skoolific.com',
  NOW()
);
```

## Quick Test Commands

### Run All Tests
```bash
npx playwright test e2e/super-admin/
```

### Run with UI (Recommended for First Time)
```bash
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --ui
```

### Run Specific Test Suite
```bash
# Login tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Super Admin Login"

# Aggregation tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Cross-Branch Data Aggregation"

# Export tests
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js -g "Data Export"
```

### Debug Mode
```bash
npx playwright test e2e/super-admin/cross-branch-reporting.spec.js --debug
```

### Generate Report
```bash
npx playwright test e2e/super-admin/
npx playwright show-report
```

## Test Data Setup

### Update Test Credentials
Edit `APP/e2e/fixtures/test-data.js`:

```javascript
export const testUsers = {
  // ... other users
  superAdmin: {
    username: 'your-super-admin-username',
    password: 'your-super-admin-password',
    role: 'super_admin'
  }
};
```

### Update Branch Configuration
Edit `APP/e2e/fixtures/test-data.js`:

```javascript
export const superAdminTestData = {
  branches: [
    { code: 'ib3', name: 'Iqrab Branch 3', database: 'iqrab3' },
    { code: 'ama', name: 'Al Markaz', database: 'almarkaz' },
    { code: 'alk', name: 'Al Khwarizmi', database: 'alkhwarizm' }
  ]
};
```

## Common Issues & Solutions

### Issue: Login Fails
**Solution:**
```bash
# Verify Super Admin user exists
psql -d your_database -c "SELECT * FROM super_admins WHERE username='superadmin';"

# Check credentials in test-data.js match database
```

### Issue: Data Not Loading
**Solution:**
```bash
# Verify branch databases are accessible
psql -d iqrab3 -c "SELECT COUNT(*) FROM students;"
psql -d almarkaz -c "SELECT COUNT(*) FROM students;"
psql -d alkhwarizm -c "SELECT COUNT(*) FROM students;"

# Ensure backend API is running
curl http://localhost:3000/api/health
```

### Issue: Tests Timeout
**Solution:**
```javascript
// Increase timeout in playwright.config.js
{
  timeout: 60000, // 60 seconds
  expect: {
    timeout: 10000 // 10 seconds
  }
}
```

## Test Results Interpretation

### ✅ All Tests Pass
- Super Admin functionality working correctly
- Cross-branch aggregation operational
- Data export functioning properly

### ❌ Login Tests Fail
- Check Super Admin credentials
- Verify authentication endpoint
- Ensure database connection

### ❌ Aggregation Tests Fail
- Verify branch database connections
- Check data exists in branch databases
- Review aggregation service logs

### ❌ Export Tests Fail
- Verify export functionality implemented
- Check file generation permissions
- Review backend export endpoints

## Next Steps

1. **Run Tests Locally**
   ```bash
   npx playwright test e2e/super-admin/ --ui
   ```

2. **Review Test Report**
   ```bash
   npx playwright show-report
   ```

3. **Fix Any Failures**
   - Check error messages
   - Review test logs
   - Verify test data

4. **Integrate with CI/CD**
   - Add to GitHub Actions
   - Configure automated testing
   - Set up test notifications

## Useful Resources

- [Full README](./README.md) - Comprehensive documentation
- [Test Summary](./CROSS_BRANCH_REPORTING_E2E_SUMMARY.md) - Detailed test coverage
- [Playwright Docs](https://playwright.dev/) - Official documentation
- [E2E Testing Setup](../../E2E_TESTING_SETUP.md) - General E2E setup guide

## Support

For issues or questions:
1. Check the [README](./README.md) troubleshooting section
2. Review test logs and error messages
3. Verify test environment setup
4. Contact development team

---

**Quick Reference:**
- Total Tests: 43
- Test Suites: 11
- Estimated Run Time: 5-10 minutes
- Browsers: Chromium, Firefox, WebKit

**Status:** ✅ Ready to Use
