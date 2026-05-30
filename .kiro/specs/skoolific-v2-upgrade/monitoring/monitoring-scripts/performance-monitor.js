#!/usr/bin/env node

/**
 * Performance Monitoring Script for Skoolific V2
 * Purpose: Monitor API response times, database queries, and system performance
 * Usage: node performance-monitor.js [branch_code]
 */

const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const BRANCH_CODE = process.argv[2] || '';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: `skoolific_${BRANCH_CODE}`
};

// Create logs directory
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `performance-${new Date().toISOString().split('T')[0]}.json`);

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  excellent: 200,
  good: 500,
  acceptable: 1000,
  slow: 2000
};

// API endpoints to monitor
const ENDPOINTS = [
  { name: 'Health Check', path: '/api/v2/health', method: 'GET' },
  { name: 'Auth Status', path: '/api/v2/auth/status', method: 'GET' },
  { name: 'Student Count', path: '/api/v2/students/count', method: 'GET' },
  { name: 'Staff Count', path: '/api/v2/staff/count', method: 'GET' },
  { name: 'Attendance List', path: '/api/v2/attendance/list', method: 'GET' },
  { name: 'Mark Lists', path: '/api/v2/academic/marklists', method: 'GET' }
];

// Database queries to monitor
const DB_QUERIES = [
  { name: 'Student Count', query: 'SELECT COUNT(*) FROM students' },
  { name: 'Active Staff', query: 'SELECT COUNT(*) FROM staff WHERE is_active = true' },
  { name: 'Today Attendance', query: 'SELECT COUNT(*) FROM attendance WHERE date = CURRENT_DATE' },
  { name: 'Recent Marks', query: 'SELECT COUNT(*) FROM marks WHERE created_at > NOW() - INTERVAL \'7 days\'' }
];

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  branchCode: BRANCH_CODE,
  api: [],
  database: [],
  summary: {}
};

/**
 * Measure API endpoint performance
 */
async function measureAPIPerformance(endpoint) {
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${BACKEND_URL}${endpoint.path}`,
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const result = {
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      responseTime,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      rating: getRating(responseTime)
    };
    
    results.api.push(result);
    
    console.log(`✓ ${endpoint.name}: ${responseTime}ms (${result.rating}) - HTTP ${response.status}`);
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const result = {
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      responseTime,
      status: 0,
      success: false,
      error: error.message,
      rating: 'error'
    };
    
    results.api.push(result);
    
    console.log(`✗ ${endpoint.name}: Error - ${error.message}`);
    
    return result;
  }
}

/**
 * Measure database query performance
 */
async function measureDatabasePerformance(pool, query) {
  const startTime = Date.now();
  
  try {
    const result = await pool.query(query.query);
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    const queryResult = {
      name: query.name,
      query: query.query,
      queryTime,
      rowCount: result.rowCount,
      success: true,
      rating: getRating(queryTime)
    };
    
    results.database.push(queryResult);
    
    console.log(`✓ ${query.name}: ${queryTime}ms (${queryResult.rating}) - ${result.rowCount} rows`);
    
    return queryResult;
  } catch (error) {
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    const queryResult = {
      name: query.name,
      query: query.query,
      queryTime,
      success: false,
      error: error.message,
      rating: 'error'
    };
    
    results.database.push(queryResult);
    
    console.log(`✗ ${query.name}: Error - ${error.message}`);
    
    return queryResult;
  }
}

/**
 * Get performance rating based on response time
 */
function getRating(time) {
  if (time <= THRESHOLDS.excellent) return 'excellent';
  if (time <= THRESHOLDS.good) return 'good';
  if (time <= THRESHOLDS.acceptable) return 'acceptable';
  if (time <= THRESHOLDS.slow) return 'slow';
  return 'critical';
}

/**
 * Calculate summary statistics
 */
function calculateSummary() {
  // API summary
  const apiTimes = results.api.filter(r => r.success).map(r => r.responseTime);
  const apiSuccess = results.api.filter(r => r.success).length;
  const apiTotal = results.api.length;
  
  results.summary.api = {
    total: apiTotal,
    successful: apiSuccess,
    failed: apiTotal - apiSuccess,
    successRate: ((apiSuccess / apiTotal) * 100).toFixed(2) + '%',
    avgResponseTime: apiTimes.length > 0 ? (apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length).toFixed(2) : 0,
    minResponseTime: apiTimes.length > 0 ? Math.min(...apiTimes) : 0,
    maxResponseTime: apiTimes.length > 0 ? Math.max(...apiTimes) : 0,
    ratings: {
      excellent: results.api.filter(r => r.rating === 'excellent').length,
      good: results.api.filter(r => r.rating === 'good').length,
      acceptable: results.api.filter(r => r.rating === 'acceptable').length,
      slow: results.api.filter(r => r.rating === 'slow').length,
      critical: results.api.filter(r => r.rating === 'critical').length,
      error: results.api.filter(r => r.rating === 'error').length
    }
  };
  
  // Database summary
  const dbTimes = results.database.filter(r => r.success).map(r => r.queryTime);
  const dbSuccess = results.database.filter(r => r.success).length;
  const dbTotal = results.database.length;
  
  results.summary.database = {
    total: dbTotal,
    successful: dbSuccess,
    failed: dbTotal - dbSuccess,
    successRate: ((dbSuccess / dbTotal) * 100).toFixed(2) + '%',
    avgQueryTime: dbTimes.length > 0 ? (dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length).toFixed(2) : 0,
    minQueryTime: dbTimes.length > 0 ? Math.min(...dbTimes) : 0,
    maxQueryTime: dbTimes.length > 0 ? Math.max(...dbTimes) : 0,
    ratings: {
      excellent: results.database.filter(r => r.rating === 'excellent').length,
      good: results.database.filter(r => r.rating === 'good').length,
      acceptable: results.database.filter(r => r.rating === 'acceptable').length,
      slow: results.database.filter(r => r.rating === 'slow').length,
      critical: results.database.filter(r => r.rating === 'critical').length,
      error: results.database.filter(r => r.rating === 'error').length
    }
  };
  
  // Overall health
  const overallSuccess = (apiSuccess + dbSuccess) / (apiTotal + dbTotal);
  const avgTime = (results.summary.api.avgResponseTime + results.summary.database.avgQueryTime) / 2;
  
  results.summary.overall = {
    health: overallSuccess >= 0.95 ? 'excellent' : overallSuccess >= 0.85 ? 'good' : overallSuccess >= 0.70 ? 'fair' : 'poor',
    successRate: (overallSuccess * 100).toFixed(2) + '%',
    avgResponseTime: avgTime.toFixed(2) + 'ms'
  };
}

/**
 * Save results to file
 */
function saveResults() {
  // Append to daily log file
  let existingData = [];
  if (fs.existsSync(logFile)) {
    const fileContent = fs.readFileSync(logFile, 'utf8');
    existingData = JSON.parse(fileContent);
  }
  
  existingData.push(results);
  
  fs.writeFileSync(logFile, JSON.stringify(existingData, null, 2));
  
  console.log(`\nResults saved to: ${logFile}`);
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n========================================');
  console.log('Performance Monitoring Summary');
  console.log('========================================');
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Branch Code: ${BRANCH_CODE || 'Not specified'}`);
  console.log('');
  
  console.log('API Performance:');
  console.log(`  Success Rate: ${results.summary.api.successRate}`);
  console.log(`  Avg Response Time: ${results.summary.api.avgResponseTime}ms`);
  console.log(`  Min/Max: ${results.summary.api.minResponseTime}ms / ${results.summary.api.maxResponseTime}ms`);
  console.log(`  Ratings: ${results.summary.api.ratings.excellent} excellent, ${results.summary.api.ratings.good} good, ${results.summary.api.ratings.acceptable} acceptable, ${results.summary.api.ratings.slow} slow, ${results.summary.api.ratings.critical} critical, ${results.summary.api.ratings.error} errors`);
  console.log('');
  
  console.log('Database Performance:');
  console.log(`  Success Rate: ${results.summary.database.successRate}`);
  console.log(`  Avg Query Time: ${results.summary.database.avgQueryTime}ms`);
  console.log(`  Min/Max: ${results.summary.database.minQueryTime}ms / ${results.summary.database.maxQueryTime}ms`);
  console.log(`  Ratings: ${results.summary.database.ratings.excellent} excellent, ${results.summary.database.ratings.good} good, ${results.summary.database.ratings.acceptable} acceptable, ${results.summary.database.ratings.slow} slow, ${results.summary.database.ratings.critical} critical, ${results.summary.database.ratings.error} errors`);
  console.log('');
  
  console.log('Overall Health:');
  console.log(`  Status: ${results.summary.overall.health.toUpperCase()}`);
  console.log(`  Success Rate: ${results.summary.overall.successRate}`);
  console.log(`  Avg Response Time: ${results.summary.overall.avgResponseTime}`);
  console.log('========================================');
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('Skoolific V2 Performance Monitor');
  console.log('========================================');
  console.log(`Starting performance monitoring...`);
  console.log(`Branch Code: ${BRANCH_CODE || 'Not specified'}`);
  console.log('');
  
  // Monitor API endpoints
  console.log('Monitoring API Endpoints:');
  console.log('----------------------------------------');
  for (const endpoint of ENDPOINTS) {
    await measureAPIPerformance(endpoint);
  }
  console.log('');
  
  // Monitor database queries
  console.log('Monitoring Database Queries:');
  console.log('----------------------------------------');
  
  let pool;
  try {
    pool = new Pool(DB_CONFIG);
    
    for (const query of DB_QUERIES) {
      await measureDatabasePerformance(pool, query);
    }
  } catch (error) {
    console.log(`✗ Database connection error: ${error.message}`);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
  
  console.log('');
  
  // Calculate summary
  calculateSummary();
  
  // Print summary
  printSummary();
  
  // Save results
  saveResults();
}

// Run main function
main().catch(error => {
  console.error('Error running performance monitor:', error);
  process.exit(1);
});
