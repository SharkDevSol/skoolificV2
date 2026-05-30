# Performance Tests Runner - PowerShell Script
# Runs all k6 performance tests sequentially

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Skoolific V2 Performance Test Suite  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if k6 is installed
Write-Host "Checking k6 installation..." -ForegroundColor Yellow
try {
    $k6Version = k6 version 2>&1
    Write-Host "✓ k6 is installed: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "✗ k6 is not installed!" -ForegroundColor Red
    Write-Host "Please install k6 first:" -ForegroundColor Yellow
    Write-Host "  choco install k6" -ForegroundColor White
    Write-Host "  OR download from: https://k6.io/docs/getting-started/installation/" -ForegroundColor White
    exit 1
}

Write-Host ""

# Check if backend server is running
Write-Host "Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the backend server first:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Performance Tests..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test results tracking
$testResults = @()

# Function to run a test and track results
function Run-Test {
    param(
        [string]$TestName,
        [string]$TestFile,
        [int]$TestNumber,
        [int]$TotalTests
    )
    
    Write-Host "[$TestNumber/$TotalTests] Running $TestName..." -ForegroundColor Yellow
    Write-Host "Test file: $TestFile" -ForegroundColor Gray
    Write-Host ""
    
    $startTime = Get-Date
    
    try {
        k6 run "performance-tests/tests/$TestFile"
        $exitCode = $LASTEXITCODE
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($exitCode -eq 0) {
            Write-Host "✓ $TestName completed successfully" -ForegroundColor Green
            $testResults += [PSCustomObject]@{
                Test = $TestName
                Status = "PASSED"
                Duration = "$([math]::Round($duration, 2))s"
            }
        } else {
            Write-Host "✗ $TestName failed" -ForegroundColor Red
            $testResults += [PSCustomObject]@{
                Test = $TestName
                Status = "FAILED"
                Duration = "$([math]::Round($duration, 2))s"
            }
        }
    } catch {
        Write-Host "✗ $TestName encountered an error: $_" -ForegroundColor Red
        $testResults += [PSCustomObject]@{
            Test = $TestName
            Status = "ERROR"
            Duration = "N/A"
        }
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

# Run all tests
Run-Test -TestName "Sample Test (Health Check)" -TestFile "sample-test.js" -TestNumber 1 -TotalTests 5
Run-Test -TestName "Dashboard Load Test" -TestFile "dashboard-load-test.js" -TestNumber 2 -TotalTests 5
Run-Test -TestName "Mark Entry Load Test" -TestFile "mark-entry-load-test.js" -TestNumber 3 -TotalTests 5
Run-Test -TestName "Exam Taking Load Test" -TestFile "exam-taking-load-test.js" -TestNumber 4 -TotalTests 5
Run-Test -TestName "Student Registration Load Test" -TestFile "student-registration-load-test.js" -TestNumber 5 -TotalTests 5

# Display summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Summary  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults | Format-Table -AutoSize

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$errorTests = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalTests = $testResults.Count

Write-Host ""
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Errors: $errorTests" -ForegroundColor Yellow
Write-Host ""

if ($failedTests -eq 0 -and $errorTests -eq 0) {
    Write-Host "All tests completed successfully! 🎉" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Please review the results above." -ForegroundColor Yellow
    exit 1
}
