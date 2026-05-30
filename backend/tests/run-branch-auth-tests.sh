#!/bin/bash

# Branch Authentication System - Test Execution Script
# This script runs all tests for Phase 1.7

echo "=========================================="
echo "Branch Authentication System - Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not running${NC}"
    echo "Please start PostgreSQL and try again"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Install test dependencies if not already installed
echo "Checking test dependencies..."
if ! npm list jest &> /dev/null; then
    echo "Installing test dependencies..."
    npm install --save-dev jest supertest
fi

if ! npm list @types/jest &> /dev/null; then
    npm install --save-dev @types/jest
fi

echo -e "${GREEN}✓ Test dependencies installed${NC}"
echo ""

# Set test environment variables
export NODE_ENV=test
export JWT_SECRET=test-secret-key
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=12345678
export DB_NAME=skoolific

echo "Environment variables set:"
echo "  NODE_ENV: $NODE_ENV"
echo "  DB_HOST: $DB_HOST"
echo "  DB_NAME: $DB_NAME"
echo ""

# Run tests
echo "=========================================="
echo "Running Branch Authentication Tests..."
echo "=========================================="
echo ""

# Run Jest tests
npm test -- backend/tests/branch-auth.test.js --verbose

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Execution Complete"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review test coverage report"
    echo "2. Run manual testing (see MANUAL_TESTING_GUIDE.md)"
    echo "3. Test on different browsers"
    echo "4. Test on mobile devices"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Please review the test output above and fix any issues"
    exit 1
fi
