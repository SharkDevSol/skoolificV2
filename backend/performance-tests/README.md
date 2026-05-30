# Performance Tests - Quick Reference

## Quick Start

1. **Install k6**:
   ```bash
   # Windows (Chocolatey)
   choco install k6
   
   # macOS
   brew install k6
   
   # Linux (Debian/Ubuntu)
   sudo apt-get install k6
   ```

2. **Verify installation**:
   ```bash
   k6 version
   ```

3. **Run sample test**:
   ```bash
   k6 run backend/performance-tests/tests/sample-test.js
   ```

## Available Tests

| Test | Description | Load | Duration |
|------|-------------|------|----------|
| `sample-test.js` | Health check test | 10 VUs | 30s |
| `dashboard-load-test.js` | Dashboard performance | 100 VUs | 3m |
| `mark-entry-load-test.js` | Mark entry system | 50 VUs | 5m |
| `exam-taking-load-test.js` | Exam taking system | 500 VUs | 9m |
| `student-registration-load-test.js` | Bulk registration | 1000 iterations | 10m |

## Common Commands

```bash
# Run a test
k6 run backend/performance-tests/tests/[test-name].js

# Run with custom VUs and duration
k6 run --vus 50 --duration 2m backend/performance-tests/tests/[test-name].js

# Run with environment variables
k6 run --env BASE_URL=http://localhost:5000 backend/performance-tests/tests/[test-name].js

# Export results to JSON
k6 run --out json=results.json backend/performance-tests/tests/[test-name].js

# Run with verbose output
k6 run --verbose backend/performance-tests/tests/[test-name].js
```

## Configuration

Edit `config/test-config.js` to customize:
- Base URL
- Test user credentials
- Performance thresholds
- Load scenarios

## Performance Targets

- **Response Time**: p(95) < 500ms
- **Page Load**: < 2 seconds
- **Error Rate**: < 1%
- **Throughput**: > 100 req/s

## Documentation

See [PERFORMANCE_TESTING_SETUP.md](../PERFORMANCE_TESTING_SETUP.md) for complete documentation.

## Support

- k6 Docs: https://k6.io/docs/
- k6 Community: https://community.k6.io/
- k6 Examples: https://k6.io/docs/examples/
