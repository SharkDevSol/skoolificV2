#!/bin/bash
# Performance Tests Runner - Bash Script
# Runs all k6 performance tests sequentially

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "  Skoolific V2 Performance Test Suite  "
echo -e "========================================${NC}"
echo ""

# Check if k6 is installed
echo -e "${YELLOW}Checking k6 installation...${NC}"
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version)
    echo -e "${GREEN}✓ k6 is installed: $K6_VERSION${NC}"
else
    echo -e "${RED}✗ k6 is not installed!${NC}"
    echo -e "${YELLOW}Please install k6 first:${NC}"
    echo -e "${NC}  macOS: brew install k6"
    echo -e "  Linux: See https://k6.io/docs/getting-started/installation/${NC}"
    exit 1
fi

echo ""

# Check if backend server is running
echo -e "${YELLOW}Checking backend server...${NC}"
if curl -s -f -o /dev/null http://localhost:5000/api/health; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${RED}✗ Backend server is not running!${NC}"
    echo -e "${YELLOW}Please start the backend server first:${NC}"
    echo -e "${NC}  npm run dev${NC}"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}========================================"
echo -e "Starting Performance Tests..."
echo -e "========================================${NC}"
echo ""

# Test results tracking
declare -a TEST_NAMES
declare -a TEST_STATUS
declare -a TEST_DURATION

# Function to run a test and track results
run_test() {
    local test_name=$1
    local test_file=$2
    local test_number=$3
    local total_tests=$4
    
    echo -e "${YELLOW}[$test_number/$total_tests] Running $test_name...${NC}"
    echo -e "${GRAY}Test file: $test_file${NC}"
    echo ""
    
    local start_time=$(date +%s)
    
    if k6 run "performance-tests/tests/$test_file"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✓ $test_name completed successfully${NC}"
        TEST_NAMES+=("$test_name")
        TEST_STATUS+=("PASSED")
        TEST_DURATION+=("${duration}s")
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}✗ $test_name failed${NC}"
        TEST_NAMES+=("$test_name")
        TEST_STATUS+=("FAILED")
        TEST_DURATION+=("${duration}s")
    fi
    
    echo ""
    echo -e "${GRAY}----------------------------------------${NC}"
    echo ""
}

# Run all tests
run_test "Sample Test (Health Check)" "sample-test.js" 1 5
run_test "Dashboard Load Test" "dashboard-load-test.js" 2 5
run_test "Mark Entry Load Test" "mark-entry-load-test.js" 3 5
run_test "Exam Taking Load Test" "exam-taking-load-test.js" 4 5
run_test "Student Registration Load Test" "student-registration-load-test.js" 5 5

# Display summary
echo -e "${CYAN}========================================"
echo -e "  Test Summary  "
echo -e "========================================${NC}"
echo ""

printf "%-40s %-10s %-10s\n" "Test" "Status" "Duration"
printf "%-40s %-10s %-10s\n" "----" "------" "--------"

for i in "${!TEST_NAMES[@]}"; do
    if [ "${TEST_STATUS[$i]}" == "PASSED" ]; then
        printf "%-40s ${GREEN}%-10s${NC} %-10s\n" "${TEST_NAMES[$i]}" "${TEST_STATUS[$i]}" "${TEST_DURATION[$i]}"
    else
        printf "%-40s ${RED}%-10s${NC} %-10s\n" "${TEST_NAMES[$i]}" "${TEST_STATUS[$i]}" "${TEST_DURATION[$i]}"
    fi
done

echo ""

# Count results
passed_count=0
failed_count=0
for status in "${TEST_STATUS[@]}"; do
    if [ "$status" == "PASSED" ]; then
        ((passed_count++))
    else
        ((failed_count++))
    fi
done

total_count=${#TEST_NAMES[@]}

echo -e "${NC}Total Tests: $total_count"
echo -e "${GREEN}Passed: $passed_count${NC}"
echo -e "${RED}Failed: $failed_count${NC}"
echo ""

if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}All tests completed successfully! 🎉${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Please review the results above.${NC}"
    exit 1
fi
