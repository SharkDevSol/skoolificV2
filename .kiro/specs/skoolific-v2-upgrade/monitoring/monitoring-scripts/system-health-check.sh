#!/bin/bash

################################################################################
# System Health Check Script for Skoolific V2
# Purpose: Automated health check for backend, database, and applications
# Usage: ./system-health-check.sh [branch_code]
################################################################################

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BRANCH_CODE=${1:-""}
BACKEND_URL="http://localhost:3000"
DB_HOST="localhost"
DB_USER="postgres"
DB_NAME="skoolific_${BRANCH_CODE}"
LOG_FILE="./logs/health-check-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory if it doesn't exist
mkdir -p ./logs

# Function to log messages
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" == "OK" ]; then
        echo -e "${GREEN}✓ $message${NC}"
    elif [ "$status" == "WARNING" ]; then
        echo -e "${YELLOW}⚠ $message${NC}"
    else
        echo -e "${RED}✗ $message${NC}"
    fi
}

# Function to check backend server
check_backend() {
    log_message "INFO" "Checking backend server..."
    
    # Check if backend is running
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v2/health" 2>/dev/null)
    
    if [ "$response" == "200" ]; then
        print_status "OK" "Backend server is running"
        log_message "INFO" "Backend server health check passed"
        
        # Check response time
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BACKEND_URL/api/v2/health" 2>/dev/null)
        response_time_ms=$(echo "$response_time * 1000" | bc)
        
        if (( $(echo "$response_time_ms < 500" | bc -l) )); then
            print_status "OK" "Backend response time: ${response_time_ms}ms"
        elif (( $(echo "$response_time_ms < 1000" | bc -l) )); then
            print_status "WARNING" "Backend response time: ${response_time_ms}ms (slower than expected)"
        else
            print_status "ERROR" "Backend response time: ${response_time_ms}ms (too slow)"
        fi
        
        return 0
    else
        print_status "ERROR" "Backend server is not responding (HTTP $response)"
        log_message "ERROR" "Backend server health check failed"
        return 1
    fi
}

# Function to check database
check_database() {
    log_message "INFO" "Checking database connection..."
    
    # Check if PostgreSQL is running
    if pg_isready -h "$DB_HOST" -U "$DB_USER" > /dev/null 2>&1; then
        print_status "OK" "PostgreSQL is running"
        log_message "INFO" "PostgreSQL is running"
        
        # Check database connection
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
            print_status "OK" "Database connection successful"
            log_message "INFO" "Database connection successful"
            
            # Check database size
            db_size=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)
            echo "  Database size: $db_size"
            log_message "INFO" "Database size: $db_size"
            
            # Check active connections
            active_conn=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';" 2>/dev/null | xargs)
            echo "  Active connections: $active_conn"
            log_message "INFO" "Active connections: $active_conn"
            
            return 0
        else
            print_status "ERROR" "Cannot connect to database $DB_NAME"
            log_message "ERROR" "Database connection failed"
            return 1
        fi
    else
        print_status "ERROR" "PostgreSQL is not running"
        log_message "ERROR" "PostgreSQL is not running"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    log_message "INFO" "Checking disk space..."
    
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 70 ]; then
        print_status "OK" "Disk usage: ${disk_usage}%"
    elif [ "$disk_usage" -lt 85 ]; then
        print_status "WARNING" "Disk usage: ${disk_usage}% (approaching limit)"
    else
        print_status "ERROR" "Disk usage: ${disk_usage}% (critical)"
    fi
    
    log_message "INFO" "Disk usage: ${disk_usage}%"
}

# Function to check memory usage
check_memory() {
    log_message "INFO" "Checking memory usage..."
    
    if command -v free &> /dev/null; then
        mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
        
        if [ "$mem_usage" -lt 70 ]; then
            print_status "OK" "Memory usage: ${mem_usage}%"
        elif [ "$mem_usage" -lt 85 ]; then
            print_status "WARNING" "Memory usage: ${mem_usage}% (high)"
        else
            print_status "ERROR" "Memory usage: ${mem_usage}% (critical)"
        fi
        
        log_message "INFO" "Memory usage: ${mem_usage}%"
    else
        print_status "WARNING" "Cannot check memory usage (free command not available)"
    fi
}

# Function to check CPU usage
check_cpu() {
    log_message "INFO" "Checking CPU usage..."
    
    if command -v top &> /dev/null; then
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
        cpu_usage_int=$(printf "%.0f" "$cpu_usage")
        
        if [ "$cpu_usage_int" -lt 70 ]; then
            print_status "OK" "CPU usage: ${cpu_usage_int}%"
        elif [ "$cpu_usage_int" -lt 85 ]; then
            print_status "WARNING" "CPU usage: ${cpu_usage_int}% (high)"
        else
            print_status "ERROR" "CPU usage: ${cpu_usage_int}% (critical)"
        fi
        
        log_message "INFO" "CPU usage: ${cpu_usage_int}%"
    else
        print_status "WARNING" "Cannot check CPU usage (top command not available)"
    fi
}

# Function to check API endpoints
check_api_endpoints() {
    log_message "INFO" "Checking API endpoints..."
    
    endpoints=(
        "/api/v2/auth/status"
        "/api/v2/students/count"
        "/api/v2/staff/count"
    )
    
    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$endpoint" 2>/dev/null)
        
        if [ "$response" == "200" ] || [ "$response" == "401" ]; then
            print_status "OK" "Endpoint $endpoint is accessible"
        else
            print_status "ERROR" "Endpoint $endpoint returned HTTP $response"
        fi
    done
}

# Function to check error logs
check_error_logs() {
    log_message "INFO" "Checking recent error logs..."
    
    backend_log="/var/log/skoolific/backend.log"
    
    if [ -f "$backend_log" ]; then
        error_count=$(grep -c "ERROR" "$backend_log" 2>/dev/null || echo "0")
        critical_count=$(grep -c "CRITICAL" "$backend_log" 2>/dev/null || echo "0")
        
        echo "  Recent errors in backend log: $error_count"
        echo "  Critical errors: $critical_count"
        
        if [ "$critical_count" -gt 0 ]; then
            print_status "ERROR" "Found $critical_count critical errors in logs"
            echo "  Last 5 critical errors:"
            grep "CRITICAL" "$backend_log" | tail -5
        elif [ "$error_count" -gt 10 ]; then
            print_status "WARNING" "Found $error_count errors in logs"
        else
            print_status "OK" "Error count is within acceptable range"
        fi
    else
        print_status "WARNING" "Backend log file not found at $backend_log"
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "Skoolific V2 System Health Check"
    echo "=========================================="
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Branch Code: ${BRANCH_CODE:-'Not specified'}"
    echo "=========================================="
    echo ""
    
    log_message "INFO" "Starting system health check"
    
    # Run all checks
    echo "1. Backend Server Check"
    check_backend
    echo ""
    
    echo "2. Database Check"
    check_database
    echo ""
    
    echo "3. System Resources"
    check_disk_space
    check_memory
    check_cpu
    echo ""
    
    echo "4. API Endpoints Check"
    check_api_endpoints
    echo ""
    
    echo "5. Error Logs Check"
    check_error_logs
    echo ""
    
    echo "=========================================="
    echo "Health check completed"
    echo "Log file: $LOG_FILE"
    echo "=========================================="
    
    log_message "INFO" "System health check completed"
}

# Run main function
main
